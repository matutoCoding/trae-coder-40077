import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../database.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const db = getDb()
  const { status, keyword } = req.query
  let sql = 'SELECT * FROM formulas WHERE 1=1'
  const params: unknown[] = []
  if (status) {
    sql += ' AND status = ?'
    params.push(status)
  }
  if (keyword) {
    sql += ' AND (name LIKE ? OR code LIKE ?)'
    params.push(`%${keyword}%`, `%${keyword}%`)
  }
  sql += ' ORDER BY created_at DESC'
  const formulas = db.prepare(sql).all(...params)
  for (const f of formulas) {
    const materials = db.prepare('SELECT * FROM formula_materials WHERE formula_id = ? ORDER BY sort_order').all((f as Record<string, unknown>).id)
    ;(f as Record<string, unknown>).materials = materials
  }
  res.json({ success: true, data: formulas })
})

router.get('/:id', (req: Request, res: Response): void => {
  const db = getDb()
  const formula = db.prepare('SELECT * FROM formulas WHERE id = ?').get(req.params.id)
  if (!formula) {
    res.status(404).json({ success: false, error: '配方不存在' })
    return
  }
  const materials = db.prepare('SELECT * FROM formula_materials WHERE formula_id = ? ORDER BY sort_order').all(req.params.id)
  ;(formula as Record<string, unknown>).materials = materials
  res.json({ success: true, data: formula })
})

router.post('/', (req: Request, res: Response): void => {
  const db = getDb()
  const { name, code, description, created_by, materials } = req.body
  if (!name || !code || !created_by) {
    res.status(400).json({ success: false, error: '名称、编码和创建人为必填项' })
    return
  }
  const existing = db.prepare('SELECT id FROM formulas WHERE code = ?').get(code)
  if (existing) {
    res.status(400).json({ success: false, error: '配方编码已存在' })
    return
  }
  const id = uuidv4()
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
  db.prepare('INSERT INTO formulas (id, name, code, status, version, description, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, name, code, 'draft', 1, description || null, created_by, now, now)
  if (materials && Array.isArray(materials)) {
    const insertMat = db.prepare('INSERT INTO formula_materials (id, formula_id, name, code, ratio, unit, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)')
    for (let i = 0; i < materials.length; i++) {
      const m = materials[i]
      insertMat.run(uuidv4(), id, m.name, m.code, m.ratio, m.unit, i + 1)
    }
  }
  const formula = db.prepare('SELECT * FROM formulas WHERE id = ?').get(id)
  const mats = db.prepare('SELECT * FROM formula_materials WHERE formula_id = ? ORDER BY sort_order').all(id)
  ;(formula as Record<string, unknown>).materials = mats
  res.status(201).json({ success: true, data: formula })
})

router.put('/:id', (req: Request, res: Response): void => {
  const db = getDb()
  const formula = db.prepare('SELECT * FROM formulas WHERE id = ?').get(req.params.id)
  if (!formula) {
    res.status(404).json({ success: false, error: '配方不存在' })
    return
  }
  if ((formula as Record<string, unknown>).status === 'approved') {
    res.status(400).json({ success: false, error: '已审批的配方不可修改' })
    return
  }
  const { name, code, description, materials } = req.body
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
  const current = formula as Record<string, unknown>
  db.prepare('UPDATE formulas SET name = ?, code = ?, description = ?, updated_at = ? WHERE id = ?').run(name || current.name, code || current.code, description !== undefined ? description : current.description, now, req.params.id)
  if (materials && Array.isArray(materials)) {
    db.prepare('DELETE FROM formula_materials WHERE formula_id = ?').run(req.params.id)
    const insertMat = db.prepare('INSERT INTO formula_materials (id, formula_id, name, code, ratio, unit, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)')
    for (let i = 0; i < materials.length; i++) {
      const m = materials[i]
      insertMat.run(uuidv4(), req.params.id, m.name, m.code, m.ratio, m.unit, i + 1)
    }
  }
  const updated = db.prepare('SELECT * FROM formulas WHERE id = ?').get(req.params.id)
  const mats = db.prepare('SELECT * FROM formula_materials WHERE formula_id = ? ORDER BY sort_order').all(req.params.id)
  ;(updated as Record<string, unknown>).materials = mats
  res.json({ success: true, data: updated })
})

router.post('/:id/approve', (req: Request, res: Response): void => {
  const db = getDb()
  const formula = db.prepare('SELECT * FROM formulas WHERE id = ?').get(req.params.id)
  if (!formula) {
    res.status(404).json({ success: false, error: '配方不存在' })
    return
  }
  if ((formula as Record<string, unknown>).status === 'approved') {
    res.status(400).json({ success: false, error: '配方已审批' })
    return
  }
  const { approved_by } = req.body
  if (!approved_by) {
    res.status(400).json({ success: false, error: '审批人为必填项' })
    return
  }
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
  db.prepare('UPDATE formulas SET status = ?, approved_by = ?, approved_at = ?, updated_at = ? WHERE id = ?').run('approved', approved_by, now, now, req.params.id)
  const updated = db.prepare('SELECT * FROM formulas WHERE id = ?').get(req.params.id)
  const mats = db.prepare('SELECT * FROM formula_materials WHERE formula_id = ? ORDER BY sort_order').all(req.params.id)
  ;(updated as Record<string, unknown>).materials = mats
  res.json({ success: true, data: updated })
})

export default router
