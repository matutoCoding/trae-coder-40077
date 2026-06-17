import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../database.js'
import { generateBatchNo } from '../utils.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const db = getDb()
  const { overall_result, keyword, operator, tester, date_from, date_to } = req.query
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
  const operatorOrTester = (tester || operator) as string | undefined
  if (operatorOrTester) {
    sql += ' AND tester LIKE ?'
    params.push(`%${operatorOrTester}%`)
  }
  if (date_from) {
    sql += ' AND tested_at >= ?'
    params.push(date_from)
  }
  if (date_to) {
    sql += ' AND tested_at <= ?'
    params.push(date_to)
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
  if (!inspection_id || String(inspection_id).trim() === '') {
    res.status(400).json({ success: false, error: '关联批次未选对,请选择一个有效的尺寸检测记录' })
    return
  }
  if (!tester || String(tester).trim() === '') {
    res.status(400).json({ success: false, error: '请填写试验员姓名' })
    return
  }
  const nums: { name: string; value: number | undefined; min: number; max: number }[] = []
  if (hardness_shore_a != null && hardness_shore_a !== '') nums.push({ name: '硬度', value: Number(hardness_shore_a), min: 0, max: 120 })
  if (tensile_strength != null && tensile_strength !== '') nums.push({ name: '拉伸强度', value: Number(tensile_strength), min: 0, max: 200 })
  if (elongation_at_break != null && elongation_at_break !== '') nums.push({ name: '延伸率', value: Number(elongation_at_break), min: 0, max: 2000 })
  if (compression_set != null && compression_set !== '') nums.push({ name: '压缩变形', value: Number(compression_set), min: 0, max: 100 })
  for (const n of nums) {
    if (Number.isNaN(n.value) || n.value! < n.min || n.value > n.max) {
      res.status(400).json({ success: false, error: `异常数值: ${n.name}应在${n.min}~${n.max}之间` })
      return
    }
  }
  const insp = db.prepare('SELECT id FROM inspection_records WHERE id = ?').get(inspection_id)
  if (!insp) {
    res.status(400).json({ success: false, error: '关联批次未选对,该尺寸检测记录在系统中不存在' })
    return
  }
  if (batch_no && batch_no.trim() !== '') {
    const dup = db.prepare('SELECT id FROM physical_tests WHERE batch_no = ?').get(batch_no.trim())
    if (dup) {
      res.status(400).json({ success: false, error: `批次号重复: ${batch_no} 已经存在,请更换或留空自动生成` })
      return
    }
  }
  const finalBatchNo = batch_no ? batch_no.trim() : generateBatchNo('PT-', 'physical_tests')
  const hardnessResult = hardness_shore_a !== undefined && hardness_target !== undefined
    ? (Math.abs(hardness_shore_a - hardness_target) <= 3 ? 'pass' : 'fail') : null
  let tensileResult: string | null = null
  let elongationResult: string | null = null
  if (tensile_strength !== undefined && tensile_strength_target !== undefined && elongation_at_break !== undefined && elongation_target !== undefined) {
    const tPass = tensile_strength >= tensile_strength_target * 0.85
    const ePass = elongation_at_break >= elongation_target * 0.85
    tensileResult = tPass && ePass ? 'pass' : 'fail'
    elongationResult = ePass ? 'pass' : 'fail'
  }
  const compressionResult = compression_set !== undefined && compression_set_target !== undefined
    ? (compression_set <= compression_set_target * 1.15 ? 'pass' : 'fail') : null

  const results = [hardnessResult, tensileResult, compressionResult].filter(r => r !== null)
  let overallResult: string | null = null
  if (results.length > 0) {
    overallResult = results.every(r => r === 'pass') ? 'pass' : 'fail'
  }

  const id = uuidv4()
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
  db.prepare(`INSERT INTO physical_tests (id, batch_no, inspection_id, tester, hardness_shore_a, hardness_target, hardness_result, tensile_strength, tensile_strength_target, tensile_strength_result, elongation_at_break, elongation_target, elongation_result, compression_set, compression_set_target, compression_set_result, overall_result, tested_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, finalBatchNo, inspection_id, tester,
    hardness_shore_a || null, hardness_target || null, hardnessResult,
    tensile_strength || null, tensile_strength_target || null, tensileResult,
    elongation_at_break || null, elongation_target || null, elongationResult,
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
  let tensileResult: string | null = null
  let elongationResult: string | null = null
  if (tVal != null && tTarget != null && eVal != null && eTarget != null) {
    const tPass = (tVal as number) >= (tTarget as number) * 0.85
    const ePass = (eVal as number) >= (eTarget as number) * 0.85
    tensileResult = tPass && ePass ? 'pass' : 'fail'
    elongationResult = ePass ? 'pass' : 'fail'
  } else {
    tensileResult = current.tensile_strength_result as string | null
    elongationResult = current.elongation_result as string | null
  }
  const compressionResult = cVal != null && cTarget != null ? ((cVal as number) <= (cTarget as number) * 1.15 ? 'pass' : 'fail') : current.compression_set_result

  const results = [hardnessResult, tensileResult, compressionResult].filter(r => r !== null && r !== undefined) as string[]
  let overallResult: string
  if (results.length > 0) {
    overallResult = results.every(r => r === 'pass') ? 'pass' : 'fail'
  } else {
    overallResult = (current.overall_result as string) || 'fail'
  }

  db.prepare(`UPDATE physical_tests SET hardness_shore_a = ?, hardness_target = ?, hardness_result = ?, tensile_strength = ?, tensile_strength_target = ?, tensile_strength_result = ?, elongation_at_break = ?, elongation_target = ?, elongation_result = ?, compression_set = ?, compression_set_target = ?, compression_set_result = ?, overall_result = ?, tester = ? WHERE id = ?`).run(
    hVal, hTarget, hardnessResult, tVal, tTarget, tensileResult,
    eVal, eTarget, elongationResult, cVal, cTarget, compressionResult, overallResult,
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
