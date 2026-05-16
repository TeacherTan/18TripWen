import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function AdminLayout() {
  const { user, loading, logout } = useAuth()

  if (loading) return <div className="auth-page">加载中…</div>
  if (!user) return <Navigate to="/login?next=/admin" replace />
  if (user.role !== 'admin') return <Navigate to="/" replace />

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__title">18TRIP 管理后台</div>
        <nav>
          <NavLink to="/admin/users" className={({ isActive }) => isActive ? 'active' : ''}>用户管理</NavLink>
          <NavLink to="/admin/spots" className={({ isActive }) => isActive ? 'active' : ''}>打卡点</NavLink>
          <NavLink to="/admin/check-ins" className={({ isActive }) => isActive ? 'active' : ''}>打卡记录</NavLink>
        </nav>
        <div className="admin-sidebar__footer">
          <span>{user.username}</span>
          <button type="button" onClick={logout}>退出</button>
        </div>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}
