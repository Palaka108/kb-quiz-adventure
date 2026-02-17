import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCapture } from '../contexts/CaptureContext'

const PLAYERS = [
  { name: 'Krishna', color: '#3b82f6', emoji: '🔵', pin: '1111' },
  { name: 'Balarama', color: '#10b981', emoji: '🟢', pin: '2222' },
  { name: 'Mommy', color: '#9b4dca', emoji: '💜', pin: '0000' }
]

export default function LoginPage() {
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [pin, setPin] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const { login, loginError, isLoggedIn } = useAuth()
  const { logAction } = useCapture()
  const navigate = useNavigate()

  // Redirect if already logged in
  useEffect(() => {
    if (isLoggedIn) {
      navigate('/')
    }
  }, [isLoggedIn, navigate])

  const handlePlayerSelect = (player) => {
    setSelectedPlayer(player)
    setPin('')
    logAction('player_selected', { player_name: player.name })
  }

  const handlePinInput = (digit) => {
    if (pin.length < 4) {
      setPin(prev => prev + digit)
    }
  }

  const handlePinClear = () => {
    setPin('')
  }

  const handleLogin = async () => {
    if (pin.length !== 4 || !selectedPlayer) return
    
    setIsLoggingIn(true)
    const success = await login(selectedPlayer.name, pin)
    setIsLoggingIn(false)
    
    if (success) {
      navigate('/')
    }
  }

  // Auto-submit when PIN is complete
  useEffect(() => {
    if (pin.length === 4 && selectedPlayer) {
      handleLogin()
    }
  }, [pin])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-display text-white mb-2">
            🎮 KB's Quiz Adventure
          </h1>
          <p className="text-gray-400 text-lg">
            {selectedPlayer ? `Enter your PIN, ${selectedPlayer.name}!` : 'Who\'s playing?'}
          </p>
        </div>

        {/* Player Selection */}
        {!selectedPlayer ? (
          <div className="grid grid-cols-1 gap-4">
            {PLAYERS.map(player => (
              <button
                key={player.name}
                onClick={() => handlePlayerSelect(player)}
                className="glass-card p-6 flex items-center gap-4 transition-all duration-300
                         hover:scale-[1.02] hover:border-opacity-50 active:scale-[0.98]"
                style={{ 
                  borderColor: player.color,
                  boxShadow: `0 0 20px ${player.color}30`
                }}
              >
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
                  style={{ backgroundColor: `${player.color}30` }}
                >
                  {player.emoji}
                </div>
                <div className="flex-1 text-left">
                  <h2 className="text-2xl font-display text-white">{player.name}</h2>
                  <p className="text-gray-400 text-sm">Tap to sign in</p>
                </div>
                <div className="text-3xl">→</div>
              </button>
            ))}
          </div>
        ) : (
          /* PIN Entry */
          <div className="glass-card p-8">
            {/* Selected player header */}
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/10">
              <button 
                onClick={() => setSelectedPlayer(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ← Back
              </button>
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                style={{ backgroundColor: `${selectedPlayer.color}30` }}
              >
                {selectedPlayer.emoji}
              </div>
              <h2 className="text-xl font-display text-white">{selectedPlayer.name}</h2>
            </div>

            {/* PIN Display */}
            <div className="flex justify-center gap-4 mb-8">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold
                            transition-all duration-200 ${
                              pin.length > i 
                                ? 'border-white bg-white/20' 
                                : 'border-white/30 bg-white/5'
                            }`}
                  style={pin.length > i ? { borderColor: selectedPlayer.color } : {}}
                >
                  {pin.length > i ? '●' : ''}
                </div>
              ))}
            </div>

            {/* Error message */}
            {loginError && (
              <div className="text-red-400 text-center mb-4 animate-shake">
                {loginError}
              </div>
            )}

            {/* Number pad */}
            <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  onClick={() => handlePinInput(String(num))}
                  disabled={isLoggingIn}
                  className="w-full aspect-square rounded-xl bg-white/10 text-white text-2xl font-bold
                           hover:bg-white/20 active:scale-95 transition-all duration-150
                           disabled:opacity-50"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={handlePinClear}
                disabled={isLoggingIn}
                className="w-full aspect-square rounded-xl bg-red-500/20 text-red-400 text-lg font-bold
                         hover:bg-red-500/30 active:scale-95 transition-all duration-150"
              >
                Clear
              </button>
              <button
                onClick={() => handlePinInput('0')}
                disabled={isLoggingIn}
                className="w-full aspect-square rounded-xl bg-white/10 text-white text-2xl font-bold
                         hover:bg-white/20 active:scale-95 transition-all duration-150
                         disabled:opacity-50"
              >
                0
              </button>
              <button
                onClick={handleLogin}
                disabled={pin.length !== 4 || isLoggingIn}
                className="w-full aspect-square rounded-xl text-white text-2xl font-bold
                         transition-all duration-150 disabled:opacity-50"
                style={{ 
                  backgroundColor: pin.length === 4 ? selectedPlayer.color : 'rgba(255,255,255,0.1)'
                }}
              >
                {isLoggingIn ? '...' : '→'}
              </button>
            </div>

            {/* Hint */}
            <p className="text-center text-gray-500 text-sm mt-6">
              Hint: Your PIN is 4 numbers! 🔢
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
