import { useEffect, useState, useCallback } from 'react'
import { apiFetch } from '../../api/client'

const PAGE_SIZE = 30

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [includeDeactivated, setIncludeDeactivated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modal, setModal] = useState(null) // { type: 'create' | 'transfer', ... }
  const [selected, setSelected] = useState(() => new Set())
  const [bulkConfirm, setBulkConfirm] = useState(null) // { action: 'clear' | 'reset', count }
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (includeDeactivated) params.set('include_deactivated', '1')
      const data = await apiFetch(`/admin/users?${params.toString()}`)
      setUsers(data.users)
      setSelected(new Set())
      setPage(1)
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
      } else if (action === 'report-loss') {
        setModal({ type: 'report-loss', source: user, target: '' })
        return
      }
      load()
    } catch (err) {
      alert(`操作失败：${err.message}`)
    }
  }

  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagedUsers = users.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const isEligible = (u) => !u.deactivated_at && u.role !== 'admin'
  const pageEligible = pagedUsers.filter(isEligible)
  const allSelected = pageEligible.length > 0 && pageEligible.every((u) => selected.has(u.id))

  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allSelected) pageEligible.forEach((u) => next.delete(u.id))
      else pageEligible.forEach((u) => next.add(u.id))
      return next
    })
  }

  const runBulk = async (action) => {
    const ids = [...selected]
    const path = action === 'reset' ? '/admin/users/reset-card' : '/admin/users/clear-registration'
    try {
      const res = await apiFetch(path, { method: 'POST', body: { ids } })
      const extra = res.deleted_check_ins != null ? `，删除打卡 ${res.deleted_check_ins} 条` : ''
      alert(`操作完成：影响 ${res.affected} 张卡${extra}`)
      setBulkConfirm(null)
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

      {selected.size > 0 && (
        <div className="admin-bulkbar">
          <span>已选 {selected.size} 项</span>
          <button className="secondary" onClick={() => setBulkConfirm({ action: 'clear', count: selected.size })}>仅清空注册信息</button>
          <button className="secondary" onClick={() => setBulkConfirm({ action: 'reset', count: selected.size })}>完全重置为新卡</button>
          <button className="secondary" onClick={() => setSelected(new Set())}>取消选择</button>
        </div>
      )}

      {error && <div className="auth-error">{error}</div>}
      {loading ? (
        <p>加载中…</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: 32 }}>
                <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="全选" />
              </th>
              <th>用户名</th>
              <th>城市</th>
              <th>角色</th>
              <th>状态</th>
              <th>nfc_token</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {pagedUsers.map((u) => (
              <tr key={u.id} className={u.deactivated_at ? 'deactivated' : ''}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(u.id)}
                    disabled={!isEligible(u)}
                    onChange={() => toggleOne(u.id)}
                    aria-label="选择该卡"
                  />
                </td>
                <td>{u.username || <em>未注册</em>}</td>
                <td>{u.city || '—'}</td>
                <td>{u.role}</td>
                <td>{u.deactivated_at ? '已停用' : (u.is_registered ? '已注册' : '待注册')}</td>
                <td><span className="admin-token">{u.nfc_token}</span></td>
                <td className="actions">
                  {!u.deactivated_at && (
                    <>
                      <button onClick={() => onAction('report-loss', u)}>挂失</button>
                      <button className="danger" onClick={() => onAction('deactivate', u)}>停用</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8' }}>无数据</td></tr>
            )}
          </tbody>
        </table>
      )}

      {!loading && users.length > 0 && (
        <div className="admin-pagination">
          <button
            className="secondary"
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            上一页
          </button>
          <span>第 {currentPage} / {totalPages} 页 · 共 {users.length} 条</span>
          <button
            className="secondary"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            下一页
          </button>
        </div>
      )}

      {modal?.type === 'create' && (
        <CreateUserModal modal={modal} setModal={setModal} onDone={load} />
      )}
      {modal?.type === 'transfer' && (
        <TransferModal modal={modal} setModal={setModal} onDone={load} />
      )}
      {modal?.type === 'report-loss' && (
        <ReportLossModal modal={modal} setModal={setModal} onDone={load} />
      )}
      {bulkConfirm && (
        <ConfirmBulkModal
          action={bulkConfirm.action}
          count={bulkConfirm.count}
          onCancel={() => setBulkConfirm(null)}
          onConfirm={() => runBulk(bulkConfirm.action)}
        />
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

function ReportLossModal({ modal, setModal, onDone }) {
  const [submitting, setSubmitting] = useState(false)
  const source = modal.source
  const submit = async (e) => {
    e.preventDefault()
    if (!confirm(`确认挂失 ${source.username || '该卡'}？源卡将被停用，身份与打卡迁移到目标空白卡（token 不变）。`)) return
    setSubmitting(true)
    try {
      const res = await apiFetch(`/admin/users/${source.id}/report-loss`, {
        method: 'POST',
        body: { targetUserId: modal.target.trim() },
      })
      alert(`挂失完成：${res.migrated_check_ins} 条打卡已迁移到新卡，源卡已停用。`)
      setModal(null)
      onDone()
    } catch (err) {
      alert(`挂失失败：${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <div className="admin-modal-backdrop">
      <div className="admin-modal">
        <h2>挂失换卡</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
          停用源卡「{source.username || '未注册'}」（id: {source.id}），将其注册信息与打卡记录迁移到一张空白备用卡。
          两张卡的 nfc_token 均不会改变。
        </p>
        <form onSubmit={submit}>
          <label>
            目标空白卡 用户 ID
            <input
              value={modal.target}
              onChange={(e) => setModal({ ...modal, target: e.target.value })}
              placeholder="一张未注册的空白卡 user id"
              required
            />
          </label>
          <div className="actions">
            <button type="button" className="cancel" onClick={() => setModal(null)}>取消</button>
            <button type="submit" disabled={submitting}>{submitting ? '迁移中…' : '执行挂失'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ConfirmBulkModal({ action, count, onCancel, onConfirm }) {
  const isReset = action === 'reset'
  const title = isReset ? '完全重置为新卡' : '仅清空注册信息'
  const desc = isReset
    ? `将清空 ${count} 张卡的注册信息，并删除其全部打卡记录，恢复为出厂空白卡。卡片 token 保留不变。`
    : `将清空 ${count} 张卡的注册信息（用户名/密码/城市），打卡记录与卡片 token 均保留。`
  return (
    <div className="admin-modal-backdrop">
      <div className="admin-modal">
        <h2>{title}</h2>
        <p style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>{desc}</p>
        <p style={{ fontSize: '0.85rem', color: '#f87171' }}>此操作不可撤销，请确认无误后再继续。</p>
        <div className="actions confirm-swap">
          <button type="button" className="confirm-danger" onClick={onConfirm}>确认{title}</button>
          <button type="button" className="cancel-primary" onClick={onCancel}>取消</button>
        </div>
      </div>
    </div>
  )
}
