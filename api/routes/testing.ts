import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../database.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const db = getDb()
  const { overall_result, keyword } = req.query
  let sql = 'SELECT * FROM physical_tests WHERE 1=1'
  const params: unknown[] = []
  if (overall_result) {
    sql += ' AND overall_result = ?'
    params.push(overall_result)
  }
  if (keyword) {
    sql += ' AND (batch_no LIKE ? OR tester LIKE ?)'
    params.push(`%${keyword}%`, `%${keyword}%`)
  }
  sql += ' ORDER BY tested_at DESC'
  const tests = db.prepare(sql).all(...params)
  for (const t of tests) {
    const insp = db.prepare('SELECT id, batch_no FROM inspection_records WHERE id = ?').get((t as Record<string, unknown>).inspection_id)
    ;(t as Record<string, unknown>).inspection = insp
  }
  res.json({ success: true, data: tests })
})

router.post('/', (req: Request, res: Response): void => {
  const db = getDb()
  const { batch_no, inspection_id, tester, hardness_shore_a, hardness_target, tensile_strength, tensile_strength_target, elongation_at_break, elongation_target, compression_set, compression_set_target } = req.body
  if (!batch_no || !inspection_id || !tester) {
    res.status(400).json({ success: false, error: '批次号、检验记录和测试员为必填项' })
    return
  }
  const insp = db.prepare('SELECT id FROM inspection_records WHERE id = ?').get(inspection_id)
  if (!insp) {
    res.status(400).json({ success: false, error: '检验记录不存在' })
    return
  }
  const hardnessResult = hardness_shore_a !== undefined && hardness_target !== undefined
    ? (Math.abs(hardness_shore_a - hardness_target) <= 3 ? 'pass' : 'fail') : null
  const tensileResult = tensile_strength !== undefined && tensile_strength_target !== undefined
    ? (tensile_strength >= tensile_strength_target * 0.85 ? 'pass' : 'fail') : null
  const compressionResult = compression_set !== undefined && compression_set_target !== undefined
    ? (compression_set <= compression_set_target * 1.15 ? 'pass' : 'fail') : null
  const overallResult = hardnessResult && tensileResult && compressionResult
    ? (hardnessResult === 'pass' && tensileResult === 'pass' && compressionResult === 'pass' ? 'pass' : 'fail') : null

  const id = uuidv4()
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
  db.prepare(`INSERT INTO physical_tests (id, batch_no, inspection_id, tester, hardness_shore_a, hardness_target, hardness_result, tensile_strength, tensile_strength_target, tensile_strength_result, elongation_at_break, elongation_target, compression_set, compression_set_target, compression_set_result, overall_result, tested_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, batch_no, inspection_id, tester,
    hardness_shore_a || null, hardness_target || null, hardnessResult,
    tensile_strength || null, tensile_strength_target || null, tensileResult,
    elongation_at_break || null, elongation_target || null,
    compression_set || null, compression_set_target || null, compressionResult,
    overallResult, now
  )
  const test = db.prepare('SELECT * FROM physical_tests WHERE id = ?').get(id)
  res.status(201).json({ success: true, data: test })
})

router.put('/:id', (req: Request, res: Response): void => {
  const db = getDb()
  const test = db.prepare('SELECT * FROM physical_tests WHERE id = ?').get(req.params.id)
  if (!test) {
    res.status(404).json({ success: false, error: '物性测试记录不存在' })
    return
  }
  const { hardness_shore_a, hardness_target, tensile_strength, tensile_strength_target, elongation_at_break, elongation_target, compression_set, compression_set_target, tester } = req.body
  const current = test as Record<string, unknown>
  const hVal = hardness_shore_a !== undefined ? hardness_shore_a : current.hardness_shore_a
  const hTarget = hardness_target !== undefined ? hardness_target : current.hardness_target
  const tVal = tensile_strength !== undefined ? tensile_strength : current.tensile_strength
  const tTarget = tensile_strength_target !== undefined ? tensile_strength_target : current.tensile_strength_target
  const eVal = elongation_at_break !== undefined ? elongation_at_break : current.elongation_at_break
  const eTarget = elongation_target !== undefined ? elongation_target : current.elongation_target
  const cVal = compression_set !== undefined ? compression_set : current.compression_set
  const cTarget = compression_set_target !== undefined ? compression_set_target : current.compression_set_target

  const hardnessResult = hVal != null && hTarget != null ? (Math.abs(hVal as number - hTarget as number) <= 3 ? 'pass' : 'fail') : current.hardness_result
  const tensileResult = tVal != null && tTarget != null ? ((tVal as number) >= (tTarget as number) * 0.85 ? 'pass' : 'fail') : current.tensile_strength_result
  const compressionResult = cVal != null && cTarget != null ? ((cVal as number) <= (cTarget as number) * 1.15 ? 'pass' : 'fail') : current.compression_set_result
  const overallResult = hardnessResult === 'pass' && tensileResult === 'pass' && compressionResult === 'pass' ? 'pass' : 'fail'

  db.prepare(`UPDATE physical_tests SET hardness_shore_a = ?, hardness_target = ?, hardness_result = ?, tensile_strength = ?, tensile_strength_target = ?, tensile_strength_result = ?, elongation_at_break = ?, elongation_target = ?, compression_set = ?, compression_set_target = ?, compression_set_result = ?, overall_result = ?, tester = ? WHERE id = ?`).run(
    hVal, hTarget, hardnessResult, tVal, tTarget, tensileResult,
    eVal, eTarget, cVal, cTarget, compressionResult, overallResult,
    tester || current.tester, req.params.id
  )
  const updated = db.prepare('SELECT * FROM physical_tests WHERE id = ?').get(req.params.id)
  res.json({ success: true, data: updated })
})

router.get('/:id', (req: Request, res: Response): void => {
  const db = getDb()
  const test = db.prepare('SELECT * FROM physical_tests WHERE id = ?').get(req.params.id)
  if (!test) {
    res.status(404).json({ success: false, error: '物性测试记录不存在' })
    return
  }
  const insp = db.prepare('SELECT id, batch_no FROM inspection_records WHERE id = ?').get((test as Record<string, unknown>).inspection_id)
  ;(test as Record<string, unknown>).inspection = insp
  res.json({ success: true, data: test })
})

export default router
