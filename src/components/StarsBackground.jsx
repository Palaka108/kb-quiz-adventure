import React, { useMemo } from 'react'

export default function StarsBackground() {
  const stars = useMemo(() => {
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() * 3 + 1,
      delay: Math.random() * 3,
      duration: Math.random() * 2 + 2
    }))
  }, [])

  return (
    <div className="stars-bg">
      {stars.map(star => (
        <div
          key={star.id}
          className="star"
          style={{
            left: star.left,
            top: star.top,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animationDelay: `${star.delay}s`,
            animationDuration: `${star.duration}s`
          }}
        />
      ))}
      
      {/* Floating game elements */}
      <div 
        className="absolute text-4xl animate-float"
        style={{ left: '10%', top: '20%', animationDelay: '0s' }}
      >
        🎮
      </div>
      <div 
        className="absolute text-3xl animate-float"
        style={{ left: '85%', top: '15%', animationDelay: '1s' }}
      >
        ⭐
      </div>
      <div 
        className="absolute text-4xl animate-float"
        style={{ left: '75%', top: '70%', animationDelay: '2s' }}
      >
        🏆
      </div>
      <div 
        className="absolute text-3xl animate-float"
        style={{ left: '15%', top: '75%', animationDelay: '0.5s' }}
      >
        💎
      </div>
    </div>
  )
}
