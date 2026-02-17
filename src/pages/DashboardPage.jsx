import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCapture } from '../contexts/CaptureContext'
import { supabase } from '../utils/supabase'

const TUTORIAL_GAMES = [
  {
    id: 'number-crunch',
    name: 'Number Crunch',
    emoji: '🔢',
    description: 'Quick math warmup!',
    color: '#f59e0b',
    duration: '2 min'
  },
  {
    id: 'pattern-blast',
    name: 'Pattern Blast',
    emoji: '🎯',
    description: 'Find the pattern!',
    color: '#8b5cf6',
    duration: '2 min'
  },
  {
    id: 'decimal-dash',
    name: 'Decimal Dash',
    emoji: '💨',
    description: 'Race with decimals!',
    color: '#06b6d4',
    duration: '2 min'
  }
]

export default function DashboardPage() {
  const { currentPlayer, logout, refreshPlayer } = useAuth()
  const { logAction } = useCapture()
  const navigate = useNavigate()
  const [skillsNeedingReview, setSkillsNeedingReview] = useState([])
  const [recentSessions, setRecentSessions] = useState([])
  const [showLearningPrompt, setShowLearningPrompt] = useState(false)

  const playerColor = currentPlayer?.name === 'Krishna' ? '#3b82f6' : 
                      currentPlayer?.name === 'Balarama' ? '#10b981' : '#9b4dca'

  useEffect(() => {
    loadPlayerData()
  }, [currentPlayer])

  async function loadPlayerData() {
    if (!currentPlayer) return

    // Check for skills needing review
    const { data: skills } = await supabase
      .from('kb_skill_mastery')
      .select('*')
      .eq('player_name', currentPlayer.name)
      .eq('needs_review', true)

    setSkillsNeedingReview(skills || [])
    setShowLearningPrompt((skills?.length || 0) > 0)

    // Get recent sessions
    const { data: sessions } = await supabase
      .from('kb_quiz_sessions')
      .select('*')
      .eq('player_name', currentPlayer.name)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(3)

    setRecentSessions(sessions || [])
  }

  const handleGameSelect = (gameId) => {
    logAction('game_started', { game_id: gameId }, currentPlayer?.name)
    navigate(`/tutorial/${gameId}`)
  }

  const handleStartQuiz = () => {
    logAction('quiz_started', {}, currentPlayer?.name)
    navigate('/quiz')
  }

  const handleStartLearning = (skill) => {
    logAction('learning_started', { skill }, currentPlayer?.name)
    navigate(`/learning/${encodeURIComponent(skill)}`)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div 
              className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold"
              style={{ backgroundColor: `${playerColor}30`, color: playerColor }}
            >
              {currentPlayer?.name?.[0]}
            </div>
            <div>
              <h1 className="text-2xl font-display text-white">
                Hey, {currentPlayer?.name}! 👋
              </h1>
              <p className="text-gray-400 text-sm">Ready to play?</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg bg-white/10 text-gray-300 hover:bg-white/20 transition-colors"
          >
            Sign Out
          </button>
        </header>

        {/* Learning Prompt (if skills need review) */}
        {showLearningPrompt && (
          <div 
            className="glass-card p-6 mb-6 border-l-4"
            style={{ borderLeftColor: playerColor }}
          >
            <div className="flex items-start gap-4">
              <div className="text-4xl">📚</div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white mb-2">
                  Time for a Quick Review!
                </h2>
                <p className="text-gray-400 mb-4">
                  Let's strengthen these skills before your next quiz:
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {skillsNeedingReview.map(skill => (
                    <button
                      key={skill.skill}
                      onClick={() => handleStartLearning(skill.skill)}
                      className="px-4 py-2 rounded-lg text-white font-medium transition-all
                               hover:scale-105 active:scale-95"
                      style={{ backgroundColor: playerColor }}
                    >
                      {skill.skill.split(' ')[0]} ({Math.round(skill.first_attempt_score)}% → ?)
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowLearningPrompt(false)}
                  className="text-gray-500 text-sm hover:text-gray-400"
                >
                  Skip for now →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tutorial Games Section */}
        <section className="mb-8">
          <h2 className="text-xl font-display text-white mb-4 flex items-center gap-2">
            <span>🎮</span> Warm-Up Games
            <span className="text-sm font-normal text-gray-400">(Play before your quiz!)</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TUTORIAL_GAMES.map(game => (
              <button
                key={game.id}
                onClick={() => handleGameSelect(game.id)}
                className="glass-card p-6 text-left transition-all duration-300
                         hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98]"
                style={{ 
                  borderColor: `${game.color}50`,
                  boxShadow: `0 4px 20px ${game.color}20`
                }}
              >
                <div className="text-4xl mb-3">{game.emoji}</div>
                <h3 className="text-lg font-bold text-white mb-1">{game.name}</h3>
                <p className="text-gray-400 text-sm mb-3">{game.description}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>⏱️ {game.duration}</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Start Quiz Button */}
        <section className="mb-8">
          <button
            onClick={handleStartQuiz}
            className="w-full glass-card p-8 text-center transition-all duration-300
                     hover:scale-[1.01] active:scale-[0.99]"
            style={{ 
              borderColor: playerColor,
              boxShadow: `0 0 30px ${playerColor}30`
            }}
          >
            <div className="text-5xl mb-4">🎯</div>
            <h2 className="text-2xl font-display text-white mb-2">Start Quiz</h2>
            <p className="text-gray-400">15 questions • Adaptive difficulty</p>
            <div 
              className="mt-4 inline-block px-8 py-3 rounded-xl font-bold text-white"
              style={{ backgroundColor: playerColor }}
            >
              Let's Go! →
            </div>
          </button>
        </section>

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <section>
            <h2 className="text-xl font-display text-white mb-4">📊 Recent Quizzes</h2>
            <div className="space-y-3">
              {recentSessions.map(session => (
                <div key={session.id} className="glass-card p-4 flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">
                      {new Date(session.completed_at).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {session.correct_answers}/{session.total_questions} correct
                    </p>
                  </div>
                  <div 
                    className="text-2xl font-bold"
                    style={{ 
                      color: session.score_percentage >= 70 ? '#10b981' : 
                             session.score_percentage >= 50 ? '#f59e0b' : '#ef4444'
                    }}
                  >
                    {Math.round(session.score_percentage)}%
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Skill Levels */}
        {currentPlayer?.skills?.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xl font-display text-white mb-4">📈 Your Skills</h2>
            <div className="glass-card p-4 space-y-4">
              {currentPlayer.skills.map(skill => (
                <div key={skill.skill}>
                  <div className="flex justify-between mb-1">
                    <span className="text-white">{skill.skill}</span>
                    <span className="text-gray-400">{Math.round(skill.current_score)}%</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${skill.current_score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
