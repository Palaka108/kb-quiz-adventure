import React from 'react'

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-kb-dark flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-24 h-24 mx-auto mb-6">
          {/* Spinning ring */}
          <div className="absolute inset-0 border-4 border-transparent border-t-krishna border-r-balarama rounded-full animate-spin" />
          {/* Inner pulse */}
          <div className="absolute inset-4 bg-gradient-to-br from-krishna to-balarama rounded-full animate-pulse" />
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center text-3xl">
            🎮
          </div>
        </div>
        <h2 className="text-xl font-display text-white animate-pulse">
          Loading Adventure...
        </h2>
      </div>
    </div>
  )
}
