import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../utils/supabase'
import { useCapture } from './CaptureContext'

const AuthContext = createContext(null)

// Player PINs (simple auth for kids)
const PLAYER_PINS = {
  'Krishna': '1111',
  'Balarama': '2222',
  'Mommy': '0000'
}

export function AuthProvider({ children }) {
  const [currentPlayer, setCurrentPlayer] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loginError, setLoginError] = useState(null)
  const { logAction, captureData } = useCapture()

  // Check for saved session on mount
  useEffect(() => {
    const savedPlayer = localStorage.getItem('kb_current_player')
    if (savedPlayer) {
      try {
        const player = JSON.parse(savedPlayer)
        setCurrentPlayer(player)
        captureData('session_restored', { player_name: player.name })
      } catch {
        localStorage.removeItem('kb_current_player')
      }
    }
    setIsLoading(false)
  }, [captureData])

  // Login with name and PIN
  const login = useCallback(async (playerName, pin) => {
    setLoginError(null)
    
    // Validate PIN
    if (PLAYER_PINS[playerName] !== pin) {
      setLoginError('Oops! Wrong PIN. Try again!')
      captureData('login_failed', { player_name: playerName, reason: 'wrong_pin' })
      return false
    }

    try {
      // Get player data from Supabase
      const { data: player, error } = await supabase
        .from('kb_players')
        .select('*')
        .eq('name', playerName)
        .single()

      if (error) throw error

      // Update last played
      await supabase
        .from('kb_players')
        .update({ last_played_at: new Date().toISOString() })
        .eq('id', player.id)

      // Get skill mastery
      const { data: skills } = await supabase
        .from('kb_skill_mastery')
        .select('*')
        .eq('player_name', playerName)

      const playerData = {
        ...player,
        skills: skills || []
      }

      setCurrentPlayer(playerData)
      localStorage.setItem('kb_current_player', JSON.stringify(playerData))
      
      await logAction('login', { player_id: player.id }, playerName)
      
      return true
    } catch (error) {
      console.error('Login error:', error)
      setLoginError('Something went wrong. Try again!')
      captureData('login_error', { player_name: playerName, error: error.message })
      return false
    }
  }, [logAction, captureData])

  // Logout
  const logout = useCallback(async () => {
    if (currentPlayer) {
      await logAction('logout', {}, currentPlayer.name)
    }
    setCurrentPlayer(null)
    localStorage.removeItem('kb_current_player')
  }, [currentPlayer, logAction])

  // Refresh player data
  const refreshPlayer = useCallback(async () => {
    if (!currentPlayer) return

    try {
      const { data: skills } = await supabase
        .from('kb_skill_mastery')
        .select('*')
        .eq('player_name', currentPlayer.name)

      const updated = { ...currentPlayer, skills: skills || [] }
      setCurrentPlayer(updated)
      localStorage.setItem('kb_current_player', JSON.stringify(updated))
    } catch (error) {
      console.error('Refresh error:', error)
    }
  }, [currentPlayer])

  const value = {
    currentPlayer,
    isLoading,
    loginError,
    login,
    logout,
    refreshPlayer,
    isLoggedIn: !!currentPlayer
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
