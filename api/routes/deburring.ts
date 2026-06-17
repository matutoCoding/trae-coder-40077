import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../database.js'
import { generateBatchNo } from '../utils.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const db = getDb()
  const { status, keyword, operator, date_from, date_to } = req.query
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
    const vulc = db.prepare('SELECT id, batch_no FROM vulcanization_batches WHERE id = ?').get((b as Record<string, unknown>).vulcanization_batch_id)
    ;(b as Record<string, unknown>).vulcanization_batch = vulc
  }
  res.json({ success: true, data: batches })
})

router.post('/', (req: Request, res: Response): void => {
  const db = getDb()
  const { batch_no, vulcanization_batch_id, method, operator, total_count } = req.body
  if (!vulcanization_batch_id || !method || !operator) {
    res.status(400).json({ success: false, error: '请选择关联硫化批次、去边方式并填写操作员' })
    return
  }
  if (!vulcanization_batch_id || String(vulcanization_batch_id).trim() === '') {
    res.status(400).json({ success: false, error: '关联批次未选对,请重新选择一个有效的硫化批次' })
    return
  }
  if (total_count === undefined || total_count === null || total_count === '' || Number.isNaN(Number(total_count))) {
    res.status(400).json({ success: false, error: '数量不对,请填写一个大于0的正整数' })
    return
  }
  const tc = Number(total_count)
  if (!Number.isInteger(tc) || tc <= 0) {
    res.status(400).json({ success: false, error: '数量不对,总数必须是大于0的正整数' })
    return
  }
  if (tc > 100000) {
    res.status(400).json({ success: false, error: '数量不对,总数超过上限(100000),请核对后重新输入' })
    return
  }
  const vulc = db.prepare('SELECT id FROM vulcanization_batches WHERE id = ?').get(vulcanization_batch_id)
  if (!vulc) {
    res.status(400).json({ success: false, error: '关联批次未选对,该硫化批次在系统中不存在' })
    return
  }
  if (batch_no && batch_no.trim() !== '') {
    const dup = db.prepare('SELECT id FROM deburring_batches WHERE batch_no = ?').get(batch_no.trim())
    if (dup) {
      res.status(400).json({ success: false, error: `批次号重复: ${batch_no} 已经存在,请更换或留空自动生成` })
      return
    }
  }
  const finalBatchNo = batch_no ? batch_no.trim() : generateBatchNo('DB-', 'deburring_batches')
  const id = uuidv4()
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
  db.prepare('INSERT INTO deburring_batches (id, batch_no, vulcanization_batch_id, method, operator, total_count, start_time, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, finalBatchNo, vulcanization_batch_id, method, operator, tc, now, 'in_progress', now)
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
