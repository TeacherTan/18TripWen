import styles from './AchievementListItem.module.css'
import placeholderIcon from '../../assets/Chibi_character_splitting/kfk/烧卖（更新版）.png'
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

// 这几个 NPC 原图偏亮，统一滤镜后仍显浅，锁定态单独加深以与其余对齐
const DARK_LOCKED_NPCS = new Set(['npc_ushio', 'npc_chihiro', 'npc_toi', 'npc_ryui'])

export default function AchievementListItem({ spot }) {
  const unlocked = spot.unlocked
  const mappedIcon = ICON_MAP[spot.asset_key]
  const npcIcon = spot.type === 'npc' && spot.asset_key ? `/npc/${spot.asset_key}.png` : placeholderIcon
  const npcLockedClass = DARK_LOCKED_NPCS.has(spot.asset_key) ? styles.iconLockedNpcDark : styles.iconLockedNpc
  return (
    <li className={`${styles.item} ${unlocked ? styles.unlocked : styles.locked}`}>
      <div className={styles.iconWrap}>
        {mappedIcon
          ? <img src={mappedIcon} alt={spot.name} className={`${styles.iconVenue} ${unlocked ? '' : styles.iconLocked}`} />
          : <img src={npcIcon} alt={spot.name} className={`${styles.icon} ${unlocked ? '' : npcLockedClass}`} />
        }
      </div>
      <div className={styles.text}>
        <div className={styles.title}>{unlocked ? spot.name : '???'}</div>
        <div className={styles.desc}>{unlocked ? (spot.description || '描述待补') : '???'}</div>
      </div>
    </li>
  )
}
