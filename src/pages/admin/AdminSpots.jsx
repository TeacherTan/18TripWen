import { useEffect, useState, useCallback } from 'react'
import { apiFetch } from '../../api/client'

const blankSpot = { name: '', asset_key: '', display_order: 1 }

export default function AdminSpots() {
  const [spots, setSpots] = useState([])
  const [includeInactive, setIncludeInactive] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modal, setModal] = useState(null) // { type: 'create' | 'edit', spot? }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (includeInactive) params.set('include_inactive', '1')
      const data = await apiFetch(`/admin/spots?${params.toString()}`)
      setSpots(data.spots)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [includeInactive])

  useEffect(() => { load() }, [load])

  const onDeactivate = async (spot) => {
    if (!confirm(`停用 ${spot.name}？已有打卡记录会保留。`)) return
    try {
      await apiFetch(`/admin/spots/${spot.id}/deactivate`, { method: 'PUT' })
      load()
    } catch (err) { alert(`停用失败：${err.message}`) }
  }

  const onToggleActive = async (spot) => {
    try {
      await apiFetch(`/admin/spots/${spot.id}`, { method: 'PUT', body: { active: !spot.active } })
      load()
    } catch (err) { alert(`切换失败：${err.message}`) }
  }

  return (
    <>
      <h1>打卡点管理</h1>
      <div className="admin-toolbar">
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem', color: '#94a3b8' }}>
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
          />
          含已停用
        </label>
        <span style={{ flex: 1 }} />
        <button onClick={() => setModal({ type: 'create', spot: blankSpot })}>+ 新增打卡点</button>
      </div>

      {error && <div className="auth-error">{error}</div>}
      {loading ? <p>加载中…</p> : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>顺序</th>
              <th>名称</th>
              <th>asset_key</th>
              <th>状态</th>
              <th>spot_token</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {spots.map((s) => (
              <tr key={s.id} className={s.active ? '' : 'deactivated'}>
                <td>{s.display_order}</td>
                <td>{s.name}</td>
                <td>{s.asset_key}</td>
                <td>{s.active ? '启用' : '停用'}</td>
                <td><span className="admin-token">{s.spot_token}</span></td>
                <td className="actions">
                  <button onClick={() => setModal({ type: 'edit', spot: s })}>编辑</button>
                  {s.active
                    ? <button className="danger" onClick={() => onDeactivate(s)}>停用</button>
                    : <button onClick={() => onToggleActive(s)}>重新启用</button>}
                </td>
              </tr>
            ))}
            {spots.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8' }}>无数据</td></tr>
            )}
          </tbody>
        </table>
      )}

      {modal && <SpotModal modal={modal} setModal={setModal} onDone={load} />}
    </>
  )
}

function SpotModal({ modal, setModal, onDone }) {
  const [form, setForm] = useState(modal.spot)
  const [submitting, setSubmitting] = useState(false)
  const isEdit = modal.type === 'edit'

  const submit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (isEdit) {
        await apiFetch(`/admin/spots/${form.id}`, {
          method: 'PUT',
          body: { name: form.name, asset_key: form.asset_key, display_order: Number(form.display_order) },
        })
      } else {
        await apiFetch('/admin/spots', {
          method: 'POST',
          body: { name: form.name, asset_key: form.asset_key, display_order: Number(form.display_order) },
        })
      }
      setModal(null)
      onDone()
    } catch (err) { alert(`保存失败：${err.message}`) }
    finally { setSubmitting(false) }
  }

  return (
    <div className="admin-modal-backdrop">
      <div className="admin-modal">
        <h2>{isEdit ? '编辑打卡点' : '新增打卡点'}</h2>
        <form onSubmit={submit}>
          <label>
            名称
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={50} />
          </label>
          <label>
            asset_key（图纸资源标识，如 spot_07）
            <input value={form.asset_key} onChange={(e) => setForm({ ...form, asset_key: e.target.value })} required />
          </label>
          <label>
            显示顺序
            <input type="number" min="1" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: e.target.value })} required />
          </label>
          <div className="actions">
            <button type="button" className="cancel" onClick={() => setModal(null)}>取消</button>
            <button type="submit" disabled={submitting}>{submitting ? '保存中…' : '保存'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
