import { useRef } from 'react'
import styles from './FloorStack.module.css'

export default function FloorStack({ floors, npcs = [], active, onActiveChange, highlighted, onPickNpc }) {
  const dragRef = useRef({ startY: null })

  const onPointerDown = (e) => {
    if (e.target.closest('button')) return
    dragRef.current.startY = e.clientY
  }
  const onPointerUp = (e) => {
    const { startY } = dragRef.current
    dragRef.current.startY = null
    if (startY == null) return
    const dy = e.clientY - startY
    if (Math.abs(dy) < 60) return
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
      onPointerUp={onPointerUp}
      onPointerCancel={() => { dragRef.current.startY = null }}
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
              style={{
                transform: `translate(-50%, -50%) translateY(${diff * -55}%) translateZ(${-abs * 80}px) scale(${1 - abs * 0.08})`,
                opacity: isActive ? 1 : Math.max(0.18, 1 - abs * 0.3),
                zIndex: 10 - abs,
                pointerEvents: isActive ? 'auto' : 'none',
              }}
            >
              <img src={f.image} alt={f.name} className={styles.floorImg} />
              {npcs.filter((n) => n.floor === f.id).map((n) => (
                <button
                  key={n.id}
                  className={styles.pin}
                  data-checked={n.unlocked}
                  data-highlighted={highlighted === n.id}
                  style={{ left: `${n.pos_x}%`, top: `${n.pos_y}%` }}
                  onClick={(e) => { e.stopPropagation(); onPickNpc?.(n.id) }}
                  title={n.name}
                >
                  <img src="/shumai.png" alt={n.name} />
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
