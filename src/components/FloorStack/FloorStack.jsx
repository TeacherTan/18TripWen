import { useState } from 'react'
import styles from './FloorStack.module.css'

export default function FloorStack({ floors, npcs = [], highlighted, onPickNpc }) {
  const [active, setActive] = useState(floors[0]?.id ?? 1)

  return (
    <div className={styles.stage}>
      <div className={styles.group} data-active={active}>
        {floors.map((f) => (
          <div key={f.id} className={styles.floor} data-index={f.id}>
            <img src={f.image} alt={f.name} className={styles.floorImg} />
            {npcs.filter((n) => n.floor === f.id).map((n) => (
              <button
                key={n.id}
                className={styles.pin}
                data-checked={n.unlocked}
                data-highlighted={highlighted === n.id}
                style={{ left: `${n.pos_x}%`, top: `${n.pos_y}%` }}
                onClick={() => onPickNpc?.(n.id)}
                title={n.name}
              >
                <img src="/shumai.png" alt={n.name} />
              </button>
            ))}
          </div>
        ))}
      </div>
      <FloorPicker floors={floors} active={active} onChange={setActive} />
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
          onClick={() => onChange(f.id)}
        >
          {f.label}
          {active === f.id && <span className={styles.pickerDot} />}
        </button>
      ))}
    </div>
  )
}
