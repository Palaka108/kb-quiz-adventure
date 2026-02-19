import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCapture } from '../contexts/CaptureContext'
import { motion, AnimatePresence } from 'framer-motion'

// ═══════════════════════════════════════════════════
// NUMBER CRUNCH — Falling math problems, tap to solve
// ═══════════════════════════════════════════════════
function NumberCrunchGame({ onComplete, playerColor }) {
  const [score, setScore] = useState(0)
  const [round, setRound] = useState(1)
  const [problem, setProblem] = useState(null)
  const [options, setOptions] = useState([])
  const [timeLeft, setTimeLeft] = useState(45)
  const [feedback, setFeedback] = useState(null)
  const [isComplete, setIsComplete] = useState(false)
  const [combo, setCombo] = useState(0)
  const [shakeWrong, setShakeWrong] = useState(null)
  const [particles, setParticles] = useState([])
  const particleId = useRef(0)

  const generateProblem = useCallback(() => {
    const ops = ['+', '-', '×']
    const op = ops[Math.floor(Math.random() * ops.length)]
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

    const wrongAnswers = new Set()
    while(wrongAnswers.size < 3) {
      const wrong = answer + (Math.floor(Math.random() * 20) - 10)
      if (wrong !== answer && wrong > 0) wrongAnswers.add(wrong)
    }
    setOptions([answer, ...wrongAnswers].sort(() => Math.random() - 0.5))
  }, [])

  useEffect(() => { generateProblem() }, [generateProblem])

  useEffect(() => {
    if (timeLeft <= 0) {
      setIsComplete(true)
      onComplete(score)
      return
    }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000)
    return () => clearInterval(timer)
  }, [timeLeft, score, onComplete])

  const spawnParticles = (x, y, color) => {
    const newParticles = Array.from({ length: 6 }, () => ({
      id: particleId.current++,
      x, y,
      dx: (Math.random() - 0.5) * 120,
      dy: (Math.random() - 0.5) * 120,
      color,
      size: Math.random() * 8 + 4
    }))
    setParticles(prev => [...prev, ...newParticles])
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.includes(p)))
    }, 600)
  }

  const handleAnswer = (selected, e) => {
    if (feedback) return

    const rect = e.currentTarget.getBoundingClientRect()
    const isCorrect = selected === problem.answer

    if (isCorrect) {
      const newCombo = combo + 1
      setCombo(newCombo)
      const points = 10 * (newCombo >= 3 ? 2 : 1)
      setScore(s => s + points)
      setFeedback('correct')
      spawnParticles(rect.left + rect.width/2, rect.top, playerColor)
    } else {
      setCombo(0)
      setFeedback('incorrect')
      setShakeWrong(selected)
    }

    setTimeout(() => {
      setFeedback(null)
      setShakeWrong(null)
      setRound(r => r + 1)
      generateProblem()
    }, 400)
  }

  if (isComplete) {
    return (
      <motion.div
        className="text-center py-8"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <motion.div
          className="text-7xl mb-4"
          animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 0.6 }}
        >
          🎉
        </motion.div>
        <h2 className="text-3xl font-display text-white mb-2">Time's Up!</h2>
        <motion.p
          className="text-5xl font-bold mb-2"
          style={{ color: playerColor }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
        >
          {score} pts
        </motion.p>
        <p className="text-gray-400 mb-1">
          {Math.floor(round - 1)} problems attempted
        </p>
        <p className="text-gray-500 text-sm">
          {score >= 100 ? 'Math Machine!' : score >= 60 ? 'Great job!' : 'Nice effort!'}
        </p>
      </motion.div>
    )
  }

  return (
    <div className="text-center relative">
      {/* Floating particles */}
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: p.x, top: p.y - 200,
            width: p.size, height: p.size,
            backgroundColor: p.color
          }}
          initial={{ opacity: 1, x: 0, y: 0 }}
          animate={{ opacity: 0, x: p.dx, y: p.dy }}
          transition={{ duration: 0.6 }}
        />
      ))}

      {/* Timer bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Round {round}</span>
            {combo >= 3 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-yellow-400 font-bold text-sm"
              >
                🔥 {combo}x COMBO!
              </motion.span>
            )}
          </div>
          <span className="text-lg font-bold" style={{ color: timeLeft <= 10 ? '#ef4444' : playerColor }}>
            {timeLeft}s
          </span>
          <span className="text-gray-400">Score: {score}</span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: timeLeft <= 10 ? '#ef4444' : playerColor }}
            animate={{ width: `${(timeLeft / 45) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Problem with animation */}
      {problem && (
        <AnimatePresence mode="wait">
          <motion.div
            key={round}
            initial={{ opacity: 0, y: -30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.2 }}
            className="mb-8"
          >
            <div className="text-5xl font-display text-white mb-8">
              <motion.span
                animate={feedback === 'correct' ? { color: ['#fff', '#10b981', '#fff'] } : {}}
              >
                {problem.a} {problem.op} {problem.b} = ?
              </motion.span>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              {options.map((opt, i) => (
                <motion.button
                  key={`${round}-${i}`}
                  onClick={(e) => handleAnswer(opt, e)}
                  disabled={feedback !== null}
                  className={`p-5 rounded-2xl text-3xl font-bold border-2 transition-colors ${
                    feedback && opt === problem.answer ? 'bg-emerald-500/40 border-emerald-400 text-emerald-200' :
                    shakeWrong === opt ? 'bg-red-500/30 border-red-500 text-red-300' :
                    'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/40'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  animate={shakeWrong === opt ? { x: [0, -8, 8, -8, 8, 0] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  {opt}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════
// PATTERN BLAST — Animated sequence with visual hints
// ═══════════════════════════════════════════════════
function PatternBlastGame({ onComplete, playerColor }) {
  const [score, setScore] = useState(0)
  const [round, setRound] = useState(1)
  const [pattern, setPattern] = useState(null)
  const [options, setOptions] = useState([])
  const [feedback, setFeedback] = useState(null)
  const [showHint, setShowHint] = useState(false)
  const totalRounds = 8

  const generatePattern = useCallback(() => {
    const types = ['arithmetic', 'geometric', 'square']
    const type = types[Math.floor(Math.random() * types.length)]
    let sequence, answer, hint

    if (type === 'arithmetic') {
      const start = Math.floor(Math.random() * 20) + 5
      const diff = Math.floor(Math.random() * 10) + 2
      sequence = [start, start + diff, start + 2*diff, start + 3*diff]
      answer = start + 4*diff
      hint = `Each number adds +${diff}`
    } else if (type === 'geometric') {
      const start = Math.floor(Math.random() * 5) + 2
      const ratio = Math.floor(Math.random() * 2) + 2
      sequence = [start, start * ratio, start * ratio * ratio, start * ratio * ratio * ratio]
      answer = start * Math.pow(ratio, 4)
      hint = `Each number multiplies by ×${ratio}`
    } else {
      // Perfect squares
      const offset = Math.floor(Math.random() * 3) + 1
      sequence = [offset*offset, (offset+1)*(offset+1), (offset+2)*(offset+2), (offset+3)*(offset+3)]
      answer = (offset+4)*(offset+4)
      hint = `Perfect squares: ${offset}², ${offset+1}², ${offset+2}²...`
    }

    setPattern({ sequence, answer, type, hint })
    setShowHint(false)

    const wrongs = new Set()
    while(wrongs.size < 3) {
      const wrong = answer + (Math.floor(Math.random() * 30) - 15)
      if (wrong !== answer && wrong > 0) wrongs.add(wrong)
    }
    setOptions([answer, ...wrongs].sort(() => Math.random() - 0.5))
  }, [])

  useEffect(() => { generatePattern() }, [generatePattern])

  const handleAnswer = (selected) => {
    if (feedback) return

    const isCorrect = selected === pattern.answer
    setFeedback(isCorrect ? 'correct' : 'incorrect')

    if (isCorrect) setScore(s => s + 15)

    // Always show hint after answering
    setShowHint(true)

    setTimeout(() => {
      setFeedback(null)
      if (round >= totalRounds) {
        onComplete(score + (isCorrect ? 15 : 0))
      } else {
        setRound(r => r + 1)
        generatePattern()
      }
    }, 1500)
  }

  return (
    <div className="text-center">
      <div className="flex justify-between items-center mb-6">
        <span className="text-gray-400">Pattern {round}/{totalRounds}</span>
        <span className="text-2xl font-bold" style={{ color: playerColor }}>
          {score} pts
        </span>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-1.5 mb-6">
        {Array.from({ length: totalRounds }, (_, i) => (
          <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all ${
            i < round - 1 ? 'bg-emerald-400' :
            i === round - 1 ? 'bg-white scale-125' :
            'bg-white/20'
          }`} />
        ))}
      </div>

      {pattern && (
        <div className="mb-8">
          <p className="text-gray-400 mb-6 text-lg">What comes next?</p>

          {/* Animated sequence boxes */}
          <div className="flex justify-center items-center gap-3 mb-4">
            {pattern.sequence.map((num, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15, type: 'spring' }}
                className="w-16 h-16 rounded-xl bg-gradient-to-br from-white/15 to-white/5 border border-white/20
                         flex items-center justify-center text-2xl font-bold text-white shadow-lg"
              >
                {num}
              </motion.div>
            ))}

            {/* Arrows between numbers */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              className="w-16 h-16 rounded-xl border-2 border-dashed flex items-center justify-center text-2xl"
              style={{ borderColor: playerColor, color: playerColor }}
            >
              ?
            </motion.div>
          </div>

          {/* Hint (shown after wrong or always briefly) */}
          <AnimatePresence>
            {showHint && pattern.hint && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4"
              >
                <span className="inline-block px-4 py-2 rounded-full bg-yellow-500/20 text-yellow-300 text-sm">
                  💡 {pattern.hint}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Options */}
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            {options.map((opt, i) => (
              <motion.button
                key={i}
                onClick={() => handleAnswer(opt)}
                disabled={feedback !== null}
                className={`p-4 rounded-xl text-2xl font-bold border-2 transition-all ${
                  feedback && opt === pattern.answer ? 'bg-emerald-500/40 border-emerald-400 scale-105' :
                  feedback === 'incorrect' && opt !== pattern.answer ? 'opacity-50' :
                  'bg-white/10 border-white/20 hover:bg-white/20 hover:border-white/40'
                }`}
                whileHover={!feedback ? { scale: 1.05 } : {}}
                whileTap={!feedback ? { scale: 0.95 } : {}}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + i * 0.1 }}
              >
                {opt}
              </motion.button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════
// DECIMAL DASH — Animated racing lane comparison
// ═══════════════════════════════════════════════════
function DecimalDashGame({ onComplete, playerColor }) {
  const [score, setScore] = useState(0)
  const [round, setRound] = useState(1)
  const [numbers, setNumbers] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [streak, setStreak] = useState(0)
  const totalRounds = 10

  const generateNumbers = useCallback(() => {
    // Generate decimals that actually test understanding
    const types = ['tenths', 'hundredths', 'tricky']
    const type = types[Math.floor(Math.random() * types.length)]
    let a, b

    if (type === 'tenths') {
      a = parseFloat((Math.random() * 10).toFixed(1))
      b = parseFloat((Math.random() * 10).toFixed(1))
    } else if (type === 'hundredths') {
      a = parseFloat((Math.random() * 10).toFixed(2))
      b = parseFloat((Math.random() * 10).toFixed(2))
    } else {
      // Tricky: e.g., 3.5 vs 3.50 or 4.9 vs 4.09
      const base = Math.floor(Math.random() * 8) + 1
      const pairs = [
        [base + 0.9, base + 0.09],
        [base + 0.5, base + 0.50],
        [base + 0.15, base + 0.5],
        [base + 0.8, base + 0.08]
      ]
      const pair = pairs[Math.floor(Math.random() * pairs.length)]
      if (Math.random() > 0.5) {
        a = pair[0]; b = pair[1]
      } else {
        a = pair[1]; b = pair[0]
      }
    }

    // Avoid equal numbers
    if (a === b) b = parseFloat((b + 0.1).toFixed(2))

    setNumbers({ a, b })
  }, [])

  useEffect(() => { generateNumbers() }, [generateNumbers])

  const handleAnswer = (answer) => {
    if (feedback || !numbers) return

    const correctAnswer = numbers.a > numbers.b ? 'left' : 'right'
    const isCorrect = answer === correctAnswer

    setFeedback(isCorrect ? 'correct' : 'incorrect')
    if (isCorrect) {
      setScore(s => s + 10 + (streak >= 2 ? 5 : 0))
      setStreak(s => s + 1)
    } else {
      setStreak(0)
    }

    setTimeout(() => {
      setFeedback(null)
      if (round >= totalRounds) {
        onComplete(score + (isCorrect ? 10 : 0))
      } else {
        setRound(r => r + 1)
        generateNumbers()
      }
    }, 800)
  }

  return (
    <div className="text-center">
      <div className="flex justify-between items-center mb-6">
        <span className="text-gray-400">Race {round}/{totalRounds}</span>
        <div className="flex items-center gap-2">
          {streak >= 3 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-yellow-400 text-sm font-bold"
            >
              🏎️ {streak}x!
            </motion.span>
          )}
          <span className="text-2xl font-bold" style={{ color: playerColor }}>
            {score} pts
          </span>
        </div>
      </div>

      {/* Race track progress */}
      <div className="relative h-8 bg-white/5 rounded-full mb-8 overflow-hidden">
        <motion.div
          className="absolute top-0 left-0 h-full rounded-full flex items-center justify-end pr-2"
          style={{ backgroundColor: `${playerColor}40` }}
          animate={{ width: `${(round / totalRounds) * 100}%` }}
          transition={{ duration: 0.5 }}
        >
          <span className="text-sm">🏎️</span>
        </motion.div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-sm">🏁</div>
      </div>

      {numbers && (
        <div className="mb-8">
          <p className="text-gray-400 mb-6 text-lg">Which is BIGGER? Tap to race!</p>

          <div className="flex justify-center items-center gap-6 mb-6">
            {/* Left number */}
            <motion.button
              onClick={() => handleAnswer('left')}
              disabled={feedback !== null}
              className={`relative w-36 h-36 rounded-2xl text-3xl font-bold flex items-center justify-center border-2 transition-all ${
                feedback === 'correct' && numbers.a > numbers.b
                  ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200'
                  : feedback === 'incorrect' && numbers.a > numbers.b
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                  : feedback === 'incorrect' && numbers.a < numbers.b
                  ? 'bg-red-500/20 border-red-500 text-red-300'
                  : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
              }`}
              whileHover={!feedback ? { scale: 1.05 } : {}}
              whileTap={!feedback ? { scale: 0.95 } : {}}
              animate={feedback === 'correct' && numbers.a > numbers.b ? { scale: [1, 1.1, 1] } : {}}
            >
              {numbers.a}
              {feedback === 'correct' && numbers.a > numbers.b && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-3 -right-3 text-2xl"
                >
                  🏆
                </motion.span>
              )}
            </motion.button>

            <motion.div
              className="text-4xl font-bold"
              style={{ color: playerColor }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              VS
            </motion.div>

            {/* Right number */}
            <motion.button
              onClick={() => handleAnswer('right')}
              disabled={feedback !== null}
              className={`relative w-36 h-36 rounded-2xl text-3xl font-bold flex items-center justify-center border-2 transition-all ${
                feedback === 'correct' && numbers.b > numbers.a
                  ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200'
                  : feedback === 'incorrect' && numbers.b > numbers.a
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                  : feedback === 'incorrect' && numbers.b < numbers.a
                  ? 'bg-red-500/20 border-red-500 text-red-300'
                  : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
              }`}
              whileHover={!feedback ? { scale: 1.05 } : {}}
              whileTap={!feedback ? { scale: 0.95 } : {}}
              animate={feedback === 'correct' && numbers.b > numbers.a ? { scale: [1, 1.1, 1] } : {}}
            >
              {numbers.b}
              {feedback === 'correct' && numbers.b > numbers.a && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-3 -right-3 text-2xl"
                >
                  🏆
                </motion.span>
              )}
            </motion.button>
          </div>

          {/* Feedback message */}
          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`text-lg font-bold ${
                  feedback === 'correct' ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {feedback === 'correct'
                  ? (streak >= 3 ? '🔥 On fire!' : '✓ Correct!')
                  : `✗ ${numbers.a > numbers.b ? numbers.a : numbers.b} is bigger!`
                }
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════
// MAIN TUTORIAL PAGE
// ═══════════════════════════════════════════════════
export default function TutorialPage() {
  const { gameType } = useParams()
  const navigate = useNavigate()
  const { currentPlayer } = useAuth()
  const { logGameProgress } = useCapture()
  const [gameComplete, setGameComplete] = useState(false)
  const [finalScore, setFinalScore] = useState(0)
  const [showCountdown, setShowCountdown] = useState(true)
  const [countdown, setCountdown] = useState(3)

  const playerColor = currentPlayer?.name === 'Krishna' ? '#3b82f6' :
                      currentPlayer?.name === 'Balarama' ? '#10b981' : '#9b4dca'

  const gameInfo = {
    'number-crunch': { name: 'Number Crunch', emoji: '🔢', Game: NumberCrunchGame, tip: 'Solve as many as you can!' },
    'pattern-blast': { name: 'Pattern Blast', emoji: '🎯', Game: PatternBlastGame, tip: 'Find what comes next!' },
    'decimal-dash': { name: 'Decimal Dash', emoji: '💨', Game: DecimalDashGame, tip: 'Pick the bigger number!' }
  }[gameType]

  // Countdown before game starts
  useEffect(() => {
    if (!showCountdown) return
    if (countdown <= 0) {
      setShowCountdown(false)
      return
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 700)
    return () => clearTimeout(timer)
  }, [countdown, showCountdown])

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
          <div className="w-16" />
        </header>

        {/* Game Area */}
        <div className="glass-card p-8">
          {/* Countdown overlay */}
          <AnimatePresence>
            {showCountdown && (
              <motion.div
                className="text-center py-12"
                exit={{ opacity: 0, scale: 0.5 }}
              >
                <motion.div
                  className="text-8xl font-display mb-4"
                  style={{ color: playerColor }}
                  key={countdown}
                  initial={{ scale: 2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring' }}
                >
                  {countdown > 0 ? countdown : 'GO!'}
                </motion.div>
                <p className="text-gray-400">{gameInfo.tip}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Game or completion */}
          {!showCountdown && (
            gameComplete ? (
              <motion.div
                className="text-center py-8"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                <motion.div
                  className="text-7xl mb-4"
                  animate={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  🎮
                </motion.div>
                <h2 className="text-3xl font-display text-white mb-2">Great Warm-Up!</h2>
                <motion.p
                  className="text-5xl font-bold mb-6"
                  style={{ color: playerColor }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                >
                  {finalScore} points
                </motion.p>
                <div className="flex gap-4 justify-center">
                  <motion.button
                    onClick={() => {
                      setGameComplete(false)
                      setFinalScore(0)
                      setShowCountdown(true)
                      setCountdown(3)
                    }}
                    className="btn-roblox bg-white/10 hover:bg-white/20"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Play Again
                  </motion.button>
                  <motion.button
                    onClick={() => navigate('/quiz?quiz=7')}
                    className="btn-roblox"
                    style={{ backgroundColor: playerColor }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Start Quiz →
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              <Game onComplete={handleComplete} playerColor={playerColor} />
            )
          )}
        </div>
      </div>
    </div>
  )
}
