import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCapture } from '../contexts/CaptureContext'
import { supabase, withRetry } from '../utils/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { selectAdaptiveQuestions } from '../utils/adaptiveQuizEngine'

export default function QuizPage() {
  const { currentPlayer } = useAuth()
  const { logQuizAnswer, captureData } = useCapture()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [answers, setAnswers] = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [streak, setStreak] = useState(0)
  const [showStreak, setShowStreak] = useState(false)

  const quizParam = searchParams.get('quiz') || 'daily'
  const isAdaptive = quizParam === 'daily'
  const quizNumber = isAdaptive ? 0 : parseInt(quizParam)

  const playerColor = currentPlayer?.name === 'Krishna' ? '#3b82f6' :
                      currentPlayer?.name === 'Balarama' ? '#10b981' : '#9b4dca'

  useEffect(() => {
    initializeQuiz()
  }, [])

  async function initializeQuiz() {
    try {
      let selectedQuestions = []

      if (isAdaptive) {
        // ADAPTIVE MODE: Load full bank + mastery data, then select intelligently
        const [questionsRes, masteryRes, sessionsRes] = await Promise.all([
          supabase.from('kb_questions').select('*').order('id'),
          supabase.from('kb_skill_mastery').select('*').eq('player_name', currentPlayer?.name),
          supabase.from('kb_quiz_sessions').select('*')
            .eq('player_name', currentPlayer?.name)
            .eq('status', 'completed')
            .order('completed_at', { ascending: false })
            .limit(3)
        ])

        const allQuestions = questionsRes.data || []
        const skillMastery = masteryRes.data || []
        const recentSessions = sessionsRes.data || []

        selectedQuestions = selectAdaptiveQuestions(
          currentPlayer?.name, allQuestions, skillMastery, recentSessions
        )
      } else {
        // NUMBERED MODE: Filter by quiz_number (existing behavior)
        const { data: allQuestions, error } = await supabase
          .from('kb_questions')
          .select('*')
          .eq('quiz_number', quizNumber)
          .order('id')

        if (error) throw error

        if (!allQuestions || allQuestions.length === 0) {
          const { data: fallback } = await supabase
            .from('kb_questions')
            .select('*')
            .order('id')

          selectedQuestions = (fallback || []).sort(() => Math.random() - 0.5).slice(0, 15)
        } else {
          selectedQuestions = allQuestions.sort(() => Math.random() - 0.5).slice(0, 15)
        }
      }

      setQuestions(selectedQuestions)

      // Create session
      const { data: session, error: sessionError } = await supabase
        .from('kb_quiz_sessions')
        .insert({
          player_name: currentPlayer?.name,
          total_questions: selectedQuestions.length,
          correct_answers: 0,
          score_percentage: 0,
          skill_breakdown: {},
          answers: [],
          status: 'in_progress',
          quiz_number: isAdaptive ? 0 : quizNumber,
          quiz_mode: isAdaptive ? 'adaptive' : 'numbered',
          question_ids: selectedQuestions.map(q => q.id)
        })
        .select()
        .single()

      if (sessionError) throw sessionError
      setSessionId(session.id)

      captureData('quiz_initialized', {
        session_id: session.id,
        quiz_number: isAdaptive ? 'daily' : quizNumber,
        quiz_mode: isAdaptive ? 'adaptive' : 'numbered',
        question_count: selectedQuestions.length,
        question_ids: selectedQuestions.map(q => q.id)
      }, currentPlayer?.name)

    } catch (error) {
      console.error('Failed to initialize quiz:', error)
      captureData('quiz_init_error', { error: error.message }, currentPlayer?.name)
    } finally {
      setIsLoading(false)
    }
  }

  const currentQuestion = questions[currentIndex]

  const handleAnswerSelect = (index) => {
    if (showFeedback) return
    setSelectedAnswer(index)
  }

  const handleSubmit = async () => {
    if (selectedAnswer === null || showFeedback) return

    const isCorrect = selectedAnswer === currentQuestion.correct_index
    setShowFeedback(true)

    // Streak tracking
    if (isCorrect) {
      const newStreak = streak + 1
      setStreak(newStreak)
      if (newStreak >= 3) {
        setShowStreak(true)
        setTimeout(() => setShowStreak(false), 1200)
      }
    } else {
      setStreak(0)
    }

    const answerRecord = {
      questionId: currentQuestion.id,
      skill: currentQuestion.skill,
      subSkill: currentQuestion.sub_skill,
      difficulty: currentQuestion.difficulty,
      selectedIndex: selectedAnswer,
      isCorrect,
      timestamp: new Date().toISOString()
    }

    const newAnswers = [...answers, answerRecord]
    setAnswers(newAnswers)

    await logQuizAnswer(currentPlayer?.name, currentQuestion.id, selectedAnswer, isCorrect)

    try {
      await withRetry(async () => {
        const correctCount = newAnswers.filter(a => a.isCorrect).length
        const { error } = await supabase
          .from('kb_quiz_sessions')
          .update({
            correct_answers: correctCount,
            score_percentage: (correctCount / newAnswers.length) * 100,
            answers: newAnswers
          })
          .eq('id', sessionId)

        if (error) throw error
      })
    } catch (error) {
      console.error('Failed to save answer:', error)
    }

    setTimeout(() => {
      setShowFeedback(false)
      setSelectedAnswer(null)

      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1)
      } else {
        finishQuiz(newAnswers)
      }
    }, 1800)
  }

  async function finishQuiz(finalAnswers) {
    const correctCount = finalAnswers.filter(a => a.isCorrect).length
    const percentage = (correctCount / finalAnswers.length) * 100

    const breakdown = {}
    finalAnswers.forEach(a => {
      if (!breakdown[a.skill]) breakdown[a.skill] = { total: 0, correct: 0 }
      breakdown[a.skill].total++
      if (a.isCorrect) breakdown[a.skill].correct++
    })

    try {
      await withRetry(async () => {
        const { error } = await supabase
          .from('kb_quiz_sessions')
          .update({
            completed_at: new Date().toISOString(),
            correct_answers: correctCount,
            score_percentage: percentage,
            skill_breakdown: breakdown,
            answers: finalAnswers,
            status: 'completed'
          })
          .eq('id', sessionId)

        if (error) throw error
      })

      // Update skill mastery (each update independent — don't let one failure block others)
      for (const [skill, data] of Object.entries(breakdown)) {
        try {
          const skillPct = (data.correct / data.total) * 100
          await withRetry(async () => {
            const { error } = await supabase
              .from('kb_skill_mastery')
              .update({
                current_score: skillPct,
                needs_review: skillPct < 70,
                last_assessed_at: new Date().toISOString(),
                ...(isAdaptive ? {
                  recent_accuracy: skillPct,
                  recommended_difficulty: skillPct >= 80 ? 4 : skillPct >= 60 ? 3 : skillPct >= 40 ? 2 : 1
                } : {})
              })
              .eq('player_name', currentPlayer?.name)
              .eq('skill', skill)
            if (error) throw error
          })
        } catch (err) {
          console.error(`Failed to update skill mastery for ${skill}:`, err)
        }
      }

      // Update sub-skill mastery (for adaptive engine accuracy)
      if (isAdaptive) {
        const subSkillUpdates = {}
        finalAnswers.forEach(a => {
          const key = `${a.skill}::${a.subSkill || 'General'}`
          if (!subSkillUpdates[key]) subSkillUpdates[key] = { skill: a.skill, subSkill: a.subSkill || 'General', total: 0, correct: 0 }
          subSkillUpdates[key].total++
          if (a.isCorrect) subSkillUpdates[key].correct++
        })

        for (const update of Object.values(subSkillUpdates)) {
          try {
            const { data: existing } = await supabase
              .from('kb_subskill_mastery')
              .select('id, attempts, correct')
              .eq('player_name', currentPlayer?.name)
              .eq('skill', update.skill)
              .eq('sub_skill', update.subSkill)
              .single()

            if (existing) {
              const newAttempts = existing.attempts + update.total
              const newCorrect = existing.correct + update.correct
              const ratio = newCorrect / newAttempts
              await withRetry(async () => {
                const { error } = await supabase
                  .from('kb_subskill_mastery')
                  .update({
                    attempts: newAttempts,
                    correct: newCorrect,
                    mastery_percentage: ratio * 100,
                    mastery_stage: ratio >= 0.9 ? 5 : ratio >= 0.7 ? 4 : ratio >= 0.5 ? 3 : ratio >= 0.3 ? 2 : 1,
                    last_attempt_at: new Date().toISOString()
                  })
                  .eq('id', existing.id)
                if (error) throw error
              })
            } else {
              const ratio = update.correct / update.total
              await withRetry(async () => {
                const { error } = await supabase
                  .from('kb_subskill_mastery')
                  .insert({
                    player_name: currentPlayer?.name,
                    skill: update.skill,
                    sub_skill: update.subSkill,
                    attempts: update.total,
                    correct: update.correct,
                    mastery_percentage: ratio * 100,
                    mastery_stage: ratio >= 0.9 ? 5 : ratio >= 0.7 ? 4 : ratio >= 0.5 ? 3 : ratio >= 0.3 ? 2 : 1,
                    last_attempt_at: new Date().toISOString()
                  })
                if (error) throw error
              })
            }
          } catch (err) {
            console.error(`Failed to update sub-skill mastery for ${update.skill}/${update.subSkill}:`, err)
          }
        }
      }
    } catch (error) {
      console.error('Failed to save results:', error)
    }

    navigate('/results', {
      state: {
        sessionId,
        score: correctCount,
        total: finalAnswers.length,
        percentage,
        breakdown,
        quizNumber: isAdaptive ? 'daily' : quizNumber,
        isAdaptive
      }
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="text-5xl mb-4 animate-bounce">{isAdaptive ? '🧠' : '📚'}</div>
          <p className="text-gray-400">
            {isAdaptive ? 'Building your personalized quiz...' : `Loading Quiz ${quizNumber}...`}
          </p>
        </motion.div>
      </div>
    )
  }

  if (!currentQuestion) {
    return null
  }

  const progress = ((currentIndex + 1) / questions.length) * 100
  const correctSoFar = answers.filter(a => a.isCorrect).length

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <header className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm ${
                isAdaptive
                  ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-300 border border-purple-500/30'
                  : 'bg-white/10 text-gray-300'
              }`}>
                {isAdaptive ? 'Daily Quiz' : `Quiz ${quizNumber}`}
              </span>
              <span className="px-3 py-1 rounded-full bg-white/10 text-sm">
                {currentQuestion.skill.split(' ')[0]}
              </span>
            </div>
          </div>
          <div className="progress-bar">
            <motion.div
              className="progress-fill"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </header>

        {/* Streak notification */}
        <AnimatePresence>
          {showStreak && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.8 }}
              className="text-center mb-4"
            >
              <span className="inline-block px-4 py-2 rounded-full bg-gradient-to-r from-yellow-500/30 to-orange-500/30 border border-yellow-500/50 text-yellow-300 font-bold">
                🔥 {streak} in a row!
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="glass-card p-8 mb-6"
          >
            {/* Difficulty indicator */}
            <div className="flex items-center gap-1 mb-4">
              {[1,2,3,4,5].map(d => (
                <div key={d} className={`w-2 h-2 rounded-full ${
                  d <= currentQuestion.difficulty ? 'bg-yellow-400' : 'bg-white/10'
                }`} />
              ))}
              <span className="text-xs text-gray-500 ml-2">
                Level {currentQuestion.difficulty}
              </span>
            </div>

            <p className="text-xl md:text-2xl text-white leading-relaxed mb-8">
              {currentQuestion.text}
            </p>

            {/* Options */}
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => {
                let optionClass = 'quiz-option'

                if (showFeedback) {
                  if (index === currentQuestion.correct_index) {
                    optionClass += ' correct'
                  } else if (index === selectedAnswer && index !== currentQuestion.correct_index) {
                    optionClass += ' incorrect'
                  }
                } else if (index === selectedAnswer) {
                  optionClass += ' selected'
                }

                return (
                  <motion.button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={showFeedback}
                    className={`${optionClass} w-full text-left`}
                    whileHover={!showFeedback ? { scale: 1.01 } : {}}
                    whileTap={!showFeedback ? { scale: 0.99 } : {}}
                  >
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 mr-3 text-sm font-bold">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="text-white">{option}</span>
                  </motion.button>
                )
              })}
            </div>

            {/* Feedback */}
            <AnimatePresence>
              {showFeedback && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-6 p-4 rounded-xl ${
                    selectedAnswer === currentQuestion.correct_index
                      ? 'bg-emerald-500/20 border border-emerald-500/50'
                      : 'bg-red-500/20 border border-red-500/50'
                  }`}
                >
                  <p className="font-bold mb-1">
                    {selectedAnswer === currentQuestion.correct_index ? '✓ Correct!' : '✗ Not quite!'}
                  </p>
                  {currentQuestion.explanation && (
                    <p className="text-sm text-gray-300">{currentQuestion.explanation}</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>

        {/* Submit Button */}
        {!showFeedback && (
          <motion.button
            onClick={handleSubmit}
            disabled={selectedAnswer === null}
            className="w-full py-4 rounded-xl font-bold text-lg transition-all
                     disabled:bg-white/10 disabled:text-gray-500"
            style={{
              backgroundColor: selectedAnswer !== null ? playerColor : undefined
            }}
            whileHover={selectedAnswer !== null ? { scale: 1.01 } : {}}
            whileTap={selectedAnswer !== null ? { scale: 0.99 } : {}}
          >
            {currentIndex < questions.length - 1 ? 'Submit Answer' : 'Finish Quiz'}
          </motion.button>
        )}

        {/* Score Preview */}
        <div className="mt-4 text-center text-gray-500">
          Score: {correctSoFar}/{answers.length}
          {streak >= 2 && <span className="ml-2 text-yellow-400">🔥 {streak} streak</span>}
        </div>
      </div>
    </div>
  )
}
