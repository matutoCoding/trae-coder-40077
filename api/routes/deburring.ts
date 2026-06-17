import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../database.js'
import { generateBatchNo } from '../utils.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const db = getDb()
  const { status, keyword } = req.query
  let sql = 'SELECT * FROM deburring_batches WHERE 1=1'
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
    const vulc = db.prepare('SELECT id, batch_no FROM vulcanization_batches WHERE id = ?').get((b as Record<string, unknown>).vulcanization_batch_id)
    ;(b as Record<string, unknown>).vulcanization_batch = vulc
  }
  res.json({ success: true, data: batches })
})

router.post('/', (req: Request, res: Response): void => {
  const db = getDb()
  const { batch_no, vulcanization_batch_id, method, operator } = req.body
  if (!vulcanization_batch_id || !method || !operator) {
    res.status(400).json({ success: false, error: '硫化批次、修边方式和操作员为必填项' })
    return
  }
  const vulc = db.prepare('SELECT id FROM vulcanization_batches WHERE id = ?').get(vulcanization_batch_id)
  if (!vulc) {
    res.status(400).json({ success: false, error: '硫化批次不存在' })
    return
  }
  const finalBatchNo = batch_no || generateBatchNo('DB-', 'deburring_batches')
  const id = uuidv4()
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
  db.prepare('INSERT INTO deburring_batches (id, batch_no, vulcanization_batch_id, method, operator, start_time, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, finalBatchNo, vulcanization_batch_id, method, operator, now, 'in_progress', now)
  const batch = db.prepare('SELECT * FROM deburring_batches WHERE id = ?').get(id)
  res.status(201).json({ success: true, data: batch })
})

router.put('/:id', (req: Request, res: Response): void => {
  const db = getDb()
  const batch = db.prepare('SELECT * FROM deburring_batches WHERE id = ?').get(req.params.id)
  if (!batch) {
    res.status(404).json({ success: false, error: '修边批次不存在' })
    return
  }
  const { total_count, qualified_count, qualified_rate, end_time, status } = req.body
  const current = batch as Record<string, unknown>
  db.prepare('UPDATE deburring_batches SET total_count = ?, qualified_count = ?, qualified_rate = ?, end_time = ?, status = ? WHERE id = ?').run(
    total_count !== undefined ? total_count : current.total_count,
    qualified_count !== undefined ? qualified_count : current.qualified_count,
    qualified_rate !== undefined ? qualified_rate : current.qualified_rate,
    end_time !== undefined ? end_time : current.end_time,
    status || current.status,
    req.params.id
  )
  const updated = db.prepare('SELECT * FROM deburring_batches WHERE id = ?').get(req.params.id)
  res.json({ success: true, data: updated })
})

router.get('/:id', (req: Request, res: Response): void => {
  const db = getDb()
  const batch = db.prepare('SELECT * FROM deburring_batches WHERE id = ?').get(req.params.id)
  if (!batch) {
    res.status(404).json({ success: false, error: '修边批次不存在' })
    return
  }
  const vulc = db.prepare('SELECT id, batch_no FROM vulcanization_batches WHERE id = ?').get((batch as Record<string, unknown>).vulcanization_batch_id)
  ;(batch as Record<string, unknown>).vulcanization_batch = vulc
  res.json({ success: true, data: batch })
})

export default router
