import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../api/client'
import AchievementSlot from '../components/AchievementSlot/AchievementSlot'

export default function Profile() {
  const { user, loading: authLoading, logout } = useAuth()
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    apiFetch('/check-in/status')
      .then(setStatus)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [user])

  if (authLoading) return <div className="auth-page">加载中…</div>
  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="auth-page profile-page">
      <header className="profile-header">
        <h1>{user.username}</h1>
        {user.city && <p className="profile-city">来自 {user.city}</p>}
      </header>

      <section className="achievement-wall">
        <div className="achievement-wall__header">
          <h2>成就墙</h2>
          {status && (
            <span className="achievement-wall__progress">
              已集齐 {status.unlocked_count}/{status.total} 张图纸
            </span>
          )}
        </div>

        {loading && <p>加载成就中…</p>}
        {error && <p className="auth-error">加载失败：{error}</p>}

        {status && (
          <div className="achievement-wall__grid">
            {status.spots.map((s) => (
              <AchievementSlot
                key={s.id}
                assetKey={s.asset_key}
                name={s.name}
                unlocked={s.unlocked}
              />
            ))}
          </div>
        )}
      </section>

      <div className="auth-actions">
        <Link to="/">返回首页</Link>
        <button type="button" onClick={logout}>退出登录</button>
      </div>
    </div>
  )
}
