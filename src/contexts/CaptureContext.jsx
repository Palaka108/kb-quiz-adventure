import React, { createContext, useContext, useEffect, useCallback } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { supabase, withRetry } from '../utils/supabase'

const CaptureContext = createContext(null)

// Local storage backup key
const PENDING_CAPTURES_KEY = 'kb_pending_captures'

export function CaptureProvider({ children }) {
  const location = useLocation()
  const [searchParams] = useSearchParams()

  // Get pending captures from localStorage
  const getPendingCaptures = () => {
    try {
      const stored = localStorage.getItem(PENDING_CAPTURES_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  // Save pending captures to localStorage
  const savePendingCaptures = (captures) => {
    localStorage.setItem(PENDING_CAPTURES_KEY, JSON.stringify(captures))
  }

  // CRITICAL: Capture ANY data and ensure it reaches Supabase
  const captureData = useCallback(async (eventType, data, playerName = null) => {
    const captureRecord = {
      id: crypto.randomUUID(),
      event_type: eventType,
      player_name: playerName,
      data: JSON.stringify(data),
      url_path: location.pathname,
      url_params: Object.fromEntries(searchParams.entries()),
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      synced: false
    }

    // ALWAYS save to localStorage FIRST (backup)
    const pending = getPendingCaptures()
    pending.push(captureRecord)
    savePendingCaptures(pending)

    // Then try to sync to Supabase
    try {
      await withRetry(async () => {
        const { error } = await supabase
          .from('kb_captures')
          .insert({
            event_type: captureRecord.event_type,
            player_name: captureRecord.player_name,
            data: captureRecord.data,
            url_path: captureRecord.url_path,
            url_params: captureRecord.url_params,
            user_agent: captureRecord.user_agent,
            created_at: captureRecord.timestamp
          })
        
        if (error) throw error
      })

      // Mark as synced and remove from pending
      const updated = getPendingCaptures().filter(c => c.id !== captureRecord.id)
      savePendingCaptures(updated)
      
      console.log('✅ Captured:', eventType, data)
    } catch (error) {
      console.error('❌ Capture failed (saved locally):', error)
      // Data is already in localStorage, will retry later
    }
  }, [location.pathname, searchParams])

  // Capture URL parameters on every route change
  useEffect(() => {
    const params = Object.fromEntries(searchParams.entries())
    if (Object.keys(params).length > 0) {
      captureData('url_params', params)
    }
  }, [searchParams, captureData])

  // Sync pending captures on mount and when online
  const syncPendingCaptures = useCallback(async () => {
    const pending = getPendingCaptures()
    if (pending.length === 0) return

    console.log(`📤 Syncing ${pending.length} pending captures...`)

    for (const capture of pending) {
      if (capture.synced) continue

      try {
        await withRetry(async () => {
          const { error } = await supabase
            .from('kb_captures')
            .insert({
              event_type: capture.event_type,
              player_name: capture.player_name,
              data: capture.data,
              url_path: capture.url_path,
              url_params: capture.url_params,
              user_agent: capture.user_agent,
              created_at: capture.timestamp
            })
          
          if (error) throw error
        })

        // Remove synced capture
        const updated = getPendingCaptures().filter(c => c.id !== capture.id)
        savePendingCaptures(updated)
      } catch (error) {
        console.error('Failed to sync capture:', capture.id)
      }
    }
  }, [])

  // Sync on mount
  useEffect(() => {
    syncPendingCaptures()
  }, [syncPendingCaptures])

  // Sync when coming back online
  useEffect(() => {
    window.addEventListener('online', syncPendingCaptures)
    return () => window.removeEventListener('online', syncPendingCaptures)
  }, [syncPendingCaptures])

  // Capture before page unload
  useEffect(() => {
    const handleUnload = () => {
      // Last-ditch effort to save any pending data
      const pending = getPendingCaptures()
      if (pending.length > 0) {
        // Use sendBeacon for reliable delivery
        const data = JSON.stringify(pending)
        navigator.sendBeacon?.(
          `${import.meta.env.VITE_SUPABASE_URL || 'https://qwlbbcrjdpuxkavwyjyg.supabase.co'}/rest/v1/kb_captures`,
          data
        )
      }
    }

    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [])

  // Log errors to Supabase
  const logError = useCallback(async (error, context = {}) => {
    await captureData('error', {
      message: error.message,
      stack: error.stack,
      context
    })
  }, [captureData])

  // Log user actions
  const logAction = useCallback(async (action, details = {}, playerName = null) => {
    await captureData('user_action', { action, ...details }, playerName)
  }, [captureData])

  // Log quiz answers
  const logQuizAnswer = useCallback(async (playerName, questionId, answer, isCorrect) => {
    await captureData('quiz_answer', {
      question_id: questionId,
      selected_answer: answer,
      is_correct: isCorrect
    }, playerName)
  }, [captureData])

  // Log game progress
  const logGameProgress = useCallback(async (playerName, gameType, score, details = {}) => {
    await captureData('game_progress', {
      game_type: gameType,
      score,
      ...details
    }, playerName)
  }, [captureData])

  const value = {
    captureData,
    logError,
    logAction,
    logQuizAnswer,
    logGameProgress,
    syncPendingCaptures,
    getPendingCount: () => getPendingCaptures().length
  }

  return (
    <CaptureContext.Provider value={value}>
      {children}
    </CaptureContext.Provider>
  )
}

export function useCapture() {
  const context = useContext(CaptureContext)
  if (!context) {
    throw new Error('useCapture must be used within a CaptureProvider')
  }
  return context
}

export default CaptureContext
