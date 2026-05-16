/**
 * 成就墙的单个槽位。
 * 设计师交付正式图纸前使用纯色方块占位：
 *   - locked   → 黑色方块（轮廓占位）
 *   - unlocked → 灰色方块（彩色图纸占位）
 * 后续替换为：import.meta.glob 加载 src/assets/achievements/{asset_key}_{locked|unlocked}.png
 */
export default function AchievementSlot({ assetKey, name, unlocked, highlighted = false }) {
  return (
    <div className={`achievement-slot ${unlocked ? 'unlocked' : 'locked'} ${highlighted ? 'highlighted' : ''}`}>
      <div className="achievement-slot__art" data-asset={assetKey} aria-hidden>
        {/* 占位：设计师交付资源后替换为 <img src={...}/> */}
      </div>
      <div className="achievement-slot__name">{name}</div>
    </div>
  )
}
