import imgVenue01 from '../../assets/R1ze.png'
import imgVenue02 from '../../assets/Day2.png'
import imgVenue03 from '../../assets/Ev3ns.png'
import imgVenue04 from '../../assets/L4mps.png'
import imgAirplane from '../../assets/Chibi_character_splitting/kfk/Airplane.png'
import imgSign from '../../assets/Chibi_character_splitting/kfk/Sign.png'
import imgCamera from '../../assets/Chibi_character_splitting/kfk/Camera.png'
import imgFortune from '../../assets/Chibi_character_splitting/夜班/糖衣.png'
import imgPainter from '../../assets/Chibi_character_splitting/昼班/衣川季肋.png'

const ICON_MAP = {
  venue_01: imgVenue01,
  venue_02: imgVenue02,
  venue_03: imgVenue03,
  venue_04: imgVenue04,
  extra_plan: imgAirplane,
  extra_buyall: imgSign,
  extra_photo: imgCamera,
  extra_fortune: imgFortune,
  extra_painter: imgPainter,
}

export default function AchievementSlot({ assetKey, name, unlocked, highlighted = false }) {
  const img = ICON_MAP[assetKey]
  return (
    <div className={`achievement-slot ${unlocked ? 'unlocked' : 'locked'} ${highlighted ? 'highlighted' : ''}`}>
      <div className="achievement-slot__art" data-asset={assetKey} aria-hidden>
        {img && <img src={img} alt={name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
      </div>
      <div className="achievement-slot__name">{name}</div>
    </div>
  )
}
