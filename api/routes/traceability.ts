import { Router, type Request, type Response } from 'express'
import { getDb } from '../database.js'

const router = Router()

const STAGE_CONFIG = [
  { key: 'formula', table: 'formulas', operatorField: 'created_by', dateField: 'created_at', parentField: null, statusField: 'status' },
  { key: 'mixing', table: 'mixing_batches', operatorField: 'operator', dateField: 'created_at', parentField: 'formula_id', statusField: 'status' },
  { key: 'milling', table: 'milling_batches', operatorField: 'operator', dateField: 'created_at', parentField: 'mixing_batch_id', statusField: 'status' },
  { key: 'vulcanization', table: 'vulcanization_batches', operatorField: 'operator', dateField: 'created_at', parentField: 'milling_batch_id', statusField: 'status' },
  { key: 'deburring', table: 'deburring_batches', operatorField: 'operator', dateField: 'created_at', parentField: 'vulcanization_batch_id', statusField: 'status' },
  { key: 'inspection', table: 'inspection_records', operatorField: 'inspector', dateField: 'inspected_at', parentField: 'deburring_batch_id', statusField: 'overall_result' },
  { key: 'testing', table: 'physical_tests', operatorField: 'tester', dateField: 'tested_at', parentField: 'inspection_id', statusField: 'overall_result' },
]

const STAGE_NAMES: Record<string, string> = {
  formula: '配方',
  mixing: '密炼',
  milling: '开炼',
  vulcanization: '模压硫化',
  deburring: '修边',
  inspection: '尺寸检验',
  testing: '物性测试',
}

router.get('/', (req: Request, res: Response): void => {
  const db = getDb()
  const allRecords: Array<Record<string, unknown>> = []

  for (const stage of STAGE_CONFIG) {
    const rows = db.prepare(`SELECT * FROM ${stage.table}`).all() as Array<Record<string, unknown>>
    for (const row of rows) {
      const parentBatchId = stage.parentField ? (row[stage.parentField] as string) : null
      const batchNo = stage.key === 'formula' ? (row.code as string) : (row.batch_no as string)
      allRecords.push({
        id: row.id as string,
        batch_no: batchNo,
        stage: stage.key,
        status: row[stage.statusField] as string,
        created_at: row[stage.dateField] as string,
        operator: row[stage.operatorField] as string,
        parent_batch_id: parentBatchId,
      })
    }
  }

  allRecords.sort((a, b) => {
    const aTime = new Date(a.created_at as string).getTime()
    const bTime = new Date(b.created_at as string).getTime()
    return aTime - bTime
  })

  res.json({ success: true, data: allRecords })
})

router.get('/:stage/:id', (req: Request, res: Response): void => {
  const db = getDb()
  const { stage, id } = req.params

  const stageIdx = STAGE_CONFIG.findIndex(s => s.key === stage)
  if (stageIdx === -1) {
    res.status(400).json({ success: false, error: '无效的阶段' })
    return
  }

  const currentStage = STAGE_CONFIG[stageIdx]
  const currentRecord = db.prepare(`SELECT * FROM ${currentStage.table} WHERE id = ?`).get(id) as Record<string, unknown> | undefined
  if (!currentRecord) {
    res.status(404).json({ success: false, error: `${STAGE_NAMES[stage]}记录不存在` })
    return
  }

  const chain: Array<{ stage: string; data: Record<string, unknown> | null }> = [
    { stage: 'formula', data: null },
    { stage: 'mixing', data: null },
    { stage: 'milling', data: null },
    { stage: 'vulcanization', data: null },
    { stage: 'deburring', data: null },
    { stage: 'inspection', data: null },
    { stage: 'testing', data: null },
  ]

  chain[stageIdx].data = currentRecord

  let currentId: string | null = id
  for (let i = stageIdx; i >= 0; i--) {
    if (i === stageIdx) continue
    const s = STAGE_CONFIG[i]
    const nextStage = STAGE_CONFIG[i + 1]
    if (nextStage.parentField && chain[i + 1].data) {
      const parentId = (chain[i + 1].data as Record<string, unknown>)[nextStage.parentField] as string | null
      if (parentId) {
        const record = db.prepare(`SELECT * FROM ${s.table} WHERE id = ?`).get(parentId) as Record<string, unknown> | undefined
        chain[i].data = record || null
        currentId = record?.id as string || null
      }
    }
  }

  currentId = id
  for (let i = stageIdx; i < STAGE_CONFIG.length; i++) {
    if (i === stageIdx) continue
    const s = STAGE_CONFIG[i]
    const prevStage = STAGE_CONFIG[i - 1]
    if (s.parentField && chain[i - 1].data) {
      const prevId = (chain[i - 1].data as Record<string, unknown>).id as string
      const record = db.prepare(`SELECT * FROM ${s.table} WHERE ${s.parentField} = ?`).get(prevId) as Record<string, unknown> | undefined
      chain[i].data = record || null
      currentId = record?.id as string || null
    }
  }

  res.json({
    success: true,
    data: {
      chain,
      current_stage_index: stageIdx,
      current_stage_name: STAGE_NAMES[stage],
    },
  })
})

export default router
