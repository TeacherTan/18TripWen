import styles from './AchievementListItem.module.css'
import placeholderIcon from '../../assets/Chibi_character_splitting/kfk/烧卖（更新版）.png'
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

export default function AchievementListItem({ spot }) {
  const unlocked = spot.unlocked
  const venueIcon = spot.type === 'venue' ? VENUE_ICONS[spot.asset_key] : null
  const iconUrl = venueIcon
    ?? (spot.type === 'npc' && spot.asset_key ? `/npc/${spot.asset_key}.png` : placeholderIcon)
  return (
    <li className={`${styles.item} ${unlocked ? styles.unlocked : styles.locked}`}>
      <div className={styles.iconWrap}>
        {venueIcon
          ? <img src={venueIcon} alt={spot.name} className={`${styles.iconVenue} ${unlocked ? '' : styles.iconLocked}`} />
          : unlocked
            ? <img src={iconUrl} alt={spot.name} className={styles.icon} />
            : <div className={styles.placeholder} />
        }
      </div>
      <div className={styles.text}>
        <div className={styles.title}>{unlocked ? spot.name : '???'}</div>
        <div className={styles.desc}>{unlocked ? (spot.description || '描述待补') : '???'}</div>
      </div>
    </li>
  )
}
