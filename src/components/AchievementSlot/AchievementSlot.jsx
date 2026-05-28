import imgVenue01 from '../../assets/R1ze.png'
import imgVenue02 from '../../assets/Day2.png'
import imgVenue03 from '../../assets/Ev3ns.png'
import imgVenue04 from '../../assets/L4mps.png'

const VENUE_ICONS = {
  venue_01: imgVenue01,
  venue_02: imgVenue02,
  venue_03: imgVenue03,
  venue_04: imgVenue04,
}

export default function AchievementSlot({ assetKey, name, unlocked, highlighted = false }) {
  const img = VENUE_ICONS[assetKey]
  return (
    <div className={`achievement-slot ${unlocked ? 'unlocked' : 'locked'} ${highlighted ? 'highlighted' : ''}`}>
      <div className="achievement-slot__art" data-asset={assetKey} aria-hidden>
        {img && <img src={img} alt={name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
      </div>
      <div className="achievement-slot__name">{name}</div>
    </div>
  )
}
