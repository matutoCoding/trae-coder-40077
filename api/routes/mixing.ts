import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../database.js'
import { generateBatchNo } from '../utils.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const db = getDb()
  const { status, keyword, operator, date_from, date_to } = req.query
  let sql = 'SELECT * FROM mixing_batches WHERE 1=1'
  const params: unknown[] = []
  if (status) {
    sql += ' AND status = ?'
    params.push(status)
  }
  if (keyword) {
    sql += ' AND (batch_no LIKE ? OR operator LIKE ?)'
    params.push(`%${keyword}%`, `%${keyword}%`)
  }
  if (operator) {
    sql += ' AND operator LIKE ?'
    params.push(`%${operator}%`)
  }
  if (date_from) {
    sql += ' AND created_at >= ?'
    params.push(date_from)
  }
  if (date_to) {
    sql += ' AND created_at <= ?'
    params.push(date_to)
  }
  sql += ' ORDER BY created_at DESC'
  const batches = db.prepare(sql).all(...params)
  for (const b of batches) {
    const feedings = db.prepare('SELECT * FROM feeding_records WHERE mixing_batch_id = ? ORDER BY sort_order').all((b as Record<string, unknown>).id)
    ;(b as Record<string, unknown>).feeding_records = feedings
    const formula = db.prepare('SELECT id, name, code FROM formulas WHERE id = ?').get((b as Record<string, unknown>).formula_id)
    ;(b as Record<string, unknown>).formula = formula
  }
  res.json({ success: true, data: batches })
})

router.post('/', (req: Request, res: Response): void => {
  const db = getDb()
  const { batch_no, formula_id, machine_no, operator, feeding_records } = req.body
  if (!formula_id || !machine_no || !operator) {
    res.status(400).json({ success: false, error: '配方、机台号和操作员为必填项' })
    return
  }
  const formula = db.prepare('SELECT id FROM formulas WHERE id = ?').get(formula_id)
  if (!formula) {
    res.status(400).json({ success: false, error: '配方不存在' })
    return
  }
  const finalBatchNo = batch_no || generateBatchNo('ML-', 'mixing_batches')
  const id = uuidv4()
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
  db.prepare('INSERT INTO mixing_batches (id, batch_no, formula_id, machine_no, operator, start_time, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, finalBatchNo, formula_id, machine_no, operator, now, 'in_progress', now)
  if (feeding_records && Array.isArray(feeding_records)) {
    const insertFeed = db.prepare('INSERT INTO feeding_records (id, mixing_batch_id, material_name, material_code, weight, unit, sort_order, feed_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    for (let i = 0; i < feeding_records.length; i++) {
      const f = feeding_records[i]
      insertFeed.run(uuidv4(), id, f.material_name, f.material_code, f.weight, f.unit, i + 1, now)
    }
  }
  const batch = db.prepare('SELECT * FROM mixing_batches WHERE id = ?').get(id)
  const feedings = db.prepare('SELECT * FROM feeding_records WHERE mixing_batch_id = ? ORDER BY sort_order').all(id)
  ;(batch as Record<string, unknown>).feeding_records = feedings
  res.status(201).json({ success: true, data: batch })
})

router.put('/:id', (req: Request, res: Response): void => {
  const db = getDb()
  const batch = db.prepare('SELECT * FROM mixing_batches WHERE id = ?').get(req.params.id)
  if (!batch) {
    res.status(404).json({ success: false, error: '密炼批次不存在' })
    return
  }
  const { discharge_temp, max_temp, end_time, status, feeding_records } = req.body
  const current = batch as Record<string, unknown>
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
  db.prepare('UPDATE mixing_batches SET discharge_temp = ?, max_temp = ?, end_time = ?, status = ? WHERE id = ?').run(
    discharge_temp !== undefined ? discharge_temp : current.discharge_temp,
    max_temp !== undefined ? max_temp : current.max_temp,
    end_time !== undefined ? end_time : current.end_time,
    status || current.status,
    req.params.id
  )
  if (feeding_records && Array.isArray(feeding_records)) {
    db.prepare('DELETE FROM feeding_records WHERE mixing_batch_id = ?').run(req.params.id)
    const insertFeed = db.prepare('INSERT INTO feeding_records (id, mixing_batch_id, material_name, material_code, weight, unit, sort_order, feed_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    for (let i = 0; i < feeding_records.length; i++) {
      const f = feeding_records[i]
      insertFeed.run(uuidv4(), req.params.id, f.material_name, f.material_code, f.weight, f.unit, i + 1, now)
    }
  }
  const updated = db.prepare('SELECT * FROM mixing_batches WHERE id = ?').get(req.params.id)
  const feedings = db.prepare('SELECT * FROM feeding_records WHERE mixing_batch_id = ? ORDER BY sort_order').all(req.params.id)
  ;(updated as Record<string, unknown>).feeding_records = feedings
  res.json({ success: true, data: updated })
})

router.get('/:id/temperature', (req: Request, res: Response): void => {
  const db = getDb()
  const batch = db.prepare('SELECT id, batch_no, discharge_temp, max_temp, start_time, end_time, status FROM mixing_batches WHERE id = ?').get(req.params.id)
  if (!batch) {
    res.status(404).json({ success: false, error: '密炼批次不存在' })
    return
  }
  const startTime = (batch as Record<string, unknown>).start_time as string | null
  const durationMinutes = startTime ? 30 : 0
  const temperatures = []
  const baseTemp = 80
  const maxTemp = (batch as Record<string, unknown>).max_temp as number | null
  for (let i = 0; i <= durationMinutes; i++) {
    const progress = i / durationMinutes
    const temp = baseTemp + (maxTemp ? (maxTemp - baseTemp) * Math.pow(progress, 0.7) : 40 * Math.pow(progress, 0.7)) + (Math.random() - 0.5) * 2
    temperatures.push({ minute: i, temperature: +temp.toFixed(1) })
  }
  res.json({ success: true, data: { batch, temperatures } })
})

export default router
