import React, { useState, useEffect } from 'react'
import * as authService from '../../services/authService.js'
import * as subscriptionService from '../../services/subscriptionService.js'
import * as storageService from '../../services/storageService.js'
import AuthModal from '../../components/AuthModal/AuthModal.jsx'

const MODES = [
  { id: 'ege',        label: 'ЕГЭ'  },
  { id: 'oge',        label: 'ОГЭ'  },
  { id: 'university', label: 'Свой' },
]

export default function UserSection({ mode, onModeChange }) {
  const [user,     setUser]     = useState(null)
  const [plan,     setPlan]     = useState('free')
  const [showAuth, setShowAuth] = useState(false)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    Promise.all([
      authService.getUser(),
      subscriptionService.getStatus(),
    ]).then(([u, sub]) => {
      setUser(u)
      setPlan(sub?.plan || 'free')
      setLoading(false)
    })
  }, [])

  const handleSignOut = async () => {
    await authService.signOut()
    subscriptionService.invalidateCache()
    setUser(null)
    setPlan('free')
  }

  const handleAuthSuccess = async (newUser) => {
    setUser(newUser)
    setShowAuth(false)
    const sub = await subscriptionService.getStatus(true)
    setPlan(sub?.plan || 'free')
  }

  if (loading) return <div className="user-section user-section--loading" />

  return (
    <div className="user-section">
      {showAuth && (
        <AuthModal
          onSuccess={handleAuthSuccess}
          onClose={() => setShowAuth(false)}
          reason="Войди, чтобы сохранять прогресс и получить AI-подсказки."
        />
      )}

      {/* Avatar + name row */}
      <div className="user-card">
        <div className="user-card__avatar">
          {user?.avatar
            ? <img src={user.avatar} alt={user.name} className="user-card__avatar-img" />
            : user?.name
              ? <span className="user-card__avatar-fallback">{user.name[0]}</span>
              : <span className="user-card__avatar-guest">👤</span>
          }
        </div>
        <div className="user-card__info">
          <div className="user-card__name">
            {user ? (user.name || user.email) : 'Гость'}
          </div>
          <div className="user-card__sub">
            {user
              ? (plan === 'premium' ? '✨ Premium' : 'Free план')
              : 'Войти для синхронизации'
            }
          </div>
        </div>
        {user && (
          <button className="user-card__signout" onClick={handleSignOut} title="Выйти">
            ↩
          </button>
        )}
      </div>

      {/* Mode selector */}
      <div className="mode-label">Режим подготовки</div>
      <div className="mode-buttons">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={`mode-btn ${mode === m.id ? 'mode-btn--active' : ''}`}
            onClick={() => onModeChange?.(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Sign-in prompt for guests */}
      {!user && (
        <button className="user-signin-btn" onClick={() => setShowAuth(true)}>
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Войти через Google
        </button>
      )}
    </div>
  )
}
