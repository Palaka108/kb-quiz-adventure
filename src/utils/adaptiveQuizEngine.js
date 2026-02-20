/**
 * Adaptive Quiz Engine for KB's Quiz Adventure
 *
 * Selects 15 personalized questions based on player performance history.
 * Algorithm: 40% weak skills, 40% medium skills, 20% strong skills
 * with difficulty targeting and recency-based question avoidance.
 */

// Skill categorization thresholds
const WEAK_THRESHOLD = 60
const STRONG_THRESHOLD = 80

// Question allocation
const QUIZ_SIZE = 15
const WEAK_ALLOCATION = 6    // 40%
const MEDIUM_ALLOCATION = 6  // 40%
const STRONG_ALLOCATION = 3  // 20%

// Difficulty targeting per category
const DIFFICULTY_TARGETS = {
  weak: [1, 2],       // Build confidence
  medium: [2, 3],     // Push toward mastery
  strong: [3, 4, 5]   // Challenge to maintain
}

/**
 * Categorize skills into weak/medium/strong based on mastery scores
 */
export function categorizeSkills(skillMastery) {
  const weak = []
  const medium = []
  const strong = []

  // Use the three main skill categories
  const mainSkills = ['Decimal Operations', 'Fractions & Mixed Numbers', 'Word Problems & Patterns']

  for (const skill of mainSkills) {
    const mastery = skillMastery.find(s => s.skill === skill)
    const score = mastery
      ? Math.max(
          parseFloat(mastery.recent_accuracy) || 0,
          parseFloat(mastery.current_score) || 0
        )
      : 50 // Default for new players

    if (score < WEAK_THRESHOLD) {
      weak.push({ skill, score })
    } else if (score < STRONG_THRESHOLD) {
      medium.push({ skill, score })
    } else {
      strong.push({ skill, score })
    }
  }

  // If all skills are in one bucket, redistribute for variety
  if (weak.length === 0 && medium.length === 0) {
    // All strong — move the lowest to medium
    strong.sort((a, b) => a.score - b.score)
    medium.push(strong.shift())
  } else if (weak.length === 3) {
    // All weak — move the highest to medium
    weak.sort((a, b) => b.score - a.score)
    medium.push(weak.shift())
  } else if (medium.length === 3) {
    // All medium — move lowest to weak-ish, highest to strong-ish
    medium.sort((a, b) => a.score - b.score)
    weak.push(medium.shift())
    strong.push(medium.pop())
  }

  // Ensure every bucket has at least one skill by filling from adjacent
  if (weak.length === 0) {
    medium.sort((a, b) => a.score - b.score)
    if (medium.length > 1) weak.push(medium.shift())
    else if (strong.length > 1) { strong.sort((a, b) => a.score - b.score); weak.push(strong.shift()) }
  }
  if (strong.length === 0) {
    medium.sort((a, b) => b.score - a.score)
    if (medium.length > 1) strong.push(medium.pop())
    else if (weak.length > 1) { weak.sort((a, b) => b.score - a.score); strong.push(weak.shift()) }
  }
  if (medium.length === 0) {
    if (weak.length > 1) { weak.sort((a, b) => b.score - a.score); medium.push(weak.shift()) }
    else if (strong.length > 1) { strong.sort((a, b) => a.score - b.score); medium.push(strong.shift()) }
  }

  return { weak, medium, strong }
}

/**
 * Score a question for selection priority
 */
export function calculateQuestionScore(question, targetDifficulties, recentQuestionIds, subSkillCoverage) {
  let score = 100

  // Difficulty match: prefer questions matching target difficulty range
  if (targetDifficulties.includes(question.difficulty)) {
    score += 30
  } else {
    // Penalize based on distance from target range
    const minTarget = Math.min(...targetDifficulties)
    const maxTarget = Math.max(...targetDifficulties)
    const distance = question.difficulty < minTarget
      ? minTarget - question.difficulty
      : question.difficulty - maxTarget
    score -= distance * 15
  }

  // Recency penalty: heavily penalize questions from recent sessions
  if (recentQuestionIds.has(question.id)) {
    score -= 200 // Almost always skip recently-seen questions
  }

  // Sub-skill coverage bonus: prefer questions from under-represented sub-skills
  const subKey = `${question.skill}:${question.sub_skill}`
  const subCount = subSkillCoverage.get(subKey) || 0
  if (subCount === 0) {
    score += 20 // Bonus for new sub-skill coverage
  } else {
    score -= subCount * 10 // Penalty for repeating same sub-skill
  }

  // Small random factor to prevent identical quizzes
  score += Math.random() * 10

  return score
}

/**
 * Select questions for a skill category
 */
