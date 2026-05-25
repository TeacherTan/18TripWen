import styles from './AchievementListItem.module.css'
import placeholderIcon from '../../assets/Chibi_character_splitting/kfk/烧卖（更新版）.png'

export default function AchievementListItem({ spot }) {
  const unlocked = spot.unlocked
  const iconUrl = spot.type === 'npc' && spot.asset_key ? `/npc/${spot.asset_key}.png` : placeholderIcon
  return (
    <li className={`${styles.item} ${unlocked ? styles.unlocked : styles.locked}`}>
      <div className={styles.iconWrap}>
        {unlocked ? <img src={iconUrl} alt={spot.name} className={styles.icon} /> : <div className={styles.placeholder} />}
      </div>
      <div className={styles.text}>
        <div className={styles.title}>{unlocked ? spot.name : '???'}</div>
        <div className={styles.desc}>{unlocked ? (spot.description || '描述待补') : '???'}</div>
      </div>
    </li>
  )
}
