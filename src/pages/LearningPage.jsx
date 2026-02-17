import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCapture } from '../contexts/CaptureContext'
import { supabase } from '../utils/supabase'

// Learning content by skill
const LEARNING_CONTENT = {
  'Word Problems & Patterns': {
    title: 'Word Problems Mastery',
    emoji: '🔢',
    steps: [
      {
        type: 'intro',
        title: 'Hey there! 👋',
        content: `You're actually really good at fractions - 80% on first try! But word problems tripped you up. Here's the thing: **you knew the math, the questions were just confusing**. Let me show you how to decode them!`
      },
      {
        type: 'lesson',
        title: 'The "Total" Trap 🪤',
        problem: '"5 coins day 1, 10 coins day 2, 15 coins day 3... How many TOTAL after 6 days?"',
        mistake: 'Finding Day 6 value (30)',
        insight: '"TOTAL" means ADD ALL days together!',
        solution: '5 + 10 + 15 + 20 + 25 + 30 = 105'
      },
      {
        type: 'quiz',
        question: 'Pattern: 10, 20, 30, 40... What is the TOTAL of the first 5 numbers?',
        options: ['50', '100', '150', '200'],
        correct: 2,
        explanation: '10+20+30+40+50 = 150. "Total" = add them all!'
      },
      {
        type: 'lesson',
        title: 'Expression Building 🧮',
        problem: '"15 XP base + 5 XP per pet. Expression for p pets?"',
        insight: 'Find the BASE (stays same) and RATE (multiplies variable)',
        solution: 'Base = 15, Rate = 5 → Answer: 15 + 5p'
      },
      {
        type: 'quiz',
        question: 'A game gives 20 coins to start, plus 8 coins per level. Expression for L levels?',
        options: ['20L + 8', '8L + 20', '28L', '20 × 8L'],
        correct: 1,
        explanation: 'Base=20, Rate=8 → 20 + 8L (same as 8L + 20)'
      },
      {
        type: 'lesson',
        title: 'Pattern Types 📈',
        content: `**Arithmetic (Adding):** 5, 10, 15, 20... (+5 each time)
        
**Geometric (Multiplying):** 2, 6, 18, 54... (×3 each time)

First identify WHICH type, then solve!`
      },
      {
        type: 'quiz',
        question: 'Pattern: 3, 9, 27, 81... What comes next?',
        options: ['89 (adding 8)', '108 (adding 27)', '162 (×2)', '243 (×3)'],
        correct: 3,
        explanation: 'Each × 3: 3→9→27→81→243. Geometric pattern!'
      }
    ]
  },
  'Fractions & Mixed Numbers': {
    title: 'Fractions Mastery',
    emoji: '🍕',
    steps: [
      {
        type: 'intro',
        title: 'Hey! 👋',
        content: `Word Problems? Crushed it at 80%! But fractions tripped you up. Let me show you some visual tricks that make these problems way easier!`
      },
      {
        type: 'lesson',
        title: 'Improper → Mixed Numbers 🍕',
        problem: 'Convert 11/4 to a mixed number',
        insight: 'Think PIZZA! 11 slices, 4 per pizza. How many whole pizzas?',
        solution: '11 ÷ 4 = 2 remainder 3 → 2¾'
      },
      {
        type: 'quiz',
        question: 'Convert 15/4 to a mixed number',
        options: ['3¼', '3¾', '4¼', '4¾'],
        correct: 1,
        explanation: '15÷4 = 3 remainder 3 → 3¾'
      },
      {
        type: 'lesson',
        title: 'Adding Mixed Numbers',
        problem: '1½ + 2¼ = ?',
        insight: 'Convert to same denominator, then add!',
        solution: '1²/₄ + 2¼ = 3³/₄'
      },
      {
        type: 'quiz',
        question: 'What is 2⅓ + 1½?',
        options: ['3⅚', '3⅝', '3⅔', '4⅙'],
        correct: 0,
        explanation: '2²/₆ + 1³/₆ = 3⁵/₆'
      }
    ]
  },
  'Decimal Operations': {
    title: 'Decimals Mastery',
    emoji: '💰',
    steps: [
      {
        type: 'intro',
        title: 'Let\'s Master Decimals! 💰',
        content: `Decimals are just fractions in disguise! Once you see the pattern, they become super easy.`
      },
      {
        type: 'lesson',
        title: 'Adding Decimals 📐',
        problem: '6.4 + 3.75 = ?',
        insight: 'LINE UP THE DECIMAL POINTS! Add zeros to match.',
        solution: '6.40 + 3.75 = 10.15'
      },
      {
        type: 'quiz',
        question: 'What is 8.5 + 4.25?',
        options: ['12.30', '12.75', '12.70', '13.25'],
        correct: 1,
        explanation: '8.50 + 4.25 = 12.75'
      },
      {
        type: 'lesson',
        title: 'Multiplying by 1.2 (20% Boost) ✖️',
        problem: '15 × 1.2 = ?',
        insight: '1.2 = 1 (original) + 0.2 (20% bonus)',
        solution: '15 + (15 × 0.2) = 15 + 3 = 18'
      },
      {
        type: 'quiz',
        question: '25 XP with a 1.2x multiplier = ?',
        options: ['27', '30', '32', '37.5'],
        correct: 1,
        explanation: '25 + (25 × 0.2) = 25 + 5 = 30'
      }
    ]
  }
}

