import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../database.js'
import { generateBatchNo } from '../utils.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const db = getDb()
  const { status, keyword } = req.query
  let sql = 'SELECT * FROM milling_batches WHERE 1=1'
  const params: unknown[] = []
  if (status) {
    sql += ' AND status = ?'
    params.push(status)
  }
  if (keyword) {
    sql += ' AND (batch_no LIKE ? OR operator LIKE ?)'
    params.push(`%${keyword}%`, `%${keyword}%`)
  }
  sql += ' ORDER BY created_at DESC'
  const batches = db.prepare(sql).all(...params)
  for (const b of batches) {
    const mixing = db.prepare('SELECT id, batch_no, formula_id FROM mixing_batches WHERE id = ?').get((b as Record<string, unknown>).mixing_batch_id)
    ;(b as Record<string, unknown>).mixing_batch = mixing
  }
  res.json({ success: true, data: batches })
})

router.post('/', (req: Request, res: Response): void => {
  const db = getDb()
  const { batch_no, mixing_batch_id, machine_no, operator, thickness_target } = req.body
  if (!mixing_batch_id || !machine_no || !operator) {
    res.status(400).json({ success: false, error: '密炼批次、机台号和操作员为必填项' })
    return
  }
  const mixing = db.prepare('SELECT id FROM mixing_batches WHERE id = ?').get(mixing_batch_id)
  if (!mixing) {
    res.status(400).json({ success: false, error: '密炼批次不存在' })
    return
  }
  const finalBatchNo = batch_no || generateBatchNo('KL-', 'milling_batches')
  const id = uuidv4()
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
  db.prepare('INSERT INTO milling_batches (id, batch_no, mixing_batch_id, machine_no, operator, thickness_target, start_time, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, finalBatchNo, mixing_batch_id, machine_no, operator, thickness_target || null, now, 'in_progress', now)
  const batch = db.prepare('SELECT * FROM milling_batches WHERE id = ?').get(id)
  res.status(201).json({ success: true, data: batch })
})

router.put('/:id', (req: Request, res: Response): void => {
  const db = getDb()
  const batch = db.prepare('SELECT * FROM milling_batches WHERE id = ?').get(req.params.id)
  if (!batch) {
    res.status(404).json({ success: false, error: '开炼批次不存在' })
    return
  }
  const { thickness, thickness_target, pass_count, sheet_count, end_time, status } = req.body
  const current = batch as Record<string, unknown>
  db.prepare('UPDATE milling_batches SET thickness = ?, thickness_target = ?, pass_count = ?, sheet_count = ?, end_time = ?, status = ? WHERE id = ?').run(
    thickness !== undefined ? thickness : current.thickness,
    thickness_target !== undefined ? thickness_target : current.thickness_target,
    pass_count !== undefined ? pass_count : current.pass_count,
    sheet_count !== undefined ? sheet_count : current.sheet_count,
    end_time !== undefined ? end_time : current.end_time,
    status || current.status,
    req.params.id
  )
  const updated = db.prepare('SELECT * FROM milling_batches WHERE id = ?').get(req.params.id)
  res.json({ success: true, data: updated })
})

router.get('/:id', (req: Request, res: Response): void => {
  const db = getDb()
  const batch = db.prepare('SELECT * FROM milling_batches WHERE id = ?').get(req.params.id)
  if (!batch) {
    res.status(404).json({ success: false, error: '开炼批次不存在' })
    return
  }
  const mixing = db.prepare('SELECT id, batch_no, formula_id FROM mixing_batches WHERE id = ?').get((batch as Record<string, unknown>).mixing_batch_id)
  ;(batch as Record<string, unknown>).mixing_batch = mixing
  res.json({ success: true, data: batch })
})

export default router
