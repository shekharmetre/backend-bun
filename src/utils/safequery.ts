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

  try {
    await db.$connect()
  } catch (err) {
    console.error("❌ Initial DB connection failed:", err)
    throw err
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeout)

      const result = await queryFn() // ✅ Only real query here

      clearTimeout(timer)
      return result
    } catch (error: any) {
      lastError = error
      const delay = Math.min(timeout, Math.pow(2, attempt) * 100 + Math.random() * 300)
      console.warn(`[${tag}] Attempt ${attempt} failed: ${error.message}. Retrying in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw new Error(`❌ ${tag} query failed after ${retries} attempts: ${lastError?.message}`)
}