export default function LearningPage() {
  const { skill: encodedSkill } = useParams()
  const skill = decodeURIComponent(encodedSkill)
  const navigate = useNavigate()
  const { currentPlayer } = useAuth()
  const { captureData } = useCapture()
  
  const [currentStep, setCurrentStep] = useState(0)
  const [quizAnswer, setQuizAnswer] = useState(null)
  const [showQuizFeedback, setShowQuizFeedback] = useState(false)
  const [correctAnswers, setCorrectAnswers] = useState(0)
  const [progressId, setProgressId] = useState(null)

  const content = LEARNING_CONTENT[skill]
  const playerColor = currentPlayer?.name === 'Krishna' ? '#3b82f6' : 
                      currentPlayer?.name === 'Balarama' ? '#10b981' : '#9b4dca'

  useEffect(() => {
    initProgress()
  }, [])

  async function initProgress() {
    const { data } = await supabase
      .from('kb_learning_progress')
      .insert({
        player_name: currentPlayer?.name,
        skill,
        total_steps: content?.steps.length || 0,
        status: 'in_progress'
      })
      .select()
      .single()
    
    if (data) setProgressId(data.id)
    captureData('learning_started', { skill }, currentPlayer?.name)
  }

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📚</div>
          <h1 className="text-2xl text-white mb-4">Module not found</h1>
          <button onClick={() => navigate('/')} className="btn-roblox btn-roblox-blue">
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const step = content.steps[currentStep]
  const progress = ((currentStep + 1) / content.steps.length) * 100

  const handleQuizSubmit = () => {
    if (quizAnswer === null) return
    
    const isCorrect = quizAnswer === step.correct
    setShowQuizFeedback(true)
    if (isCorrect) setCorrectAnswers(c => c + 1)

    captureData('learning_quiz_answer', {
      step: currentStep,
      answer: quizAnswer,
      correct: isCorrect
    }, currentPlayer?.name)
  }

  const handleNext = async () => {
    if (step.type === 'quiz' && !showQuizFeedback) {
      handleQuizSubmit()
      return
    }

    setQuizAnswer(null)
    setShowQuizFeedback(false)

    if (currentStep < content.steps.length - 1) {
      setCurrentStep(currentStep + 1)
      
      // Save progress
      if (progressId) {
        await supabase
          .from('kb_learning_progress')
          .update({ steps_completed: currentStep + 1 })
          .eq('id', progressId)
      }
    } else {
      // Complete
      await completeModule()
    }
  }

  async function completeModule() {
    // Update progress
    if (progressId) {
      await supabase
        .from('kb_learning_progress')
        .update({
          completed_at: new Date().toISOString(),
          exercise_score: correctAnswers,
          status: 'completed'
        })
        .eq('id', progressId)
    }

    // Update skill mastery if good score
    const quizSteps = content.steps.filter(s => s.type === 'quiz').length
    if (correctAnswers >= quizSteps * 0.66) {
      await supabase
        .from('kb_skill_mastery')
        .update({
          needs_review: false,
          current_score: (correctAnswers / quizSteps) * 100,
          updated_at: new Date().toISOString()
        })
        .eq('player_name', currentPlayer?.name)
        .eq('skill', skill)
    }

    captureData('learning_completed', {
      skill,
      correct_answers: correctAnswers,
      total_quizzes: quizSteps
    }, currentPlayer?.name)

    navigate('/')
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={() => navigate('/')}
              className="text-gray-400 hover:text-white"
            >
              ← Exit
            </button>
            <h1 className="text-xl font-display text-white">
              {content.emoji} {content.title}
            </h1>
            <span className="text-gray-400">
              {currentStep + 1}/{content.steps.length}
            </span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </header>

        {/* Step Content */}
        <div className="glass-card p-8 mb-6 animate-slide-up">
          {step.type === 'intro' && (
            <div className="text-center">
              <h2 className="text-2xl font-display text-white mb-4">{step.title}</h2>
              <p className="text-gray-300 whitespace-pre-line">{step.content}</p>
            </div>
          )}

          {step.type === 'lesson' && (
            <div>
              <h2 className="text-2xl font-display text-white mb-6">{step.title}</h2>
              
              {step.problem && (
                <div className="bg-white/5 rounded-xl p-4 mb-4">
                  <p className="text-yellow-400 text-sm mb-2">THE PROBLEM</p>
                  <p className="text-white">{step.problem}</p>
                </div>
              )}
              
              {step.mistake && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
                  <p className="text-red-400 text-sm mb-1">❌ COMMON MISTAKE</p>
                  <p className="text-gray-300">{step.mistake}</p>
                </div>
              )}
              
              {step.insight && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-4">
                  <p className="text-emerald-400 text-sm mb-1">💡 KEY INSIGHT</p>
                  <p className="text-white">{step.insight}</p>
                </div>
              )}
              
              {step.solution && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                  <p className="text-blue-400 text-sm mb-1">✓ SOLUTION</p>
                  <p className="text-white font-mono text-lg">{step.solution}</p>
                </div>
              )}

              {step.content && (
                <p className="text-gray-300 whitespace-pre-line">{step.content}</p>
              )}
            </div>
          )}

          {step.type === 'quiz' && (
            <div>
              <p className="text-emerald-400 text-sm mb-2">🎯 YOUR TURN</p>
              <h2 className="text-xl text-white mb-6">{step.question}</h2>
              
              <div className="space-y-3">
                {step.options.map((option, i) => (
                  <button
                    key={i}
                    onClick={() => !showQuizFeedback && setQuizAnswer(i)}
                    disabled={showQuizFeedback}
                    className={`w-full p-4 rounded-xl text-left transition-all ${
                      showQuizFeedback && i === step.correct 
                        ? 'bg-emerald-500/20 border-2 border-emerald-500' :
                      showQuizFeedback && i === quizAnswer && i !== step.correct
                        ? 'bg-red-500/20 border-2 border-red-500' :
                      quizAnswer === i
                        ? 'bg-white/20 border-2 border-white/50' 
                        : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>

              {showQuizFeedback && (
                <div className={`mt-4 p-4 rounded-xl ${
                  quizAnswer === step.correct 
                    ? 'bg-emerald-500/20' 
                    : 'bg-red-500/20'
                }`}>
                  <p className="font-bold mb-1">
                    {quizAnswer === step.correct ? '✓ Correct!' : '✗ Not quite!'}
                  </p>
                  <p className="text-sm text-gray-300">{step.explanation}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <button
          onClick={handleNext}
          disabled={step.type === 'quiz' && quizAnswer === null && !showQuizFeedback}
          className="w-full py-4 rounded-xl font-bold text-lg transition-all
                   disabled:bg-white/10 disabled:text-gray-500"
          style={{ 
            backgroundColor: (step.type !== 'quiz' || showQuizFeedback || quizAnswer !== null) 
              ? playerColor : undefined 
          }}
        >
          {currentStep < content.steps.length - 1 
            ? (step.type === 'quiz' && !showQuizFeedback ? 'Check Answer' : 'Next →')
            : 'Finish & Return Home'
          }
        </button>
      </div>
    </div>
  )
}
