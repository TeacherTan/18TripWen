import { useEffect } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AchievementSlot from '../components/AchievementSlot/AchievementSlot'

/**
 * 打卡结果页：依赖 useSpotCheckIn 通过 navigate state 传入的打卡结果。
 * state 形态来自 POST /api/check-in 的响应：
 *   { success, alreadyCheckedIn, spot: { name, asset_key, display_order }, total, unlocked_count, checkedAt? }
 */
export default function CheckIn() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const result = location.state

  // 滚回顶部，确保解锁动画可见
  useEffect(() => { window.scrollTo(0, 0) }, [])

  if (loading) return <div className="auth-page">加载中…</div>
  if (!user) return <Navigate to="/login" replace />
  if (!result) return <Navigate to="/profile" replace />

  const { alreadyCheckedIn, spot, total, unlocked_count } = result
  const title = alreadyCheckedIn ? '你已在此打过卡' : '打卡成功'

  return (
    <div className="auth-page checkin-result">
      <h1>{title}</h1>
      <p className="checkin-spot-name">{spot.name}</p>

      <div className="achievement-slot-wrapper">
        <AchievementSlot
          assetKey={spot.asset_key}
          name={spot.name}
          unlocked
          highlighted={!alreadyCheckedIn}
        />
      </div>

      <p className="checkin-progress">已解锁 {unlocked_count}/{total} 张图纸</p>

      <div className="auth-actions">
        <Link to="/profile">查看成就墙</Link>
        <Link to="/">继续探索</Link>
      </div>
    </div>
  )
}
