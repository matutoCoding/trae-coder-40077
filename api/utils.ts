import { getDb } from './database.js'

export function generateBatchNo(prefix: string, tableName: string): string {
  const db = getDb()
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const dateStr = `${year}${month}${day}`
  const searchPattern = `${prefix}${dateStr}%`

  const result = db.prepare(`SELECT COUNT(*) as count FROM ${tableName} WHERE batch_no LIKE ?`).get(searchPattern) as { count: number }
  const nextNum = result.count + 1
  const sequence = String(nextNum).padStart(3, '0')

  return `${prefix}${dateStr}-${sequence}`
}
