import { useEffect, useState, useCallback } from 'react'
import { apiFetch } from '../../api/client'

export default function AdminCheckIns() {
  const [records, setRecords] = useState([])
  const [users, setUsers] = useState([])
  const [spots, setSpots] = useState([])
  const [filter, setFilter] = useState({ userId: '', spotId: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)

  // 加载下拉选项
  useEffect(() => {
    Promise.all([
      apiFetch('/admin/users'),
      apiFetch('/admin/spots?include_inactive=1'),
    ]).then(([u, s]) => {
      setUsers(u.users.filter((x) => !x.deactivated_at))
      setSpots(s.spots)
    })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filter.userId) params.set('userId', filter.userId)
      if (filter.spotId) params.set('spotId', filter.spotId)
      const data = await apiFetch(`/admin/check-ins?${params.toString()}`)
      setRecords(data.check_ins)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [filter])

  useEffect(() => { load() }, [load])

  return (
    <>
      <h1>打卡记录</h1>
      <div className="admin-toolbar">
        <select value={filter.userId} onChange={(e) => setFilter({ ...filter, userId: e.target.value })}>
          <option value="">全部用户</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.username || `未注册(${u.id.slice(0,8)})`}</option>
          ))}
        </select>
        <select value={filter.spotId} onChange={(e) => setFilter({ ...filter, spotId: e.target.value })}>
          <option value="">全部打卡点</option>
          {spots.map((s) => (
            <option key={s.id} value={s.id}>{s.display_order}. {s.name}</option>
          ))}
        </select>
        <span style={{ flex: 1 }} />
        <button onClick={() => setModalOpen(true)}>+ 手动补卡</button>
      </div>

      {error && <div className="auth-error">{error}</div>}
      {loading ? <p>加载中…</p> : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>用户</th>
              <th>打卡点</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.checked_at).toLocaleString('zh-CN')}</td>
                <td>{r.username || <em>未注册</em>}</td>
                <td>{r.display_order}. {r.spot_name}</td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr><td colSpan={3} style={{ textAlign: 'center', color: '#94a3b8' }}>无记录</td></tr>
            )}
          </tbody>
        </table>
      )}

      {modalOpen && (
        <SupplementModal users={users} spots={spots} onClose={() => setModalOpen(false)} onDone={load} />
      )}
    </>
  )
}

function SupplementModal({ users, spots, onClose, onDone }) {
  const [form, setForm] = useState({ userId: '', spotId: '' })
  const [submitting, setSubmitting] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await apiFetch('/admin/check-ins/supplement', {
        method: 'POST',
        body: { userId: form.userId, spotId: form.spotId },
      })
      onClose()
      onDone()
    } catch (err) { alert(`补卡失败：${err.message}`) }
    finally { setSubmitting(false) }
  }
  return (
    <div className="admin-modal-backdrop">
      <div className="admin-modal">
        <h2>手动补卡</h2>
        <form onSubmit={submit}>
          <label>
            用户
            <select value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} required>
              <option value="">请选择</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.username || `未注册(${u.id.slice(0,8)})`}</option>
              ))}
            </select>
          </label>
          <label>
            打卡点
            <select value={form.spotId} onChange={(e) => setForm({ ...form, spotId: e.target.value })} required>
              <option value="">请选择</option>
              {spots.filter((s) => s.active).map((s) => (
                <option key={s.id} value={s.id}>{s.display_order}. {s.name}</option>
              ))}
            </select>
          </label>
          <div className="actions">
            <button type="button" className="cancel" onClick={onClose}>取消</button>
            <button type="submit" disabled={submitting}>{submitting ? '提交中…' : '补卡'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
