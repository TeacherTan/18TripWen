import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { user, loading, register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '', city: '' })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) return <div className="auth-page">加载中…</div>
  // 没有有效 JWT（即未通过 NFC 进入）就不让访问注册页
  if (!user) return <Navigate to="/login" replace />
  // 已注册用户直接去欢迎页
  if (user.is_registered) return <Navigate to="/welcome" replace />

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await register(form.username.trim(), form.password, form.city.trim() || null)
      navigate('/welcome', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <h1>注册账号</h1>
      <p>完成注册后即可参与打卡活动。</p>
      <form onSubmit={onSubmit} className="auth-form">
        <label>
          用户名
          <input name="username" value={form.username} onChange={onChange} required maxLength={50} />
        </label>
        <label>
          密码
          <input name="password" type="password" value={form.password} onChange={onChange} required minLength={4} />
        </label>
        <label>
          所在城市
          <input name="city" value={form.city} onChange={onChange} maxLength={50} placeholder="如：长沙" />
        </label>
        {error && <div className="auth-error">{error}</div>}
        <button type="submit" disabled={submitting}>{submitting ? '提交中…' : '注册'}</button>
      </form>
    </div>
  )
}
