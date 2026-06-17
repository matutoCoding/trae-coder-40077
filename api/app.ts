/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import formulaRoutes from './routes/formulas.js'
import mixingRoutes from './routes/mixing.js'
import millingRoutes from './routes/milling.js'
import vulcanizationRoutes from './routes/vulcanization.js'
import deburringRoutes from './routes/deburring.js'
import inspectionRoutes from './routes/inspection.js'
import testingRoutes from './routes/testing.js'
import reportRoutes from './routes/reports.js'
import { getDb } from './database.js'

// for esm mode
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// load env
dotenv.config()

const app: express.Application = express()

getDb()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/formulas', formulaRoutes)
app.use('/api/mixing', mixingRoutes)
app.use('/api/milling', millingRoutes)
app.use('/api/vulcanization', vulcanizationRoutes)
app.use('/api/deburring', deburringRoutes)
app.use('/api/inspection', inspectionRoutes)
app.use('/api/testing', testingRoutes)
app.use('/api/reports', reportRoutes)

/**
 * health
 */
app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[API Error]', error.message, error.stack)
  res.status(500).json({
    success: false,
    error: 'Server internal error: ' + error.message,
  })
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
