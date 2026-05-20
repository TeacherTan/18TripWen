import styles from './Hero.module.css'

import bg from '../../assets/main-page/background.png'
import tuya from '../../assets/main-page/graffiti.png'
import huangban from '../../assets/main-page/yellowboard.png'
import baiban from '../../assets/main-page/whiteboard.png'
import zuobiao from '../../assets/main-page/coordinates.png'
import riqi from '../../assets/main-page/date.png'
import biaoti from '../../assets/main-page/title.png'
import changsha from '../../assets/main-page/changsha-bubble.png'
import caidai2 from '../../assets/main-page/ribbon2.png'
import shaomai from '../../assets/main-page/shumai.png'
import hua from '../../assets/main-page/momiji.png'
import feng from '../../assets/main-page/kaede.png'

const layers = [
  { src: bg, className: 'bg', alt: '背景' },
  { src: tuya, className: 'tuya', alt: '涂鸦' },
  { src: huangban, className: 'huangban', alt: '黄板' },
  { src: baiban, className: 'baiban', alt: '白板' },
  { src: zuobiao, className: 'zuobiao', alt: '坐标' },
  { src: riqi, className: 'riqi', alt: '日期' },
  { src: biaoti, className: 'biaoti', alt: '标题' },
  { src: changsha, className: 'changsha', alt: '长沙对话框' },
  { src: caidai2, className: 'caidai2', alt: '彩带2' },
  { src: shaomai, className: 'shaomai', alt: '烧卖' },
  { src: hua, className: 'hua', alt: '椛' },
  { src: feng, className: 'feng', alt: '楓' },
]

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.imageContainer}>
        {layers.map((layer) => (
          <div
            key={layer.className}
            className={`${styles.layer} ${styles[layer.className]}`}
          >
            <img src={layer.src} alt={layer.alt} draggable={false} />
          </div>
        ))}
      </div>
    </section>
  )
}
