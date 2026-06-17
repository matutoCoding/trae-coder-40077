import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_PATH = path.join(__dirname, 'data', 'production.db')

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!_db) {
    const dir = path.dirname(DB_PATH)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    _db = new Database(DB_PATH)
    _db.pragma('journal_mode = WAL')
    _db.pragma('foreign_keys = ON')
    initTables(_db)
    if (isEmpty(_db)) {
      seedData(_db)
    }
  }
  return _db
}

function initTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS formulas (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'draft',
      version INTEGER NOT NULL DEFAULT 1,
      description TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      approved_by TEXT,
      approved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS formula_materials (
      id TEXT PRIMARY KEY,
      formula_id TEXT NOT NULL REFERENCES formulas(id),
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      ratio REAL NOT NULL,
      unit TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS mixing_batches (
      id TEXT PRIMARY KEY,
      batch_no TEXT NOT NULL UNIQUE,
      formula_id TEXT NOT NULL REFERENCES formulas(id),
      machine_no TEXT NOT NULL,
      operator TEXT NOT NULL,
      discharge_temp REAL,
      max_temp REAL,
      start_time TEXT,
      end_time TEXT,
      status TEXT NOT NULL DEFAULT 'in_progress',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS feeding_records (
      id TEXT PRIMARY KEY,
      mixing_batch_id TEXT NOT NULL REFERENCES mixing_batches(id),
      material_name TEXT NOT NULL,
      material_code TEXT NOT NULL,
      weight REAL NOT NULL,
      unit TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      feed_time TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS milling_batches (
      id TEXT PRIMARY KEY,
      batch_no TEXT NOT NULL UNIQUE,
      mixing_batch_id TEXT NOT NULL REFERENCES mixing_batches(id),
      machine_no TEXT NOT NULL,
      operator TEXT NOT NULL,
      thickness REAL,
      thickness_target REAL,
      pass_count INTEGER DEFAULT 0,
      sheet_count INTEGER DEFAULT 0,
      start_time TEXT,
      end_time TEXT,
      status TEXT NOT NULL DEFAULT 'in_progress',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS vulcanization_batches (
      id TEXT PRIMARY KEY,
      batch_no TEXT NOT NULL UNIQUE,
      milling_batch_id TEXT NOT NULL REFERENCES milling_batches(id),
      mold_no TEXT NOT NULL,
      machine_no TEXT NOT NULL,
      operator TEXT NOT NULL,
      mold_temp REAL,
      mold_temp_target REAL,
      vulcanization_time REAL,
      vulcanization_time_target REAL,
      pressure REAL,
      start_time TEXT,
      end_time TEXT,
      status TEXT NOT NULL DEFAULT 'in_progress',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS deburring_batches (
      id TEXT PRIMARY KEY,
      batch_no TEXT NOT NULL UNIQUE,
      vulcanization_batch_id TEXT NOT NULL REFERENCES vulcanization_batches(id),
      method TEXT NOT NULL,
      operator TEXT NOT NULL,
      total_count INTEGER DEFAULT 0,
      qualified_count INTEGER DEFAULT 0,
      qualified_rate REAL,
      start_time TEXT,
      end_time TEXT,
      status TEXT NOT NULL DEFAULT 'in_progress',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS inspection_records (
      id TEXT PRIMARY KEY,
      batch_no TEXT NOT NULL UNIQUE,
      deburring_batch_id TEXT NOT NULL REFERENCES deburring_batches(id),
      inspector TEXT NOT NULL,
      inner_diameter REAL,
      inner_diameter_target REAL,
      inner_diameter_tolerance REAL,
      outer_diameter REAL,
      outer_diameter_target REAL,
      outer_diameter_tolerance REAL,
      cross_section REAL,
      cross_section_target REAL,
      cross_section_tolerance REAL,
      inner_diameter_result TEXT,
      outer_diameter_result TEXT,
      cross_section_result TEXT,
      overall_result TEXT,
      inspected_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS physical_tests (
      id TEXT PRIMARY KEY,
      batch_no TEXT NOT NULL UNIQUE,
      inspection_id TEXT NOT NULL REFERENCES inspection_records(id),
      tester TEXT NOT NULL,
      hardness_shore_a REAL,
      hardness_target REAL,
      hardness_result TEXT,
      tensile_strength REAL,
      tensile_strength_target REAL,
      tensile_strength_result TEXT,
      elongation_at_break REAL,
      elongation_target REAL,
      compression_set REAL,
      compression_set_target REAL,
      compression_set_result TEXT,
      overall_result TEXT,
      tested_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)
}

function isEmpty(db: Database.Database): boolean {
  const row = db.prepare('SELECT COUNT(*) as cnt FROM formulas').get() as { cnt: number }
  return row.cnt === 0
}

function randomDate(daysBack: number): string {
  const now = new Date()
  const past = new Date(now.getTime() - Math.random() * daysBack * 86400000)
  return past.toISOString().replace('T', ' ').substring(0, 19)
}

function seedData(db: Database.Database) {
  const insertFormula = db.prepare(`
    INSERT INTO formulas (id, name, code, status, version, description, created_by, created_at, updated_at, approved_by, approved_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertMaterial = db.prepare(`
    INSERT INTO formula_materials (id, formula_id, name, code, ratio, unit, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const insertMixing = db.prepare(`
    INSERT INTO mixing_batches (id, batch_no, formula_id, machine_no, operator, discharge_temp, max_temp, start_time, end_time, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertFeeding = db.prepare(`
    INSERT INTO feeding_records (id, mixing_batch_id, material_name, material_code, weight, unit, sort_order, feed_time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertMilling = db.prepare(`
    INSERT INTO milling_batches (id, batch_no, mixing_batch_id, machine_no, operator, thickness, thickness_target, pass_count, sheet_count, start_time, end_time, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertVulcanization = db.prepare(`
    INSERT INTO vulcanization_batches (id, batch_no, milling_batch_id, mold_no, machine_no, operator, mold_temp, mold_temp_target, vulcanization_time, vulcanization_time_target, pressure, start_time, end_time, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertDeburring = db.prepare(`
    INSERT INTO deburring_batches (id, batch_no, vulcanization_batch_id, method, operator, total_count, qualified_count, qualified_rate, start_time, end_time, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertInspection = db.prepare(`
    INSERT INTO inspection_records (id, batch_no, deburring_batch_id, inspector, inner_diameter, inner_diameter_target, inner_diameter_tolerance, outer_diameter, outer_diameter_target, outer_diameter_tolerance, cross_section, cross_section_target, cross_section_tolerance, inner_diameter_result, outer_diameter_result, cross_section_result, overall_result, inspected_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertTest = db.prepare(`
    INSERT INTO physical_tests (id, batch_no, inspection_id, tester, hardness_shore_a, hardness_target, hardness_result, tensile_strength, tensile_strength_target, tensile_strength_result, elongation_at_break, elongation_target, compression_set, compression_set_target, compression_set_result, overall_result, tested_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const seed = db.transaction(() => {
    const formulas = [
      {
        id: uuidv4(), name: 'NBR丁腈橡胶配方', code: 'NBR-001', status: 'approved', version: 3,
        description: '耐油丁腈橡胶O型圈配方，适用于石油基液压油环境', created_by: '张工',
        created_at: randomDate(30), updated_at: randomDate(5), approved_by: '李总工', approved_at: randomDate(25),
        materials: [
          { name: 'NBR橡胶', code: 'NBR-270S', ratio: 100, unit: 'phr', sort: 1 },
          { name: '氧化锌', code: 'ZnO', ratio: 5, unit: 'phr', sort: 2 },
          { name: '硬脂酸', code: 'SA', ratio: 1.5, unit: 'phr', sort: 3 },
          { name: '炭黑N550', code: 'N550', ratio: 50, unit: 'phr', sort: 4 },
          { name: '邻苯二甲酸二丁酯', code: 'DBP', ratio: 10, unit: 'phr', sort: 5 },
          { name: '硫磺', code: 'S', ratio: 1.5, unit: 'phr', sort: 6 },
          { name: '促进剂CZ', code: 'CZ', ratio: 1.0, unit: 'phr', sort: 7 },
          { name: '防老剂RD', code: 'RD', ratio: 1.5, unit: 'phr', sort: 8 },
        ]
      },
      {
        id: uuidv4(), name: 'EPDM三元乙丙橡胶配方', code: 'EPDM-001', status: 'approved', version: 2,
        description: '耐候耐老化三元乙丙橡胶配方，适用于蒸汽和热水环境', created_by: '王工',
        created_at: randomDate(28), updated_at: randomDate(10), approved_by: '李总工', approved_at: randomDate(20),
        materials: [
          { name: 'EPDM橡胶', code: 'EPDM-4045', ratio: 100, unit: 'phr', sort: 1 },
          { name: '氧化锌', code: 'ZnO', ratio: 5, unit: 'phr', sort: 2 },
          { name: '硬脂酸', code: 'SA', ratio: 1, unit: 'phr', sort: 3 },
          { name: '炭黑N660', code: 'N660', ratio: 60, unit: 'phr', sort: 4 },
          { name: '石蜡油', code: 'PO', ratio: 20, unit: 'phr', sort: 5 },
          { name: '硫磺', code: 'S', ratio: 1.5, unit: 'phr', sort: 6 },
          { name: '促进剂TMTD', code: 'TMTD', ratio: 1.0, unit: 'phr', sort: 7 },
          { name: '促进剂M', code: 'M', ratio: 0.5, unit: 'phr', sort: 8 },
          { name: '防老剂4010NA', code: '4010NA', ratio: 2, unit: 'phr', sort: 9 },
        ]
      },
      {
        id: uuidv4(), name: 'FKM氟橡胶配方', code: 'FKM-001', status: 'approved', version: 2,
        description: '耐高温耐腐蚀氟橡胶配方，适用于航空燃油及强酸环境', created_by: '赵工',
        created_at: randomDate(25), updated_at: randomDate(8), approved_by: '李总工', approved_at: randomDate(18),
        materials: [
          { name: 'FKM橡胶', code: 'FKM-2603', ratio: 100, unit: 'phr', sort: 1 },
          { name: '氧化镁', code: 'MgO', ratio: 3, unit: 'phr', sort: 2 },
          { name: '氢氧化钙', code: 'CaOH2', ratio: 6, unit: 'phr', sort: 3 },
          { name: '炭黑MT', code: 'MT', ratio: 20, unit: 'phr', sort: 4 },
          { name: '加工助剂WS', code: 'WS', ratio: 1, unit: 'phr', sort: 5 },
          { name: '双酚AF硫化剂', code: 'BPAF', ratio: 2, unit: 'phr', sort: 6 },
          { name: '促进剂BPP', code: 'BPP', ratio: 0.5, unit: 'phr', sort: 7 },
        ]
      },
      {
        id: uuidv4(), name: 'VMQ硅橡胶配方', code: 'VMQ-001', status: 'draft', version: 1,
        description: '耐高低温硅橡胶配方，适用于食品级和医疗级O型圈', created_by: '刘工',
        created_at: randomDate(10), updated_at: randomDate(3), approved_by: null, approved_at: null,
        materials: [
          { name: '硅橡胶', code: 'VMQ-110', ratio: 100, unit: 'phr', sort: 1 },
          { name: '气相白炭黑', code: 'SiO2', ratio: 40, unit: 'phr', sort: 2 },
          { name: '羟基硅油', code: 'HSO', ratio: 5, unit: 'phr', sort: 3 },
          { name: '过氧化物硫化剂BP', code: 'BP', ratio: 1.0, unit: 'phr', sort: 4 },
          { name: '氧化铁红', code: 'Fe2O3', ratio: 0.5, unit: 'phr', sort: 5 },
        ]
      },
      {
        id: uuidv4(), name: 'HNBR氢化丁腈橡胶配方', code: 'HNBR-001', status: 'approved', version: 1,
        description: '高强度耐热氢化丁腈橡胶配方，适用于高温高压油田环境', created_by: '陈工',
        created_at: randomDate(20), updated_at: randomDate(7), approved_by: '李总工', approved_at: randomDate(15),
        materials: [
          { name: 'HNBR橡胶', code: 'HNBR-3406', ratio: 100, unit: 'phr', sort: 1 },
          { name: '氧化锌', code: 'ZnO', ratio: 5, unit: 'phr', sort: 2 },
          { name: '硬脂酸', code: 'SA', ratio: 1, unit: 'phr', sort: 3 },
          { name: '炭黑N774', code: 'N774', ratio: 45, unit: 'phr', sort: 4 },
          { name: '增塑剂TP-95', code: 'TP95', ratio: 8, unit: 'phr', sort: 5 },
          { name: '过氧化物硫化剂', code: 'DCP', ratio: 3, unit: 'phr', sort: 6 },
          { name: '共硫化剂TAC', code: 'TAC', ratio: 2, unit: 'phr', sort: 7 },
          { name: '防老剂445', code: '445', ratio: 2, unit: 'phr', sort: 8 },
        ]
      },
    ]

    for (const f of formulas) {
      insertFormula.run(f.id, f.name, f.code, f.status, f.version, f.description, f.created_by, f.created_at, f.updated_at, f.approved_by, f.approved_at)
      for (const m of f.materials) {
        insertMaterial.run(uuidv4(), f.id, m.name, m.code, m.ratio, m.unit, m.sort)
      }
    }

    const approvedFormulas = formulas.filter(f => f.status === 'approved')
    const operators = ['张伟', '李强', '王磊', '刘洋', '陈明', '赵鹏', '周杰', '吴斌']
    const machines = ['MIX-01', 'MIX-02', 'MIX-03']
    const millMachines = ['MIL-01', 'MIL-02', 'MIL-03']
    const vulcMachines = ['VUL-01', 'VUL-02', 'VUL-03', 'VUL-04', 'VUL-05']
    const molds = ['MLD-A01', 'MLD-A02', 'MLD-B01', 'MLD-B02', 'MLD-C01', 'MLD-C02']
    const statuses = ['completed', 'completed', 'completed', 'completed', 'completed', 'completed', 'in_progress', 'abnormal']

    const mixingIds: string[] = []
    const millingIds: string[] = []
    const vulcIds: string[] = []
    const deburrIds: string[] = []

    for (let i = 0; i < 8; i++) {
      const mid = uuidv4()
      mixingIds.push(mid)
      const formula = approvedFormulas[i % approvedFormulas.length]
      const status = statuses[i]
      const startTime = randomDate(20)
      const endTime = status !== 'in_progress' ? new Date(new Date(startTime).getTime() + 1800000).toISOString().replace('T', ' ').substring(0, 19) : null
      const dischargeTemp = status !== 'in_progress' ? (105 + Math.random() * 20).toFixed(1) : null
      const maxTemp = status !== 'in_progress' ? (120 + Math.random() * 15).toFixed(1) : null
      const batchNo = `MX-${String(new Date().getFullYear()).slice(2)}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(3, '0')}`

      insertMixing.run(mid, batchNo, formula.id, machines[i % machines.length], operators[i], dischargeTemp ? +dischargeTemp : null, maxTemp ? +maxTemp : null, startTime, endTime, status, startTime)

      for (const m of formula.materials) {
        const weight = +(m.ratio * (10 + Math.random() * 2)).toFixed(2)
        insertFeeding.run(uuidv4(), mid, m.name, m.code, weight, 'kg', m.sort, startTime)
      }

      const milId = uuidv4()
      millingIds.push(milId)
      const milStatus = statuses[i]
      const milStart = randomDate(15)
      const milEnd = milStatus !== 'in_progress' ? new Date(new Date(milStart).getTime() + 2400000).toISOString().replace('T', ' ').substring(0, 19) : null
      const thicknessTarget = 2.0 + Math.random() * 1.5
      const thickness = milStatus !== 'in_progress' ? +(thicknessTarget + (Math.random() - 0.5) * 0.1).toFixed(2) : null
      const milBatchNo = `ML-${String(new Date().getFullYear()).slice(2)}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(3, '0')}`

      insertMilling.run(milId, milBatchNo, mid, millMachines[i % millMachines.length], operators[(i + 2) % operators.length], thickness, +thicknessTarget.toFixed(2), milStatus !== 'in_progress' ? 3 + Math.floor(Math.random() * 4) : 0, milStatus !== 'in_progress' ? 10 + Math.floor(Math.random() * 20) : 0, milStart, milEnd, milStatus, milStart)

      const vId = uuidv4()
      vulcIds.push(vId)
      const vulcStatus = statuses[i]
      const vulcStart = randomDate(10)
      const vulcEnd = vulcStatus !== 'in_progress' ? new Date(new Date(vulcStart).getTime() + 600000).toISOString().replace('T', ' ').substring(0, 19) : null
      const moldTempTarget = 165 + Math.random() * 15
      const moldTemp = vulcStatus !== 'in_progress' ? +(moldTempTarget + (Math.random() - 0.5) * 3).toFixed(1) : null
      const vulcTimeTarget = 8 + Math.random() * 4
      const vulcTime = vulcStatus !== 'in_progress' ? +(vulcTimeTarget + (Math.random() - 0.5) * 0.5).toFixed(1) : null
      const pressure = 10 + Math.random() * 5
      const vulcBatchNo = `VU-${String(new Date().getFullYear()).slice(2)}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(3, '0')}`

      insertVulcanization.run(vId, vulcBatchNo, milId, molds[i % molds.length], vulcMachines[i % vulcMachines.length], operators[(i + 4) % operators.length], moldTemp, +moldTempTarget.toFixed(1), vulcTime, +vulcTimeTarget.toFixed(1), +pressure.toFixed(1), vulcStart, vulcEnd, vulcStatus, vulcStart)

      const dId = uuidv4()
      deburrIds.push(dId)
      const deburrStatus = statuses[i]
      const deburrStart = randomDate(7)
      const deburrEnd = deburrStatus !== 'in_progress' ? new Date(new Date(deburrStart).getTime() + 3600000).toISOString().replace('T', ' ').substring(0, 19) : null
      const totalCount = deburrStatus !== 'in_progress' ? 500 + Math.floor(Math.random() * 500) : 0
      const qualifiedCount = deburrStatus !== 'in_progress' ? Math.floor(totalCount * (0.92 + Math.random() * 0.07)) : 0
      const qualifiedRate = totalCount > 0 ? +(qualifiedCount / totalCount * 100).toFixed(1) : null
      const deburrBatchNo = `DB-${String(new Date().getFullYear()).slice(2)}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(3, '0')}`
      const methods = ['冷冻修边', '手工修边', '机械修边']

      insertDeburring.run(dId, deburrBatchNo, vId, methods[i % methods.length], operators[(i + 1) % operators.length], totalCount, qualifiedCount, qualifiedRate, deburrStart, deburrEnd, deburrStatus, deburrStart)

      if (deburrStatus !== 'in_progress') {
        const inspId = uuidv4()
        const inspBatchNo = `QC-${String(new Date().getFullYear()).slice(2)}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(3, '0')}`
        const idTarget = 25 + Math.random() * 10
        const odTarget = 35 + Math.random() * 10
        const csTarget = 2.0 + Math.random() * 2
        const idTol = 0.15
        const odTol = 0.15
        const csTol = 0.10
        const idActual = +(idTarget + (Math.random() - 0.5) * idTol * 1.5).toFixed(2)
        const odActual = +(odTarget + (Math.random() - 0.5) * odTol * 1.5).toFixed(2)
        const csActual = +(csTarget + (Math.random() - 0.5) * csTol * 1.5).toFixed(2)
        const idResult = Math.abs(idActual - idTarget) <= idTol ? 'pass' : 'fail'
        const odResult = Math.abs(odActual - odTarget) <= odTol ? 'pass' : 'fail'
        const csResult = Math.abs(csActual - csTarget) <= csTol ? 'pass' : 'fail'
        const overallResult = idResult === 'pass' && odResult === 'pass' && csResult === 'pass' ? 'pass' : 'fail'

        insertInspection.run(inspId, inspBatchNo, dId, operators[(i + 3) % operators.length], idActual, +idTarget.toFixed(2), idTol, odActual, +odTarget.toFixed(2), odTol, csActual, +csTarget.toFixed(2), csTol, idResult, odResult, csResult, overallResult, randomDate(5))

        const testId = uuidv4()
        const testBatchNo = `PT-${String(new Date().getFullYear()).slice(2)}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(3, '0')}`
        const hardnessTarget = 70 + Math.floor(Math.random() * 10)
        const hardnessActual = +(hardnessTarget + (Math.random() - 0.5) * 4).toFixed(1)
        const hardnessResult = Math.abs(hardnessActual - hardnessTarget) <= 3 ? 'pass' : 'fail'
        const tensileTarget = 15 + Math.random() * 8
        const tensileActual = +(tensileTarget + (Math.random() - 0.5) * 3).toFixed(1)
        const tensileResult = tensileActual >= tensileTarget * 0.85 ? 'pass' : 'fail'
        const elongationTarget = 200 + Math.random() * 150
        const elongationActual = +(elongationTarget + (Math.random() - 0.5) * 30).toFixed(1)
        const compressionTarget = 15 + Math.random() * 10
        const compressionActual = +(compressionTarget + (Math.random() - 0.5) * 4).toFixed(1)
        const compressionResult = compressionActual <= compressionTarget * 1.15 ? 'pass' : 'fail'
        const testOverall = hardnessResult === 'pass' && tensileResult === 'pass' && compressionResult === 'pass' ? 'pass' : 'fail'

        insertTest.run(testId, testBatchNo, inspId, operators[(i + 5) % operators.length], hardnessActual, hardnessTarget, hardnessResult, tensileActual, +tensileTarget.toFixed(1), tensileResult, elongationActual, +elongationTarget.toFixed(1), compressionActual, +compressionTarget.toFixed(1), compressionResult, testOverall, randomDate(4))
      }
    }
  })

  seed()
}
