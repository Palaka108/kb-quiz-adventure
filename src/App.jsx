import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { useCapture } from './contexts/CaptureContext'

// Pages
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import TutorialPage from './pages/TutorialPage'
import QuizPage from './pages/QuizPage'
import ResultsPage from './pages/ResultsPage'
import LearningPage from './pages/LearningPage'

// Components
import LoadingScreen from './components/LoadingScreen'
import StarsBackground from './components/StarsBackground'
import ErrorBoundary from './components/ErrorBoundary'

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const { isLoggedIn, isLoading } = useAuth()
  
  if (isLoading) {
    return <LoadingScreen />
  }
  
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }
  
  return children
}

function App() {
  const { logError } = useCapture()

  // Global error handler
  useEffect(() => {
    const handleError = (event) => {
      logError(event.error || new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      })
    }

    const handleUnhandledRejection = (event) => {
      logError(event.reason || new Error('Unhandled Promise Rejection'), {
        type: 'unhandledrejection'
      })
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [logError])

  return (
    <ErrorBoundary>
      <div className="min-h-screen relative">
        <StarsBackground />
        
        <div className="relative z-10">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            
            {/* Protected routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } />
            
            <Route path="/tutorial/:gameType" element={
              <ProtectedRoute>
                <TutorialPage />
              </ProtectedRoute>
            } />
            
            <Route path="/quiz" element={
              <ProtectedRoute>
                <QuizPage />
              </ProtectedRoute>
            } />
            
            <Route path="/learning/:skill" element={
              <ProtectedRoute>
                <LearningPage />
              </ProtectedRoute>
            } />
            
            <Route path="/results" element={
              <ProtectedRoute>
                <ResultsPage />
              </ProtectedRoute>
            } />
            
            {/* Catch all - redirect to login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </div>
    </ErrorBoundary>
  )
}

export default App
