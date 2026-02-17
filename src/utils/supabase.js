import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qwlbbcrjdpuxkavwyjyg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3bGJiY3JqZHB1eGthdnd5anlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NTU2MTgsImV4cCI6MjA3ODIzMTYxOH0.u9Pzx715-Xtbg2I7t-IBrYnj-0lgnwqqOkTcge69JWE'

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'x-client-info': 'kb-quiz-adventure/1.0.0'
    }
  }
})

// Retry wrapper for critical operations
export async function withRetry(operation, maxRetries = 3) {
  let lastError
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await operation()
      return result
    } catch (error) {
      lastError = error
      console.warn(`Attempt ${i + 1} failed:`, error.message)
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000))
    }
  }
  throw lastError
}

// Queue for offline operations
const offlineQueue = []

export function queueOperation(operation) {
  offlineQueue.push({
    operation,
    timestamp: new Date().toISOString(),
    id: crypto.randomUUID()
  })
  // Try to process queue
  processQueue()
}

async function processQueue() {
  if (!navigator.onLine) return
  
  while (offlineQueue.length > 0) {
    const item = offlineQueue[0]
    try {
      await item.operation()
      offlineQueue.shift() // Remove successful operation
    } catch (error) {
      console.error('Queue processing failed:', error)
      break // Stop processing on error
    }
  }
}

// Listen for online status
if (typeof window !== 'undefined') {
  window.addEventListener('online', processQueue)
}

export default supabase
