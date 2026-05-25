import { useNavigate } from 'react-router-dom'
import styles from './Menu.module.css'

import icon1 from '../../assets/main-page/1.png'
import icon2 from '../../assets/main-page/2.png'
import icon3 from '../../assets/main-page/3.png'
import icon4 from '../../assets/main-page/4.png'
import icon5 from '../../assets/main-page/5.png'

const menuItems = [
  { icon: icon1, label: '地图',     sublabel: 'MAP',           to: '/map' },
  { icon: icon2, label: '区长情报', sublabel: 'CHARACTER',     to: null },
  { icon: icon3, label: '仓库',     sublabel: 'HUB',           to: '/profile' },
  { icon: icon4, label: '研修旅行', sublabel: 'TRAVEL PLAY',   to: null },
  { icon: icon5, label: '联系我们', sublabel: 'CONTACT US',    to: null },
]

export default function Menu() {
  const navigate = useNavigate()
  return (
    <nav className={styles.menu}>
      {menuItems.map((item, index) => {
        const isReverse = index % 2 === 1
        const clickable = !!item.to
        return (
          <div
            key={item.sublabel}
            className={`${styles.menuItem} ${isReverse ? styles.reverse : ''}`}
            onClick={() => clickable && navigate(item.to)}
            style={{ cursor: clickable ? 'pointer' : 'default', opacity: clickable ? 1 : 0.55 }}
          >
            <img className={styles.icon} src={item.icon} alt={item.label} draggable={false} />
            <div className={styles.textGroup}>
              <div className={styles.label}>{item.label}</div>
              <div className={styles.sublabel}>{item.sublabel}</div>
            </div>
          </div>
        )
      })}
    </nav>
  )
}
