import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const FALLBACK_TURSO_URL = 'libsql://shopmanagementsystem-muhammademon72.aws-ap-south-1.turso.io'
const FALLBACK_TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTIwNjQzMDQsImlkIjoiMDFhMTNmNWEtZGIwMS03MGMwLTk5NmMtZjE4MWRlODA1NzZhIiwia2lkIjoiUHV4RTlyWXVaVmtqaVpMZlFRVUlTa0JlaU56RXNmdG5Xdmg5QTBib3Y5dyIsInJpZCI6ImVlYWJlNWNiLTI2NmItNGVkMS04MTAxLThiMzA5MDg2MTQ3MyJ9.c1R8eSWXZ4gu36f2851zxUlhmLRYD-PB5GLD43-D_gVc19Wx2y3xi1E5Gfu83P_ojF-9gcJAbuHMos37zKmwDg'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

function createPrismaClient(): PrismaClient {
  let url = process.env.DATABASE_URL ?? ''
  let authToken = process.env.TURSO_AUTH_TOKEN ?? ''
  const isMissing = (v: string) => !v || v.trim() === '' || v === 'undefined'
  if (isMissing(url)) url = FALLBACK_TURSO_URL
  if (isMissing(authToken)) authToken = FALLBACK_TURSO_TOKEN

  const isTurso = url.startsWith('libsql:') || url.startsWith('https:')

  if (isTurso) {
    const libsql = createClient({ url, authToken })
    const adapter = new PrismaLibSql(libsql)
    return new PrismaClient({ log: ['error'], adapter })
  }

  return new PrismaClient({
    log: ['error', 'query'],
    transactionOptions: { timeout: 30000, maxWait: 10000 },
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
