import { Router, type Request, type Response } from 'express'
import { getDb } from '../database.js'

const router = Router()

router.get('/dashboard', (req: Request, res: Response): void => {
  const db = getDb()

  const totalMixing = (db.prepare('SELECT COUNT(*) as cnt FROM mixing_batches').get() as { cnt: number }).cnt
  const totalMilling = (db.prepare('SELECT COUNT(*) as cnt FROM milling_batches').get() as { cnt: number }).cnt
  const totalVulc = (db.prepare('SELECT COUNT(*) as cnt FROM vulcanization_batches').get() as { cnt: number }).cnt
  const totalDeburr = (db.prepare('SELECT COUNT(*) as cnt FROM deburring_batches').get() as { cnt: number }).cnt
  const totalBatches = totalMixing + totalMilling + totalVulc + totalDeburr

  const completedMixing = (db.prepare("SELECT COUNT(*) as cnt FROM mixing_batches WHERE status = 'completed'").get() as { cnt: number }).cnt
  const completedMilling = (db.prepare("SELECT COUNT(*) as cnt FROM milling_batches WHERE status = 'completed'").get() as { cnt: number }).cnt
  const completedVulc = (db.prepare("SELECT COUNT(*) as cnt FROM vulcanization_batches WHERE status = 'completed'").get() as { cnt: number }).cnt
  const completedDeburr = (db.prepare("SELECT COUNT(*) as cnt FROM deburring_batches WHERE status = 'completed'").get() as { cnt: number }).cnt
  const completedBatches = completedMixing + completedMilling + completedVulc + completedDeburr

  const abnormalMixing = (db.prepare("SELECT COUNT(*) as cnt FROM mixing_batches WHERE status = 'abnormal'").get() as { cnt: number }).cnt
  const abnormalMilling = (db.prepare("SELECT COUNT(*) as cnt FROM milling_batches WHERE status = 'abnormal'").get() as { cnt: number }).cnt
  const abnormalVulc = (db.prepare("SELECT COUNT(*) as cnt FROM vulcanization_batches WHERE status = 'abnormal'").get() as { cnt: number }).cnt
  const abnormalDeburr = (db.prepare("SELECT COUNT(*) as cnt FROM deburring_batches WHERE status = 'abnormal'").get() as { cnt: number }).cnt
  const abnormalBatches = abnormalMixing + abnormalMilling + abnormalVulc + abnormalDeburr

  const today = new Date().toISOString().split('T')[0]
  const todayMixing = (db.prepare("SELECT COUNT(*) as cnt FROM mixing_batches WHERE DATE(created_at) = ?").get(today) as { cnt: number }).cnt
  const todayMilling = (db.prepare("SELECT COUNT(*) as cnt FROM milling_batches WHERE DATE(created_at) = ?").get(today) as { cnt: number }).cnt
  const todayVulc = (db.prepare("SELECT COUNT(*) as cnt FROM vulcanization_batches WHERE DATE(created_at) = ?").get(today) as { cnt: number }).cnt
  const todayDeburr = (db.prepare("SELECT COUNT(*) as cnt FROM deburring_batches WHERE DATE(created_at) = ?").get(today) as { cnt: number }).cnt
  const todayBatches = todayMixing + todayMilling + todayVulc + todayDeburr

  const passInsp = (db.prepare("SELECT COUNT(*) as cnt FROM inspection_records WHERE overall_result = 'pass'").get() as { cnt: number }).cnt
  const totalInsp = (db.prepare('SELECT COUNT(*) as cnt FROM inspection_records').get() as { cnt: number }).cnt
  const passTest = (db.prepare("SELECT COUNT(*) as cnt FROM physical_tests WHERE overall_result = 'pass'").get() as { cnt: number }).cnt
  const totalTest = (db.prepare('SELECT COUNT(*) as cnt FROM physical_tests').get() as { cnt: number }).cnt
  const totalQC = totalInsp + totalTest
  const passQC = passInsp + passTest
  const passRate = totalQC > 0 ? +(passQC / totalQC * 100).toFixed(1) : 0

  const recentAlerts = []
  const abnormalBatchesList = db.prepare("SELECT id, batch_no, status, created_at FROM mixing_batches WHERE status = 'abnormal' ORDER BY created_at DESC LIMIT 3").all()
  for (const b of abnormalBatchesList) {
    recentAlerts.push({ type: 'abnormal', batch_no: (b as Record<string, unknown>).batch_no, stage: '密炼', message: `密炼批次 ${(b as Record<string, unknown>).batch_no} 异常`, created_at: (b as Record<string, unknown>).created_at })
  }
  const failedInsp = db.prepare("SELECT id, batch_no, overall_result, inspected_at FROM inspection_records WHERE overall_result = 'fail' ORDER BY inspected_at DESC LIMIT 3").all()
  for (const r of failedInsp) {
    recentAlerts.push({ type: 'quality', batch_no: (r as Record<string, unknown>).batch_no, stage: '尺寸检验', message: `检验批次 ${(r as Record<string, unknown>).batch_no} 不合格`, created_at: (r as Record<string, unknown>).inspected_at })
  }
  const failedTest = db.prepare("SELECT id, batch_no, overall_result, tested_at FROM physical_tests WHERE overall_result = 'fail' ORDER BY tested_at DESC LIMIT 3").all()
  for (const t of failedTest) {
    recentAlerts.push({ type: 'quality', batch_no: (t as Record<string, unknown>).batch_no, stage: '物性测试', message: `测试批次 ${(t as Record<string, unknown>).batch_no} 不合格`, created_at: (t as Record<string, unknown>).tested_at })
  }
  recentAlerts.sort((a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime())
  const alerts = recentAlerts.slice(0, 10)

  res.json({
    success: true,
    data: {
      totalBatches,
      completedBatches,
      abnormalBatches,
      todayBatches,
      passRate,
      recentAlerts: alerts,
    }
  })
})

router.get('/quality', (req: Request, res: Response): void => {
  const db = getDb()
  const { days } = req.query
  const daysBack = days ? Number(days) : 30

  const inspectionTrend = db.prepare(`
    SELECT DATE(inspected_at) as date,
           COUNT(*) as total,
           SUM(CASE WHEN overall_result = 'pass' THEN 1 ELSE 0 END) as passed,
           SUM(CASE WHEN overall_result = 'fail' THEN 1 ELSE 0 END) as failed
    FROM inspection_records
    WHERE inspected_at >= datetime('now', '-' || ? || ' days')
    GROUP BY DATE(inspected_at)
    ORDER BY date
  `).all(daysBack)

  const testTrend = db.prepare(`
    SELECT DATE(tested_at) as date,
           COUNT(*) as total,
           SUM(CASE WHEN overall_result = 'pass' THEN 1 ELSE 0 END) as passed,
           SUM(CASE WHEN overall_result = 'fail' THEN 1 ELSE 0 END) as failed
    FROM physical_tests
    WHERE tested_at >= datetime('now', '-' || ? || ' days')
    GROUP BY DATE(tested_at)
    ORDER BY date
  `).all(daysBack)

  const dimensionStats = db.prepare(`
    SELECT
      SUM(CASE WHEN inner_diameter_result = 'pass' THEN 1 ELSE 0 END) as id_pass,
      SUM(CASE WHEN inner_diameter_result = 'fail' THEN 1 ELSE 0 END) as id_fail,
      SUM(CASE WHEN outer_diameter_result = 'pass' THEN 1 ELSE 0 END) as od_pass,
      SUM(CASE WHEN outer_diameter_result = 'fail' THEN 1 ELSE 0 END) as od_fail,
      SUM(CASE WHEN cross_section_result = 'pass' THEN 1 ELSE 0 END) as cs_pass,
      SUM(CASE WHEN cross_section_result = 'fail' THEN 1 ELSE 0 END) as cs_fail
    FROM inspection_records
  `).get()

  const testStats = db.prepare(`
    SELECT
      AVG(hardness_shore_a) as avg_hardness,
      AVG(tensile_strength) as avg_tensile,
      AVG(elongation_at_break) as avg_elongation,
      AVG(compression_set) as avg_compression,
      SUM(CASE WHEN hardness_result = 'pass' THEN 1 ELSE 0 END) as hardness_pass,
      SUM(CASE WHEN hardness_result = 'fail' THEN 1 ELSE 0 END) as hardness_fail,
      SUM(CASE WHEN tensile_strength_result = 'pass' THEN 1 ELSE 0 END) as tensile_pass,
      SUM(CASE WHEN tensile_strength_result = 'fail' THEN 1 ELSE 0 END) as tensile_fail,
      SUM(CASE WHEN compression_set_result = 'pass' THEN 1 ELSE 0 END) as compression_pass,
      SUM(CASE WHEN compression_set_result = 'fail' THEN 1 ELSE 0 END) as compression_fail
    FROM physical_tests
  `).get()

  res.json({
    success: true,
    data: {
      inspectionTrend,
      testTrend,
      dimensionStats,
      testStats,
    }
  })
})

export default router
