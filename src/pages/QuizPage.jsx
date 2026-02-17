import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCapture } from '../contexts/CaptureContext'
import { supabase, withRetry } from '../utils/supabase'

export default function QuizPage() {
  const { currentPlayer } = useAuth()
  const { logQuizAnswer, captureData } = useCapture()
  const navigate = useNavigate()
  
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [answers, setAnswers] = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [skillDifficulty, setSkillDifficulty] = useState({})

  const playerColor = currentPlayer?.name === 'Krishna' ? '#3b82f6' : 
                      currentPlayer?.name === 'Balarama' ? '#10b981' : '#9b4dca'

  // Initialize quiz
  useEffect(() => {
    initializeQuiz()
  }, [])

  async function initializeQuiz() {
    try {
      // Load questions
      const { data: allQuestions, error } = await supabase
        .from('kb_questions')
        .select('*')
        .order('id')
      
      if (error) throw error

      // Shuffle and take 15
      const shuffled = allQuestions.sort(() => Math.random() - 0.5).slice(0, 15)
      setQuestions(shuffled)

      // Initialize skill difficulties at 3
      const skills = {}
      shuffled.forEach(q => {
        if (!skills[q.skill]) skills[q.skill] = 3
      })
      setSkillDifficulty(skills)

      // Create session
      const { data: session, error: sessionError } = await supabase
        .from('kb_quiz_sessions')
        .insert({
          player_name: currentPlayer?.name,
          total_questions: 15,
          correct_answers: 0,
          score_percentage: 0,
          skill_breakdown: {},
          answers: [],
          status: 'in_progress'
        })
        .select()
        .single()

      if (sessionError) throw sessionError
      setSessionId(session.id)

      captureData('quiz_initialized', { 
        session_id: session.id, 
        question_count: shuffled.length 
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

    // Record answer
    const answerRecord = {
      questionId: currentQuestion.id,
      skill: currentQuestion.skill,
      difficulty: currentQuestion.difficulty,
      selectedIndex: selectedAnswer,
      isCorrect,
      timestamp: new Date().toISOString()
    }

    const newAnswers = [...answers, answerRecord]
    setAnswers(newAnswers)

    // Log to capture system
    await logQuizAnswer(currentPlayer?.name, currentQuestion.id, selectedAnswer, isCorrect)

    // Update session in Supabase (with retry)
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
      // Data is captured locally via logQuizAnswer
    }

    // Wait for feedback, then advance
    setTimeout(() => {
      setShowFeedback(false)
      setSelectedAnswer(null)
      
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1)
      } else {
        finishQuiz(newAnswers)
      }
    }, 1500)
  }

  async function finishQuiz(finalAnswers) {
    const correctCount = finalAnswers.filter(a => a.isCorrect).length
    const percentage = (correctCount / finalAnswers.length) * 100

    // Calculate skill breakdown
    const breakdown = {}
    finalAnswers.forEach(a => {
      if (!breakdown[a.skill]) breakdown[a.skill] = { total: 0, correct: 0 }
      breakdown[a.skill].total++
      if (a.isCorrect) breakdown[a.skill].correct++
    })

    // Save final results
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

      // Update skill mastery
      for (const [skill, data] of Object.entries(breakdown)) {
        const skillPct = (data.correct / data.total) * 100
        await supabase
          .from('kb_skill_mastery')
          .update({
            current_score: skillPct,
            needs_review: skillPct < 70,
            last_assessed_at: new Date().toISOString()
          })
          .eq('player_name', currentPlayer?.name)
          .eq('skill', skill)
      }
    } catch (error) {
      console.error('Failed to save results:', error)
    }

    // Navigate to results
    navigate('/results', { 
      state: { 
        sessionId, 
        score: correctCount, 
        total: finalAnswers.length,
        percentage,
        breakdown 
      } 
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">📚</div>
          <p className="text-gray-400">Loading questions...</p>
        </div>
      </div>
    )
  }

  if (!currentQuestion) {
    return null
  }

  const progress = ((currentIndex + 1) / questions.length) * 100

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <header className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-400">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <span className="px-3 py-1 rounded-full bg-white/10 text-sm">
              {currentQuestion.skill}
            </span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </header>

        {/* Question Card */}
        <div className="glass-card p-8 mb-6">
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
                } else if (index === selectedAnswer && !isCorrect(index)) {
                  optionClass += ' incorrect'
                }
              } else if (index === selectedAnswer) {
                optionClass += ' selected'
              }

              return (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={showFeedback}
                  className={`${optionClass} w-full text-left`}
                >
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 mr-3 text-sm font-bold">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="text-white">{option}</span>
                </button>
              )
            })}
          </div>

          {/* Feedback */}
          {showFeedback && (
            <div className={`mt-6 p-4 rounded-xl ${
              selectedAnswer === currentQuestion.correct_index 
                ? 'bg-emerald-500/20 border border-emerald-500/50' 
                : 'bg-red-500/20 border border-red-500/50'
            }`}>
              <p className="font-bold mb-1">
                {selectedAnswer === currentQuestion.correct_index ? '✓ Correct!' : '✗ Not quite!'}
              </p>
              {currentQuestion.explanation && (
                <p className="text-sm text-gray-300">{currentQuestion.explanation}</p>
              )}
            </div>
          )}
        </div>

        {/* Submit Button */}
        {!showFeedback && (
          <button
            onClick={handleSubmit}
            disabled={selectedAnswer === null}
            className="w-full py-4 rounded-xl font-bold text-lg transition-all
                     disabled:bg-white/10 disabled:text-gray-500"
            style={{ 
              backgroundColor: selectedAnswer !== null ? playerColor : undefined 
            }}
          >
            {currentIndex < questions.length - 1 ? 'Submit Answer' : 'Finish Quiz'}
          </button>
        )}

        {/* Score Preview */}
        <div className="mt-4 text-center text-gray-500">
          Current Score: {answers.filter(a => a.isCorrect).length}/{answers.length}
        </div>
      </div>
    </div>
  )

  function isCorrect(index) {
    return index === currentQuestion.correct_index
  }
}
