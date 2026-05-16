import { useEffect, useState, useCallback } from 'react'
import { apiFetch } from '../../api/client'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [includeDeactivated, setIncludeDeactivated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modal, setModal] = useState(null) // { type: 'create' | 'transfer', ... }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (includeDeactivated) params.set('include_deactivated', '1')
      const data = await apiFetch(`/admin/users?${params.toString()}`)
      setUsers(data.users)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [search, includeDeactivated])

  useEffect(() => { load() }, [load])

  const onAction = async (action, user) => {
    try {
      if (action === 'deactivate') {
        if (!confirm(`确认停用 ${user.username || '该用户'}？`)) return
        await apiFetch(`/admin/users/${user.id}/deactivate`, { method: 'PUT' })
      } else if (action === 'regen') {
        if (!confirm(`重新生成 ${user.username || '该用户'} 的 nfc_token？旧卡将失效。`)) return
        const res = await apiFetch(`/admin/users/${user.id}/regen-token`, { method: 'POST' })
        alert(`新 nfc_token：${res.user.nfc_token}`)
      } else if (action === 'report-loss') {
        if (!confirm(`挂失 ${user.username || '该用户'}？将生成新卡 token。`)) return
        const res = await apiFetch(`/admin/users/${user.id}/report-loss`, { method: 'POST' })
        alert(`挂失成功，新 nfc_token：${res.user.nfc_token}`)
      }
      load()
    } catch (err) {
      alert(`操作失败：${err.message}`)
    }
  }

  return (
    <>
      <h1>用户管理</h1>
      <div className="admin-toolbar">
        <input
          placeholder="搜索用户名或城市"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
        />
        <button className="secondary" onClick={load}>搜索</button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem', color: '#94a3b8' }}>
          <input
            type="checkbox"
            checked={includeDeactivated}
            onChange={(e) => setIncludeDeactivated(e.target.checked)}
          />
          含已停用
        </label>
        <span style={{ flex: 1 }} />
        <button onClick={() => setModal({ type: 'create', city: '' })}>+ 新增空白用户</button>
        <button className="secondary" onClick={() => setModal({ type: 'transfer', source: '', target: '' })}>数据迁移</button>
      </div>

      {error && <div className="auth-error">{error}</div>}
      {loading ? (
        <p>加载中…</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>用户名</th>
              <th>城市</th>
              <th>角色</th>
              <th>状态</th>
              <th>nfc_token</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={u.deactivated_at ? 'deactivated' : ''}>
                <td>{u.username || <em>未注册</em>}</td>
                <td>{u.city || '—'}</td>
                <td>{u.role}</td>
                <td>{u.deactivated_at ? '已停用' : (u.is_registered ? '已注册' : '待注册')}</td>
                <td><span className="admin-token">{u.nfc_token}</span></td>
                <td className="actions">
                  {!u.deactivated_at && (
                    <>
                      <button onClick={() => onAction('regen', u)}>重发 NFC</button>
                      <button onClick={() => onAction('report-loss', u)}>挂失</button>
                      <button className="danger" onClick={() => onAction('deactivate', u)}>停用</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8' }}>无数据</td></tr>
            )}
          </tbody>
        </table>
      )}

      {modal?.type === 'create' && (
        <CreateUserModal modal={modal} setModal={setModal} onDone={load} />
      )}
      {modal?.type === 'transfer' && (
        <TransferModal modal={modal} setModal={setModal} onDone={load} />
      )}
    </>
  )
}

function CreateUserModal({ modal, setModal, onDone }) {
  const [submitting, setSubmitting] = useState(false)
  const [created, setCreated] = useState(null)
  const submit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await apiFetch('/admin/users', { method: 'POST', body: { city: modal.city || null } })
      setCreated(res.user)
    } catch (err) {
      alert(`创建失败：${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <div className="admin-modal-backdrop">
      <div className="admin-modal">
        <h2>新增空白用户</h2>
        {created ? (
          <>
            <p>用户已创建，请将以下 nfc_token 写入 NFC 卡：</p>
            <p className="admin-token" style={{ wordBreak: 'break-all' }}>{created.nfc_token}</p>
            <div className="actions">
              <button onClick={() => { setModal(null); onDone(); }}>完成</button>
            </div>
          </>
        ) : (
          <form onSubmit={submit}>
            <label>
              城市（可选）
              <input value={modal.city} onChange={(e) => setModal({ ...modal, city: e.target.value })} />
            </label>
            <div className="actions">
              <button type="button" className="cancel" onClick={() => setModal(null)}>取消</button>
              <button type="submit" disabled={submitting}>{submitting ? '创建中…' : '创建'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function TransferModal({ modal, setModal, onDone }) {
  const [submitting, setSubmitting] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    if (!confirm('确认迁移？source 账号将被永久停用，不可逆。')) return
    setSubmitting(true)
    try {
      const res = await apiFetch('/admin/users/transfer', {
        method: 'POST',
        body: { sourceUserId: modal.source.trim(), targetUserId: modal.target.trim() },
      })
      alert(`迁移完成：${res.migrated_check_ins} 条打卡迁移，${res.dropped_duplicate_check_ins} 条重复丢弃`)
      setModal(null)
      onDone()
    } catch (err) {
      alert(`迁移失败：${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <div className="admin-modal-backdrop">
      <div className="admin-modal">
        <h2>用户数据迁移</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>将 source 的打卡记录合并到 target，并停用 source。</p>
        <form onSubmit={submit}>
          <label>
            source 用户 ID
            <input value={modal.source} onChange={(e) => setModal({ ...modal, source: e.target.value })} required />
          </label>
          <label>
            target 用户 ID
            <input value={modal.target} onChange={(e) => setModal({ ...modal, target: e.target.value })} required />
          </label>
          <div className="actions">
            <button type="button" className="cancel" onClick={() => setModal(null)}>取消</button>
            <button type="submit" disabled={submitting}>{submitting ? '迁移中…' : '执行迁移'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
