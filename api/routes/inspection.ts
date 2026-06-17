import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../database.js'
import { generateBatchNo } from '../utils.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const db = getDb()
  const { overall_result, keyword } = req.query
  let sql = 'SELECT * FROM inspection_records WHERE 1=1'
  const params: unknown[] = []
  if (overall_result) {
    sql += ' AND overall_result = ?'
    params.push(overall_result)
  }
  if (keyword) {
    sql += ' AND (batch_no LIKE ? OR inspector LIKE ?)'
    params.push(`%${keyword}%`, `%${keyword}%`)
  }
  sql += ' ORDER BY inspected_at DESC'
  const records = db.prepare(sql).all(...params)
  for (const r of records) {
    const deburr = db.prepare('SELECT id, batch_no FROM deburring_batches WHERE id = ?').get((r as Record<string, unknown>).deburring_batch_id)
    ;(r as Record<string, unknown>).deburring_batch = deburr
  }
  res.json({ success: true, data: records })
})

router.post('/', (req: Request, res: Response): void => {
  const db = getDb()
  const { batch_no, deburring_batch_id, inspector, inner_diameter, inner_diameter_target, inner_diameter_tolerance, outer_diameter, outer_diameter_target, outer_diameter_tolerance, cross_section, cross_section_target, cross_section_tolerance } = req.body
  if (!deburring_batch_id || !inspector) {
    res.status(400).json({ success: false, error: '修边批次和检验员为必填项' })
    return
  }
  const deburr = db.prepare('SELECT id FROM deburring_batches WHERE id = ?').get(deburring_batch_id)
  if (!deburr) {
    res.status(400).json({ success: false, error: '修边批次不存在' })
    return
  }
  const finalBatchNo = batch_no || generateBatchNo('IC-', 'inspection_records')
  const idResult = inner_diameter !== undefined && inner_diameter_target !== undefined && inner_diameter_tolerance !== undefined
    ? (Math.abs(inner_diameter - inner_diameter_target) <= inner_diameter_tolerance ? 'pass' : 'fail') : null
  const odResult = outer_diameter !== undefined && outer_diameter_target !== undefined && outer_diameter_tolerance !== undefined
    ? (Math.abs(outer_diameter - outer_diameter_target) <= outer_diameter_tolerance ? 'pass' : 'fail') : null
  const csResult = cross_section !== undefined && cross_section_target !== undefined && cross_section_tolerance !== undefined
    ? (Math.abs(cross_section - cross_section_target) <= cross_section_tolerance ? 'pass' : 'fail') : null

  const results = [idResult, odResult, csResult].filter(r => r !== null)
  let overallResult: string | null = null
  if (results.length > 0) {
    overallResult = results.some(r => r === 'fail') ? 'fail' : 'pass'
  }

  const id = uuidv4()
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
  db.prepare(`INSERT INTO inspection_records (id, batch_no, deburring_batch_id, inspector, inner_diameter, inner_diameter_target, inner_diameter_tolerance, outer_diameter, outer_diameter_target, outer_diameter_tolerance, cross_section, cross_section_target, cross_section_tolerance, inner_diameter_result, outer_diameter_result, cross_section_result, overall_result, inspected_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, finalBatchNo, deburring_batch_id, inspector,
    inner_diameter || null, inner_diameter_target || null, inner_diameter_tolerance || null,
    outer_diameter || null, outer_diameter_target || null, outer_diameter_tolerance || null,
    cross_section || null, cross_section_target || null, cross_section_tolerance || null,
    idResult, odResult, csResult, overallResult, now
  )
  const record = db.prepare('SELECT * FROM inspection_records WHERE id = ?').get(id)
  res.status(201).json({ success: true, data: record })
})

router.put('/:id', (req: Request, res: Response): void => {
  const db = getDb()
  const record = db.prepare('SELECT * FROM inspection_records WHERE id = ?').get(req.params.id)
  if (!record) {
    res.status(404).json({ success: false, error: '检验记录不存在' })
    return
  }
  const { inner_diameter, inner_diameter_target, inner_diameter_tolerance, outer_diameter, outer_diameter_target, outer_diameter_tolerance, cross_section, cross_section_target, cross_section_tolerance, inspector } = req.body
  const current = record as Record<string, unknown>
  const idVal = inner_diameter !== undefined ? inner_diameter : current.inner_diameter
  const idTarget = inner_diameter_target !== undefined ? inner_diameter_target : current.inner_diameter_target
  const idTol = inner_diameter_tolerance !== undefined ? inner_diameter_tolerance : current.inner_diameter_tolerance
  const odVal = outer_diameter !== undefined ? outer_diameter : current.outer_diameter
  const odTarget = outer_diameter_target !== undefined ? outer_diameter_target : current.outer_diameter_target
  const odTol = outer_diameter_tolerance !== undefined ? outer_diameter_tolerance : current.outer_diameter_tolerance
  const csVal = cross_section !== undefined ? cross_section : current.cross_section
  const csTarget = cross_section_target !== undefined ? cross_section_target : current.cross_section_target
  const csTol = cross_section_tolerance !== undefined ? cross_section_tolerance : current.cross_section_tolerance

  const idResult = idVal != null && idTarget != null && idTol != null ? (Math.abs(idVal as number - idTarget as number) <= (idTol as number) ? 'pass' : 'fail') : current.inner_diameter_result as string | null
  const odResult = odVal != null && odTarget != null && odTol != null ? (Math.abs(odVal as number - odTarget as number) <= (odTol as number) ? 'pass' : 'fail') : current.outer_diameter_result as string | null
  const csResult = csVal != null && csTarget != null && csTol != null ? (Math.abs(csVal as number - csTarget as number) <= (csTol as number) ? 'pass' : 'fail') : current.cross_section_result as string | null
  const overallResult = idResult === 'pass' && odResult === 'pass' && csResult === 'pass' ? 'pass' : 'fail'

  db.prepare(`UPDATE inspection_records SET inner_diameter = ?, inner_diameter_target = ?, inner_diameter_tolerance = ?, outer_diameter = ?, outer_diameter_target = ?, outer_diameter_tolerance = ?, cross_section = ?, cross_section_target = ?, cross_section_tolerance = ?, inner_diameter_result = ?, outer_diameter_result = ?, cross_section_result = ?, overall_result = ?, inspector = ? WHERE id = ?`).run(
    idVal, idTarget, idTol, odVal, odTarget, odTol, csVal, csTarget, csTol,
    idResult, odResult, csResult, overallResult, inspector || current.inspector, req.params.id
  )
  const updated = db.prepare('SELECT * FROM inspection_records WHERE id = ?').get(req.params.id)
  res.json({ success: true, data: updated })
})

router.get('/:id', (req: Request, res: Response): void => {
  const db = getDb()
  const record = db.prepare('SELECT * FROM inspection_records WHERE id = ?').get(req.params.id)
  if (!record) {
    res.status(404).json({ success: false, error: '检验记录不存在' })
    return
  }
  const deburr = db.prepare('SELECT id, batch_no FROM deburring_batches WHERE id = ?').get((record as Record<string, unknown>).deburring_batch_id)
  ;(record as Record<string, unknown>).deburring_batch = deburr
  res.json({ success: true, data: record })
})

export default router
