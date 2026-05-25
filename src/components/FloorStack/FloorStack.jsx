import { useRef, useState } from 'react'
import styles from './FloorStack.module.css'

export default function FloorStack({ floors, npcs = [], active, onActiveChange, highlighted, onPickNpc }) {
  const dragRef = useRef({ startY: null, moved: false })
  const [expanded, setExpanded] = useState(false)

  const onPointerDown = (e) => {
    if (e.target.closest('button')) return
    dragRef.current.startY = e.clientY
    dragRef.current.moved = false
  }
  const onPointerMove = (e) => {
    const { startY } = dragRef.current
    if (startY == null) return
    if (Math.abs(e.clientY - startY) > 6) dragRef.current.moved = true
  }
  const onPointerUp = (e) => {
    const { startY, moved } = dragRef.current
    dragRef.current.startY = null
    dragRef.current.moved = false
    if (startY == null) return
    const dy = e.clientY - startY

    if (!moved || Math.abs(dy) < 60) {
      const floorEl = e.target.closest('[data-floor-id]')
      if (floorEl) {
        const id = Number(floorEl.dataset.floorId)
        if (id !== active) onActiveChange?.(id)
        setExpanded(true)
      } else {
        setExpanded(false)
      }
      return
    }

    const ids = floors.map((f) => f.id)
    const idx = ids.indexOf(active)
    if (idx < 0) return
    const next = dy < 0 ? Math.min(idx + 1, ids.length - 1) : Math.max(idx - 1, 0)
    onActiveChange?.(ids[next])
  }

  return (
    <div
      className={styles.stage}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { dragRef.current.startY = null; dragRef.current.moved = false }}
    >
      <div className={styles.group}>
        {floors.map((f) => {
          const diff = f.id - active
          const abs = Math.abs(diff)
          const isActive = diff === 0
          return (
            <div
              key={f.id}
              className={styles.floor}
              data-active={isActive}
              data-floor-id={f.id}
              style={{
                transform: `translate(-50%, -50%) translateY(${diff * (expanded ? -85 : -22)}%) translateZ(${-abs * (expanded ? 40 : 6)}px) scale(${1 - abs * (expanded ? 0.05 : 0.02)})`,
                opacity: isActive ? 1 : Math.max(expanded ? 0.4 : 0.6, 1 - abs * (expanded ? 0.25 : 0.12)),
                zIndex: 10 - abs,
                cursor: isActive ? 'default' : 'pointer',
              }}
            >
              <img src={f.image} alt={f.name} className={styles.floorImg} />
              {isActive && npcs.filter((n) => n.floor === f.id).map((n) => (
                <button
                  key={n.id}
                  className={styles.pin}
                  data-checked={n.unlocked}
                  data-highlighted={highlighted === n.id}
                  style={{ left: `${n.pos_x}%`, top: `${n.pos_y}%` }}
                  onClick={(e) => { e.stopPropagation(); onPickNpc?.(n.id) }}
                  title={n.name}
                >
                  <img src={n.asset_key ? `/npc/${n.asset_key}.png` : "/shumai.png"} alt={n.name} />
                </button>
              ))}
            </div>
          )
        })}
      </div>
      <FloorPicker floors={floors} active={active} onChange={onActiveChange} />
      <div className={styles.floorName}>
        {floors.find((f) => f.id === active)?.name}
      </div>
    </div>
  )
}

function FloorPicker({ floors, active, onChange }) {
  return (
    <div className={styles.picker}>
      {[...floors].reverse().map((f) => (
        <button
          key={f.id}
          className={styles.pickerBtn}
          data-active={active === f.id}
          onClick={(e) => { e.stopPropagation(); onChange?.(f.id) }}
        >
          {f.label}
          {active === f.id && <span className={styles.pickerDot} />}
        </button>
      ))}
    </div>
  )
}
