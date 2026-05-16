import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../api/client'

/**
 * 检测 URL 中 ?spot=TOKEN 参数：
 * - 已登录 → POST /api/check-in，结果通过 navigate state 传给 /checkin 页面
 * - 未登录 → 跳转 /login 并保留 spot 参数，登录后由 /login 重新进入主路由再触发本 hook
 */
export function useSpotCheckIn() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const handledRef = useRef(false)

  useEffect(() => {
    const token = params.get('spot')
    if (!token || loading || handledRef.current) return

    if (!user) {
      // 未登录：保留 spot 参数，登录后跳回首页时本 hook 会再次触发
      handledRef.current = true
      navigate(`/login?next=${encodeURIComponent(`/?spot=${token}`)}`, { replace: true })
      return
    }

    handledRef.current = true
    apiFetch('/check-in', { method: 'POST', body: { spotToken: token } })
      .then((result) => {
        // 清掉 spot query 防止刷新重复触发
        const next = new URLSearchParams(params)
        next.delete('spot')
        setParams(next, { replace: true })
        navigate('/checkin', { replace: true, state: result })
      })
      .catch((err) => {
        handledRef.current = false
        alert(`打卡失败：${err.message}`)
      })
  }, [params, setParams, navigate, user, loading])
}
