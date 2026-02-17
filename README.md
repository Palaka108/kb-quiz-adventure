# 🎮 KB's Quiz Adventure

A personalized math quiz and learning platform for Krishna & Balarama!

## Features

- **🔐 PIN Authentication** - Each player has their own secure login
- **🎯 Warm-Up Games** - Fun mini-games before quizzes
  - Number Crunch (quick mental math)
  - Pattern Blast (find the pattern)
  - Decimal Dash (compare decimals)
- **📚 Adaptive Quizzes** - 15 questions with skill tracking
- **📈 Learning Modules** - Personalized lessons based on weak areas
- **💾 Bulletproof Data Capture** - Nothing gets lost!
  - Saves to localStorage first
  - Syncs to Supabase with retry
  - Captures all URL parameters
  - Offline support

## Tech Stack

- **Frontend:** React 18 + Vite
- **Styling:** TailwindCSS
- **Database:** Supabase (PostgreSQL)
- **Deployment:** Vercel

## Quick Start

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/kb-quiz-adventure.git
cd kb-quiz-adventure
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run locally
```bash
npm run dev
```

### 4. Deploy to Vercel

#### Option A: Via Vercel CLI
```bash
npm i -g vercel
vercel
```

#### Option B: Via GitHub
1. Push to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Deploy!

## Player PINs

| Player | PIN |
|--------|-----|
| Krishna | 1111 |
| Balarama | 2222 |
| Mommy | 0000 |

## Supabase Tables

Already set up in your Supabase project:

- `kb_players` - Player profiles
- `kb_questions` - Quiz questions (24 loaded)
- `kb_quiz_sessions` - Quiz attempts and scores
- `kb_skill_mastery` - Skill tracking per player
- `kb_learning_modules` - Personalized lessons
- `kb_learning_progress` - Learning progress tracking
- `kb_captures` - **NEW** - Bulletproof event capture

## Data Capture System

The app captures EVERYTHING and ensures nothing is lost:

1. **URL Parameters** - Any `?key=value` in URL is captured
2. **User Actions** - Login, game start, quiz answers
3. **Errors** - All errors logged to Supabase
4. **Offline Support** - Queues data when offline, syncs when back

To view captures:
```sql
SELECT * FROM kb_captures ORDER BY created_at DESC;
```

## Folder Structure

```
kb-quiz-adventure/
├── src/
│   ├── components/     # Reusable UI components
│   ├── contexts/       # React contexts (Auth, Capture)
│   ├── hooks/          # Custom hooks
│   ├── pages/          # Page components
│   │   ├── LoginPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── TutorialPage.jsx
│   │   ├── QuizPage.jsx
│   │   ├── LearningPage.jsx
│   │   └── ResultsPage.jsx
│   ├── games/          # Mini-game components
│   ├── utils/          # Utilities (Supabase client)
│   └── styles/         # CSS
├── public/             # Static assets
└── package.json
```

## Environment Variables (Optional)

If you want to override the built-in Supabase config:

```env
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key
```

## License

MIT - Built with ❤️ for Krishna & Balarama
