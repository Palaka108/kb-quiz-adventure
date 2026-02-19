import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import confetti from 'canvas-confetti'

export default function ResultsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { currentPlayer, refreshPlayer } = useAuth()
  const [showDetails, setShowDetails] = useState(false)

  const { score = 0, total = 15, percentage = 0, breakdown = {}, quizNumber } = location.state || {}

  const playerColor = currentPlayer?.name === 'Krishna' ? '#3b82f6' : 
                      currentPlayer?.name === 'Balarama' ? '#10b981' : '#9b4dca'

  useEffect(() => {
    // Refresh player data
    refreshPlayer()

    // Celebration confetti for good scores
    if (percentage >= 70) {
      const duration = 3000
      const end = Date.now() + duration

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#3b82f6', '#10b981', '#f59e0b']
        })
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#3b82f6', '#10b981', '#f59e0b']
        })

        if (Date.now() < end) {
          requestAnimationFrame(frame)
        }
      }
      frame()
    }
  }, [percentage, refreshPlayer])

  const getEmoji = () => {
    if (percentage >= 90) return '🏆'
    if (percentage >= 70) return '🌟'
    if (percentage >= 50) return '👍'
    return '💪'
  }

  const getMessage = () => {
    if (percentage >= 90) return "Outstanding! You're a math champion!"
    if (percentage >= 70) return "Great job! Keep it up!"
    if (percentage >= 50) return "Good effort! Practice makes perfect!"
    return "Don't give up! Let's learn and try again!"
  }

  const getGrade = () => {
    if (percentage >= 90) return 'A'
    if (percentage >= 80) return 'B'
    if (percentage >= 70) return 'C'
    if (percentage >= 60) return 'D'
    return 'F'
  }

  return (
    <div className="min-h-screen p-4 flex items-center justify-center">
      <div className="max-w-lg w-full">
        <div className="glass-card p-8 text-center animate-bounce-in">
          {/* Header */}
          <div className="text-6xl mb-4">{getEmoji()}</div>
          <h1 className="text-3xl font-display text-white mb-2">
            {quizNumber ? `Quiz ${quizNumber}` : 'Quiz'} Complete!
          </h1>
          <p className="text-gray-400 mb-8">{getMessage()}</p>

          {/* Score Circle */}
          <div className="relative w-48 h-48 mx-auto mb-8">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="12"
                fill="none"
              />
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke={playerColor}
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${percentage * 5.53} 553`}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-bold text-white">{Math.round(percentage)}%</span>
              <span className="text-gray-400">{score}/{total}</span>
            </div>
          </div>

          {/* Grade Badge */}
          <div 
            className="inline-block px-6 py-2 rounded-full text-2xl font-bold mb-8"
            style={{ 
              backgroundColor: `${playerColor}30`,
              color: playerColor
            }}
          >
            Grade: {getGrade()}
          </div>

          {/* Skill Breakdown */}
          <div className="mb-8">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-gray-400 hover:text-white transition-colors mb-4"
            >
              {showDetails ? '▼ Hide Details' : '▶ Show Skill Breakdown'}
            </button>
            
            {showDetails && (
              <div className="space-y-3 animate-slide-up">
                {Object.entries(breakdown).map(([skill, data]) => {
                  const skillPct = (data.correct / data.total) * 100
                  return (
                    <div key={skill} className="bg-white/5 rounded-xl p-4">
                      <div className="flex justify-between mb-2">
                        <span className="text-white text-sm">{skill}</span>
                        <span className={`text-sm font-bold ${
                          skillPct >= 70 ? 'text-emerald-400' : 
                          skillPct >= 50 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {data.correct}/{data.total}
                        </span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${skillPct}%`,
                            backgroundColor: skillPct >= 70 ? '#10b981' : 
                                           skillPct >= 50 ? '#f59e0b' : '#ef4444'
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate(quizNumber ? `/quiz?quiz=${quizNumber}` : '/quiz')}
              className="btn-roblox w-full"
              style={{ backgroundColor: playerColor }}
            >
              🎯 Try Again
            </button>
            <button
              onClick={() => navigate('/')}
              className="btn-roblox btn-roblox-blue w-full bg-white/10 hover:bg-white/20"
            >
              🏠 Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
