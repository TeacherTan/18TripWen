import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { user, loading, loginWithPassword } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) return <div className="auth-page">加载中…</div>
  if (user) return <Navigate to="/welcome" replace />

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await loginWithPassword(form.username.trim(), form.password)
      navigate('/welcome', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <h1>登录</h1>
      <p>使用注册时的用户名和密码登录，或碰触 NFC 身份卡。</p>
      <form onSubmit={onSubmit} className="auth-form">
        <label>
          用户名
          <input name="username" value={form.username} onChange={onChange} required />
        </label>
        <label>
          密码
          <input name="password" type="password" value={form.password} onChange={onChange} required />
        </label>
        {error && <div className="auth-error">{error}</div>}
        <button type="submit" disabled={submitting}>{submitting ? '登录中…' : '登录'}</button>
      </form>
      <div className="auth-actions">
        <Link to="/">返回首页</Link>
      </div>
    </div>
  )
}
