import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Welcome() {
  const { user, loading, logout } = useAuth()

  if (loading) return <div className="auth-page">加载中…</div>
  if (!user) return <Navigate to="/login" replace />

  const greeting = user.city ? `你好，${user.city}` : '欢迎来到 18TRIP'

  return (
    <div className="auth-page">
      <h1>{greeting}</h1>
      <p>{user.username}，欢迎参加 18TRIP OnLy 长沙活动。</p>
      <div className="auth-actions">
        <Link to="/profile">成就墙</Link>
        <Link to="/">返回首页</Link>
        <button type="button" onClick={logout}>退出登录</button>
      </div>
    </div>
  )
}
