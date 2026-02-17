import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCapture } from '../contexts/CaptureContext'

// Number Crunch Game - Quick mental math
function NumberCrunchGame({ onComplete, playerColor }) {
  const [score, setScore] = useState(0)
  const [round, setRound] = useState(1)
  const [problem, setProblem] = useState(null)
  const [options, setOptions] = useState([])
  const [timeLeft, setTimeLeft] = useState(60)
  const [feedback, setFeedback] = useState(null)
  const [isComplete, setIsComplete] = useState(false)

  const generateProblem = useCallback(() => {
    const operations = ['+', '-', '×']
    const op = operations[Math.floor(Math.random() * operations.length)]
    let a, b, answer
    
    switch(op) {
      case '+':
        a = Math.floor(Math.random() * 50) + 10
        b = Math.floor(Math.random() * 50) + 10
        answer = a + b
        break
      case '-':
        a = Math.floor(Math.random() * 50) + 30
        b = Math.floor(Math.random() * 30) + 1
        answer = a - b
        break
      case '×':
        a = Math.floor(Math.random() * 12) + 2
        b = Math.floor(Math.random() * 12) + 2
        answer = a * b
        break
    }

    setProblem({ a, b, op, answer })
    
    // Generate options
    const wrongAnswers = new Set()
    while(wrongAnswers.size < 3) {
      const wrong = answer + (Math.floor(Math.random() * 20) - 10)
      if (wrong !== answer && wrong > 0) wrongAnswers.add(wrong)
    }
    
    const allOptions = [answer, ...wrongAnswers]
    setOptions(allOptions.sort(() => Math.random() - 0.5))
  }, [])

  useEffect(() => {
    generateProblem()
  }, [generateProblem])

  useEffect(() => {
    if (timeLeft <= 0) {
      setIsComplete(true)
      onComplete(score)
      return
    }
    
    const timer = setInterval(() => {
      setTimeLeft(t => t - 1)
    }, 1000)
    
    return () => clearInterval(timer)
  }, [timeLeft, score, onComplete])

  const handleAnswer = (selected) => {
    if (feedback) return
    
    const isCorrect = selected === problem.answer
    setFeedback(isCorrect ? 'correct' : 'incorrect')
    
    if (isCorrect) {
      setScore(s => s + 10)
    }
    
    setTimeout(() => {
      setFeedback(null)
      setRound(r => r + 1)
      generateProblem()
    }, 500)
  }

  if (isComplete) {
    return (
      <div className="text-center py-8">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-3xl font-display text-white mb-2">Time's Up!</h2>
        <p className="text-5xl font-bold mb-4" style={{ color: playerColor }}>
          {score} points
        </p>
        <p className="text-gray-400">
          You solved {Math.floor(score / 10)} problems!
        </p>
      </div>
    )
  }

  return (
    <div className="text-center">
      {/* Timer */}
      <div className="flex justify-between items-center mb-6">
        <div className="text-lg text-gray-400">Round {round}</div>
        <div className="text-2xl font-bold" style={{ color: timeLeft <= 10 ? '#ef4444' : playerColor }}>
          ⏱️ {timeLeft}s
        </div>
        <div className="text-lg text-gray-400">Score: {score}</div>
      </div>
      
      {/* Problem */}
      {problem && (
        <div className="mb-8">
          <div className="text-5xl font-display text-white mb-8">
            {problem.a} {problem.op} {problem.b} = ?
          </div>
          
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            {options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(opt)}
                disabled={feedback !== null}
                className={`game-tile text-3xl ${
                  feedback && opt === problem.answer ? 'bg-emerald-500/50 border-emerald-500' :
                  feedback === 'incorrect' && opt !== problem.answer ? 'bg-red-500/20 border-red-500/50' :
                  'bg-white/10 border-white/20'
                } border-2`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Pattern Blast Game - Find the next number
function PatternBlastGame({ onComplete, playerColor }) {
  const [score, setScore] = useState(0)
  const [round, setRound] = useState(1)
  const [pattern, setPattern] = useState(null)
  const [options, setOptions] = useState([])
  const [feedback, setFeedback] = useState(null)
  const totalRounds = 8

  const generatePattern = useCallback(() => {
    const type = Math.random() > 0.5 ? 'arithmetic' : 'geometric'
    let sequence, answer
    
    if (type === 'arithmetic') {
      const start = Math.floor(Math.random() * 20) + 5
      const diff = Math.floor(Math.random() * 10) + 2
      sequence = [start, start + diff, start + 2*diff, start + 3*diff]
      answer = start + 4*diff
    } else {
      const start = Math.floor(Math.random() * 5) + 2
      const ratio = Math.floor(Math.random() * 2) + 2
      sequence = [start, start * ratio, start * ratio * ratio, start * ratio * ratio * ratio]
      answer = start * Math.pow(ratio, 4)
    }
    
    setPattern({ sequence, answer, type })
    
    // Generate wrong options
    const wrongs = new Set()
    while(wrongs.size < 3) {
      const wrong = answer + (Math.floor(Math.random() * 30) - 15)
      if (wrong !== answer && wrong > 0) wrongs.add(wrong)
    }
    
    setOptions([answer, ...wrongs].sort(() => Math.random() - 0.5))
  }, [])

  useEffect(() => {
    generatePattern()
  }, [generatePattern])

  const handleAnswer = (selected) => {
    if (feedback) return
    
    const isCorrect = selected === pattern.answer
    setFeedback(isCorrect ? 'correct' : 'incorrect')
    
    if (isCorrect) setScore(s => s + 15)
    
    setTimeout(() => {
      setFeedback(null)
      if (round >= totalRounds) {
        onComplete(score + (isCorrect ? 15 : 0))
      } else {
        setRound(r => r + 1)
        generatePattern()
      }
    }, 800)
  }

  return (
    <div className="text-center">
      <div className="flex justify-between items-center mb-6">
        <div className="text-lg text-gray-400">Pattern {round}/{totalRounds}</div>
        <div className="text-2xl font-bold" style={{ color: playerColor }}>
          Score: {score}
        </div>
      </div>
      
      {pattern && (
        <div className="mb-8">
          <p className="text-gray-400 mb-4">What comes next?</p>
          <div className="flex justify-center items-center gap-4 mb-8">
            {pattern.sequence.map((num, i) => (
              <div key={i} className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center text-2xl font-bold text-white">
                {num}
              </div>
            ))}
            <div className="w-16 h-16 rounded-xl border-2 border-dashed border-white/30 flex items-center justify-center text-2xl text-gray-500">
              ?
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            {options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(opt)}
                disabled={feedback !== null}
                className={`game-tile text-2xl border-2 ${
                  feedback && opt === pattern.answer ? 'bg-emerald-500/50 border-emerald-500' :
                  feedback === 'incorrect' ? 'bg-red-500/20 border-red-500/50' :
                  'bg-white/10 border-white/20'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Decimal Dash Game - Compare decimals
function DecimalDashGame({ onComplete, playerColor }) {
  const [score, setScore] = useState(0)
  const [round, setRound] = useState(1)
  const [numbers, setNumbers] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const totalRounds = 10

  const generateNumbers = useCallback(() => {
    const a = (Math.random() * 10).toFixed(2)
    const b = (Math.random() * 10).toFixed(2)
    setNumbers({ a: parseFloat(a), b: parseFloat(b) })
  }, [])

  useEffect(() => {
    generateNumbers()
  }, [generateNumbers])

  const handleAnswer = (answer) => {
    if (feedback || !numbers) return
    
    const correctAnswer = numbers.a > numbers.b ? 'left' : numbers.b > numbers.a ? 'right' : 'equal'
    const isCorrect = answer === correctAnswer
    
    setFeedback(isCorrect ? 'correct' : 'incorrect')
    if (isCorrect) setScore(s => s + 10)
    
    setTimeout(() => {
      setFeedback(null)
      if (round >= totalRounds) {
        onComplete(score + (isCorrect ? 10 : 0))
      } else {
        setRound(r => r + 1)
        generateNumbers()
      }
    }, 600)
  }

  return (
    <div className="text-center">
      <div className="flex justify-between items-center mb-6">
        <div className="text-lg text-gray-400">Round {round}/{totalRounds}</div>
        <div className="text-2xl font-bold" style={{ color: playerColor }}>
          Score: {score}
        </div>
      </div>
      
      {numbers && (
        <div className="mb-8">
          <p className="text-gray-400 mb-6">Which is BIGGER?</p>
          
          <div className="flex justify-center items-center gap-4 mb-6">
            <button
              onClick={() => handleAnswer('left')}
              disabled={feedback !== null}
              className={`w-32 h-32 rounded-2xl text-3xl font-bold transition-all
                        ${feedback === 'correct' && numbers.a > numbers.b ? 'bg-emerald-500/50 scale-110' :
                          feedback === 'incorrect' && numbers.a < numbers.b ? 'bg-red-500/30' :
                          'bg-white/10 hover:bg-white/20'}`}
            >
              {numbers.a}
            </button>
            
            <div className="text-4xl text-gray-500">VS</div>
            
            <button
              onClick={() => handleAnswer('right')}
              disabled={feedback !== null}
              className={`w-32 h-32 rounded-2xl text-3xl font-bold transition-all
                        ${feedback === 'correct' && numbers.b > numbers.a ? 'bg-emerald-500/50 scale-110' :
                          feedback === 'incorrect' && numbers.b < numbers.a ? 'bg-red-500/30' :
                          'bg-white/10 hover:bg-white/20'}`}
            >
              {numbers.b}
            </button>
          </div>
          
          <button
            onClick={() => handleAnswer('equal')}
            disabled={feedback !== null}
            className="px-6 py-3 rounded-xl bg-white/10 text-gray-400 hover:bg-white/20"
          >
            They're Equal
          </button>
        </div>
      )}
    </div>
  )
}

export default function TutorialPage() {
  const { gameType } = useParams()
  const navigate = useNavigate()
  const { currentPlayer } = useAuth()
  const { logGameProgress } = useCapture()
  const [gameComplete, setGameComplete] = useState(false)
  const [finalScore, setFinalScore] = useState(0)

  const playerColor = currentPlayer?.name === 'Krishna' ? '#3b82f6' : 
                      currentPlayer?.name === 'Balarama' ? '#10b981' : '#9b4dca'

  const gameInfo = {
    'number-crunch': { name: 'Number Crunch', emoji: '🔢', Game: NumberCrunchGame },
    'pattern-blast': { name: 'Pattern Blast', emoji: '🎯', Game: PatternBlastGame },
    'decimal-dash': { name: 'Decimal Dash', emoji: '💨', Game: DecimalDashGame }
  }[gameType]

  const handleComplete = async (score) => {
    setFinalScore(score)
    setGameComplete(true)
    await logGameProgress(currentPlayer?.name, gameType, score)
  }

  if (!gameInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❓</div>
          <h1 className="text-2xl text-white mb-4">Game not found</h1>
          <button onClick={() => navigate('/')} className="btn-roblox btn-roblox-blue">
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const { Game } = gameInfo

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <button 
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-display text-white">
            {gameInfo.emoji} {gameInfo.name}
          </h1>
          <div className="w-16" /> {/* Spacer */}
        </header>

        {/* Game Area */}
        <div className="glass-card p-8">
          {gameComplete ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🎮</div>
              <h2 className="text-3xl font-display text-white mb-2">Great Warm-Up!</h2>
              <p className="text-5xl font-bold mb-6" style={{ color: playerColor }}>
                {finalScore} points
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => {
                    setGameComplete(false)
                    setFinalScore(0)
                  }}
                  className="btn-roblox bg-white/10 hover:bg-white/20"
                >
                  Play Again
                </button>
                <button
                  onClick={() => navigate('/quiz')}
                  className="btn-roblox"
                  style={{ backgroundColor: playerColor }}
                >
                  Start Quiz →
                </button>
              </div>
            </div>
          ) : (
            <Game onComplete={handleComplete} playerColor={playerColor} />
          )}
        </div>
      </div>
    </div>
  )
}
