import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    
    // Save error to localStorage as backup
    const errorLog = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    }
    
    try {
      const errors = JSON.parse(localStorage.getItem('kb_error_log') || '[]')
      errors.push(errorLog)
      localStorage.setItem('kb_error_log', JSON.stringify(errors.slice(-10))) // Keep last 10
    } catch {
      // Ignore localStorage errors
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-kb-dark flex items-center justify-center p-4">
          <div className="glass-card p-8 max-w-md w-full text-center">
            <div className="text-6xl mb-4">😵</div>
            <h1 className="text-2xl font-display text-white mb-4">
              Oops! Something went wrong!
            </h1>
            <p className="text-gray-400 mb-6">
              Don't worry, your progress is saved. Let's try again!
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.href = '/'
              }}
              className="btn-roblox btn-roblox-blue"
            >
              🔄 Restart Game
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
