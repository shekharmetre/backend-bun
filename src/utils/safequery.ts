import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

interface SafeQueryOptions {
  retries?: number
  timeout?: number
  tag?: string
}

export async function safeQuery<T>(
  queryFn: () => Promise<T>,
  options: SafeQueryOptions = {}
): Promise<T> {
  const { retries = 3, timeout = 5000, tag = 'DB' } = options
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await Promise.race([
        db.$queryRaw`SELECT 1`,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('DB health check timeout')), 1000)
        ),
      ])

      return await queryFn()
    } catch (error: any) {
      lastError = error
      const delay = Math.min(timeout, Math.pow(2, attempt) * 100 + Math.random() * 300)
      console.warn(`[${tag}] Attempt ${attempt} failed: ${error.message}. Retrying in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw new Error(`❌ ${tag} query failed after ${retries} attempts: ${lastError?.message}`)
}
