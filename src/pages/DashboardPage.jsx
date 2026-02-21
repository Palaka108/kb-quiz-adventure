import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCapture } from '../contexts/CaptureContext'
import { supabase } from '../utils/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { getDailyFocusSummary } from '../utils/adaptiveQuizEngine'

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

// All numbered quizzes with metadata
const QUIZ_CATALOG = [
  {
    number: 5,
    title: 'Quiz 5: Foundations',
    description: 'Fractions, decimals & word problems basics',
    questionCount: 15,
    isLegacy: true
  },
  {
    number: 6,
    title: 'Quiz 6: Level Up',
    description: 'Harder fractions & multi-step problems',
    questionCount: 10,
    isLegacy: true
  },
  {
    number: 7,
    title: 'Quiz 7: Decimal Master',
    description: 'Multipliers, geometric patterns & tricky decimals',
    questionCount: 15,
    isLegacy: true
  }
]

export default function DashboardPage() {
  const { currentPlayer, logout, refreshPlayer } = useAuth()
  const { logAction } = useCapture()
  const navigate = useNavigate()
  const [skillsNeedingReview, setSkillsNeedingReview] = useState([])
  const [recentSessions, setRecentSessions] = useState([])
  const [quizHistory, setQuizHistory] = useState({})
  const [showLearningPrompt, setShowLearningPrompt] = useState(false)
  const [showQuizPicker, setShowQuizPicker] = useState(false)
  const [focusAreas, setFocusAreas] = useState([])
  const [dailyQuizCount, setDailyQuizCount] = useState(0)
  const [lastDailyScore, setLastDailyScore] = useState(null)
  const [inProgressSession, setInProgressSession] = useState(null)

  const playerColor = currentPlayer?.name === 'Krishna' ? '#3b82f6' :
                      currentPlayer?.name === 'Balarama' ? '#10b981' : '#9b4dca'

  useEffect(() => {
    loadPlayerData()
  }, [currentPlayer])

  async function loadPlayerData() {
    if (!currentPlayer) return

    const { data: skills } = await supabase
      .from('kb_skill_mastery')
      .select('*')
      .eq('player_name', currentPlayer.name)
      .eq('needs_review', true)

    setSkillsNeedingReview(skills || [])
    setShowLearningPrompt((skills?.length || 0) > 0)

    // Get all skill mastery for adaptive engine focus areas
    const { data: allSkills } = await supabase
      .from('kb_skill_mastery')
      .select('*')
      .eq('player_name', currentPlayer.name)

    if (allSkills && allSkills.length > 0) {
      const focus = getDailyFocusSummary(allSkills)
      setFocusAreas(focus)
    }

    // Check for in-progress session (for resume button)
    const { data: activeSessions } = await supabase
      .from('kb_quiz_sessions')
      .select('id, started_at, answers, total_questions, question_ids, quiz_mode, quiz_number')
      .eq('player_name', currentPlayer.name)
      .eq('status', 'in_progress')
      .order('started_at', { ascending: false })
      .limit(1)

    if (activeSessions?.length > 0) {
      const session = activeSessions[0]
      const twoHoursMs = 2 * 60 * 60 * 1000
      if (Date.now() - new Date(session.started_at).getTime() < twoHoursMs && session.question_ids?.length > 0) {
        setInProgressSession(session)
      } else {
        await supabase.from('kb_quiz_sessions').update({ status: 'abandoned' }).eq('id', session.id)
        setInProgressSession(null)
      }
    } else {
      setInProgressSession(null)
    }

    // Get recent completed sessions
    const { data: sessions } = await supabase
      .from('kb_quiz_sessions')
      .select('*')
      .eq('player_name', currentPlayer.name)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(20)

    setRecentSessions(sessions || [])

    // Build quiz history: best score per quiz_number
    const history = {}
    ;(sessions || []).forEach(s => {
      const qn = s.quiz_number || 'unknown'
      if (!history[qn] || s.score_percentage > history[qn].score_percentage) {
        history[qn] = s
      }
    })
    setQuizHistory(history)

    // Count adaptive quiz sessions (quiz_number = 0 or quiz_mode = 'adaptive')
    const dailySessions = (sessions || []).filter(s =>
      s.quiz_number === 0 || s.quiz_mode === 'adaptive'
    )
    setDailyQuizCount(dailySessions.length)
    if (dailySessions.length > 0) {
      setLastDailyScore(Math.round(dailySessions[0].score_percentage))
    }
  }

  const handleGameSelect = (gameId) => {
    logAction('game_started', { game_id: gameId }, currentPlayer?.name)
    navigate(`/tutorial/${gameId}`)
  }

  const handleStartQuiz = (quizNum) => {
    logAction('quiz_started', { quiz_number: quizNum }, currentPlayer?.name)
    navigate(`/quiz?quiz=${quizNum}`)
  }

  const handleStartDailyQuiz = () => {
    logAction('daily_quiz_started', {}, currentPlayer?.name)
    navigate('/quiz?quiz=daily')
  }

  const handleStartLearning = (skill) => {
    logAction('learning_started', { skill }, currentPlayer?.name)
    navigate(`/learning/${encodeURIComponent(skill)}`)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  // Greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  // Focus message for daily quiz CTA
  const getFocusMessage = () => {
    const weakAreas = focusAreas.filter(f => f.priority === 'high')
    if (weakAreas.length > 0) {
      return `Today's focus: ${weakAreas.map(a => a.skill).join(' & ')}`
    }
    const mediumAreas = focusAreas.filter(f => f.priority === 'medium')
    if (mediumAreas.length > 0) {
      return `Building your ${mediumAreas.map(a => a.skill).join(' & ')} skills`
    }
    return 'A personalized quiz just for you!'
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
                {getGreeting()}, {currentPlayer?.name}! 👋
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
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
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
                      {skill.skill.split(' ')[0]} ({Math.round(skill.current_score || skill.first_attempt_score)}%)
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
          </motion.div>
        )}

        {/* RESUME QUIZ — shown when there's an in-progress session */}
        {inProgressSession && (
          <section className="mb-6">
            <motion.button
              onClick={() => {
                logAction('quiz_resumed_from_dashboard', {
                  session_id: inProgressSession.id,
                  answers_so_far: inProgressSession.answers?.length || 0
                }, currentPlayer?.name)
                const mode = inProgressSession.quiz_mode === 'adaptive' || inProgressSession.quiz_number === 0
                  ? 'daily' : inProgressSession.quiz_number
                navigate(`/quiz?quiz=${mode}`)
              }}
              className="w-full glass-card p-6 text-center transition-all duration-300
                       hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden"
              style={{
                borderColor: '#f59e0b',
                boxShadow: '0 0 30px rgba(245, 158, 11, 0.3)'
              }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="text-4xl mb-3">🔄</div>
              <h2 className="text-xl font-display text-white mb-1">Resume Quiz</h2>
              <p className="text-gray-400 text-sm mb-3">
                {inProgressSession.answers?.length || 0} of {inProgressSession.total_questions} answered — pick up where you left off
              </p>
              <div
                className="inline-block px-6 py-2 rounded-xl font-bold text-white"
                style={{ backgroundColor: '#f59e0b' }}
              >
                Continue →
              </div>
              <div className="mt-3 w-full bg-white/10 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${((inProgressSession.answers?.length || 0) / inProgressSession.total_questions) * 100}%`,
                    backgroundColor: '#f59e0b'
                  }}
                />
              </div>
            </motion.button>
          </section>
        )}

        {/* DAILY QUIZ — Big Hero CTA */}
        <section className="mb-8">
          <motion.button
            onClick={handleStartDailyQuiz}
            className="w-full glass-card p-8 text-center transition-all duration-300
                     hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden"
            style={{
              borderColor: playerColor,
              boxShadow: `0 0 30px ${playerColor}30`
            }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            {/* Adaptive badge */}
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-xs font-bold text-white">
                SMART QUIZ
              </span>
            </div>

            <div className="text-5xl mb-4">🧠</div>
            <h2 className="text-2xl font-display text-white mb-2">Daily Quiz</h2>
            <p className="text-gray-400 mb-3">{getFocusMessage()}</p>

            {/* Focus area pills */}
            {focusAreas.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                {focusAreas.map(area => (
                  <span
                    key={area.skill}
                    className={`px-2 py-1 rounded-full text-xs ${
                      area.priority === 'high'
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                        : area.priority === 'medium'
                        ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {area.skill} {area.score}%
                  </span>
                ))}
              </div>
            )}

            <div
              className="mt-2 inline-block px-8 py-3 rounded-xl font-bold text-white"
              style={{ backgroundColor: playerColor }}
            >
              Start Daily Quiz →
            </div>

            {/* Stats line */}
            <div className="text-gray-500 text-sm mt-3 flex items-center justify-center gap-4">
              {lastDailyScore !== null && (
                <span>Last score: {lastDailyScore}%</span>
              )}
              {dailyQuizCount > 0 && (
                <span>{dailyQuizCount} quizzes completed</span>
              )}
            </div>
          </motion.button>
        </section>

        {/* Tutorial Games Section */}
        <section className="mb-8">
          <h2 className="text-xl font-display text-white mb-4 flex items-center gap-2">
            <span>🎮</span> Warm-Up Games
            <span className="text-sm font-normal text-gray-400">(Play before your quiz!)</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TUTORIAL_GAMES.map((game, i) => (
              <motion.button
                key={game.id}
                onClick={() => handleGameSelect(game.id)}
                className="glass-card p-6 text-left transition-all duration-300"
                style={{
                  borderColor: `${game.color}50`,
                  boxShadow: `0 4px 20px ${game.color}20`
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="text-4xl mb-3">{game.emoji}</div>
                <h3 className="text-lg font-bold text-white mb-1">{game.name}</h3>
                <p className="text-gray-400 text-sm mb-3">{game.description}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>⏱️ {game.duration}</span>
                </div>
              </motion.button>
            ))}
          </div>
        </section>

        {/* Quiz History — Previous Numbered Quizzes */}
        <section className="mb-8">
          <button
            onClick={() => setShowQuizPicker(!showQuizPicker)}
            className="flex items-center gap-2 text-xl font-display text-white mb-4"
          >
            <span>📋</span> Previous Quizzes
            <span className="text-sm text-gray-400">{showQuizPicker ? '▼' : '▶'}</span>
          </button>

          <AnimatePresence>
            {showQuizPicker && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-3">
                  {QUIZ_CATALOG.map(quiz => {
                    const bestSession = quizHistory[quiz.number]
                    const bestScore = bestSession ? Math.round(bestSession.score_percentage) : null

                    return (
                      <motion.div
                        key={quiz.number}
                        className="glass-card p-4 flex items-center gap-4 cursor-pointer transition-all"
                        onClick={() => handleStartQuiz(quiz.number)}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold
                                      ${bestScore !== null && bestScore >= 70 ? 'bg-emerald-500/20 text-emerald-400' :
                                        bestScore !== null ? 'bg-yellow-500/20 text-yellow-400' :
                                        'bg-white/10 text-gray-400'}`}
                        >
                          {bestScore !== null && bestScore >= 70 ? '✓' :
                           bestScore !== null ? `${bestScore}%` :
                           quiz.number}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-white font-bold">{quiz.title}</h3>
                          </div>
                          <p className="text-gray-400 text-sm">{quiz.description}</p>
                          {bestSession && (
                            <p className="text-gray-500 text-xs mt-1">
                              Best: {bestScore}% • {new Date(bestSession.completed_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>

                        <div className="text-gray-400 text-2xl">→</div>
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <section>
            <h2 className="text-xl font-display text-white mb-4">📊 Recent Quizzes</h2>
            <div className="space-y-3">
              {recentSessions.slice(0, 5).map(session => (
                <div key={session.id} className="glass-card p-4 flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">
                      {session.quiz_mode === 'adaptive' || session.quiz_number === 0
                        ? 'Daily Quiz'
                        : session.quiz_number ? `Quiz ${session.quiz_number}` : 'Quiz'
                      } — {new Date(session.completed_at).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {session.correct_answers}/{session.total_questions} correct
                      {(session.quiz_mode === 'adaptive' || session.quiz_number === 0) && (
                        <span className="ml-2 text-purple-400 text-xs">🧠 adaptive</span>
                      )}
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