function selectForCategory(questions, skillNames, count, targetDifficulties, recentQuestionIds, subSkillCoverage) {
  if (count === 0 || skillNames.length === 0) return []

  // Filter questions matching these skills
  const candidates = questions.filter(q =>
    skillNames.includes(q.skill) && q.is_active !== false
  )

  if (candidates.length === 0) return []

  // Score each candidate
  const scored = candidates.map(q => ({
    question: q,
    score: calculateQuestionScore(q, targetDifficulties, recentQuestionIds, subSkillCoverage)
  }))

  // Sort by score (highest first) and take top N
  scored.sort((a, b) => b.score - a.score)
  const selected = scored.slice(0, count).map(s => s.question)

  // Track sub-skill coverage for diversity
  for (const q of selected) {
    const subKey = `${q.skill}:${q.sub_skill}`
    subSkillCoverage.set(subKey, (subSkillCoverage.get(subKey) || 0) + 1)
  }

  return selected
}

/**
 * Main adaptive question selection function
 *
 * @param {string} playerName - The player's name
 * @param {Array} allQuestions - All questions from the bank
 * @param {Array} skillMastery - Player's skill mastery records
 * @param {Array} recentSessions - Last 2-3 completed sessions (for question avoidance)
 * @returns {Array} - 15 selected questions, sorted easy-to-hard
 */
export function selectAdaptiveQuestions(playerName, allQuestions, skillMastery, recentSessions) {
  // 1. Categorize skills
  const categories = categorizeSkills(skillMastery)

  // 2. Build set of recently-seen question IDs (from last 2 sessions)
  const recentQuestionIds = new Set()
  const sessionsToCheck = (recentSessions || []).slice(0, 2)
  for (const session of sessionsToCheck) {
    const answers = session.answers || []
    for (const answer of answers) {
      if (answer.questionId) recentQuestionIds.add(answer.questionId)
    }
  }

  // 3. Track sub-skill coverage across selections
  const subSkillCoverage = new Map()

  // 4. Select questions per category
  const weakSkillNames = categories.weak.map(s => s.skill)
  const mediumSkillNames = categories.medium.map(s => s.skill)
  const strongSkillNames = categories.strong.map(s => s.skill)

  const weakQuestions = selectForCategory(
    allQuestions, weakSkillNames, WEAK_ALLOCATION,
    DIFFICULTY_TARGETS.weak, recentQuestionIds, subSkillCoverage
  )

  const mediumQuestions = selectForCategory(
    allQuestions, mediumSkillNames, MEDIUM_ALLOCATION,
    DIFFICULTY_TARGETS.medium, recentQuestionIds, subSkillCoverage
  )

  const strongQuestions = selectForCategory(
    allQuestions, strongSkillNames, STRONG_ALLOCATION,
    DIFFICULTY_TARGETS.strong, recentQuestionIds, subSkillCoverage
  )

  // 5. Combine and fill any gaps
  let selected = [...weakQuestions, ...mediumQuestions, ...strongQuestions]

  // If we don't have 15 questions, fill from remaining pool
  if (selected.length < QUIZ_SIZE) {
    const selectedIds = new Set(selected.map(q => q.id))
    const remaining = allQuestions
      .filter(q => !selectedIds.has(q.id) && q.is_active !== false)
      .sort(() => Math.random() - 0.5)

    while (selected.length < QUIZ_SIZE && remaining.length > 0) {
      selected.push(remaining.shift())
    }
  }

  // 6. Sort by difficulty (easy to hard) for confidence-building momentum
  selected.sort((a, b) => a.difficulty - b.difficulty)

  // 7. Within same difficulty, shuffle for variety
  const grouped = {}
  for (const q of selected) {
    if (!grouped[q.difficulty]) grouped[q.difficulty] = []
    grouped[q.difficulty].push(q)
  }
  const finalOrder = []
  for (const diff of Object.keys(grouped).sort((a, b) => a - b)) {
    const group = grouped[diff]
    group.sort(() => Math.random() - 0.5) // Shuffle within difficulty
    finalOrder.push(...group)
  }

  return finalOrder.slice(0, QUIZ_SIZE)
}

/**
 * Generate a focus summary for the dashboard
 * Returns the primary focus areas for today's quiz
 */
export function getDailyFocusSummary(skillMastery) {
  const categories = categorizeSkills(skillMastery)

  const focusAreas = []

  // Weak skills get "Working on" label
  for (const s of categories.weak) {
    focusAreas.push({
      skill: s.skill.split(' ')[0], // "Decimal", "Fractions", "Word"
      label: 'Working on',
      score: Math.round(s.score),
      priority: 'high'
    })
  }

  // Medium skills get "Building" label
  for (const s of categories.medium) {
    focusAreas.push({
      skill: s.skill.split(' ')[0],
      label: 'Building',
      score: Math.round(s.score),
      priority: 'medium'
    })
  }

  // Strong skills get "Maintaining" label
  for (const s of categories.strong) {
    focusAreas.push({
      skill: s.skill.split(' ')[0],
      label: 'Maintaining',
      score: Math.round(s.score),
      priority: 'low'
    })
  }

  return focusAreas
}
