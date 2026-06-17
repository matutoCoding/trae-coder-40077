import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../database.js'
import { generateBatchNo } from '../utils.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const db = getDb()
  const { status, keyword } = req.query
  let sql = 'SELECT * FROM vulcanization_batches WHERE 1=1'
  const params: unknown[] = []
  if (status) {
    sql += ' AND status = ?'
    params.push(status)
  }
  if (keyword) {
    sql += ' AND (batch_no LIKE ? OR operator LIKE ? OR mold_no LIKE ?)'
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`)
  }
  sql += ' ORDER BY created_at DESC'
  const batches = db.prepare(sql).all(...params)
  for (const b of batches) {
    const milling = db.prepare('SELECT id, batch_no FROM milling_batches WHERE id = ?').get((b as Record<string, unknown>).milling_batch_id)
    ;(b as Record<string, unknown>).milling_batch = milling
  }
  res.json({ success: true, data: batches })
})

router.post('/', (req: Request, res: Response): void => {
  const db = getDb()
  const { batch_no, milling_batch_id, mold_no, machine_no, operator, mold_temp_target, vulcanization_time_target } = req.body
  if (!milling_batch_id || !mold_no || !machine_no || !operator) {
    res.status(400).json({ success: false, error: '开炼批次、模具号、机台号和操作员为必填项' })
    return
  }
  const milling = db.prepare('SELECT id FROM milling_batches WHERE id = ?').get(milling_batch_id)
  if (!milling) {
    res.status(400).json({ success: false, error: '开炼批次不存在' })
    return
  }
  const finalBatchNo = batch_no || generateBatchNo('VL-', 'vulcanization_batches')
  const id = uuidv4()
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
  db.prepare('INSERT INTO vulcanization_batches (id, batch_no, milling_batch_id, mold_no, machine_no, operator, mold_temp_target, vulcanization_time_target, start_time, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, finalBatchNo, milling_batch_id, mold_no, machine_no, operator, mold_temp_target || null, vulcanization_time_target || null, now, 'in_progress', now)
  const batch = db.prepare('SELECT * FROM vulcanization_batches WHERE id = ?').get(id)
  res.status(201).json({ success: true, data: batch })
})

router.put('/:id', (req: Request, res: Response): void => {
  const db = getDb()
  const batch = db.prepare('SELECT * FROM vulcanization_batches WHERE id = ?').get(req.params.id)
  if (!batch) {
    res.status(404).json({ success: false, error: '硫化批次不存在' })
    return
  }
  const { mold_temp, mold_temp_target, vulcanization_time, vulcanization_time_target, pressure, end_time, status } = req.body
  const current = batch as Record<string, unknown>
  db.prepare('UPDATE vulcanization_batches SET mold_temp = ?, mold_temp_target = ?, vulcanization_time = ?, vulcanization_time_target = ?, pressure = ?, end_time = ?, status = ? WHERE id = ?').run(
    mold_temp !== undefined ? mold_temp : current.mold_temp,
    mold_temp_target !== undefined ? mold_temp_target : current.mold_temp_target,
    vulcanization_time !== undefined ? vulcanization_time : current.vulcanization_time,
    vulcanization_time_target !== undefined ? vulcanization_time_target : current.vulcanization_time_target,
    pressure !== undefined ? pressure : current.pressure,
    end_time !== undefined ? end_time : current.end_time,
    status || current.status,
    req.params.id
  )
  const updated = db.prepare('SELECT * FROM vulcanization_batches WHERE id = ?').get(req.params.id)
  res.json({ success: true, data: updated })
})

router.get('/:id', (req: Request, res: Response): void => {
  const db = getDb()
  const batch = db.prepare('SELECT * FROM vulcanization_batches WHERE id = ?').get(req.params.id)
  if (!batch) {
    res.status(404).json({ success: false, error: '硫化批次不存在' })
    return
  }
  const milling = db.prepare('SELECT id, batch_no FROM milling_batches WHERE id = ?').get((batch as Record<string, unknown>).milling_batch_id)
  ;(batch as Record<string, unknown>).milling_batch = milling
  res.json({ success: true, data: batch })
})

export default router
