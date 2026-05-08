import styles from './Hero.module.css'

import bg from '../../assets/main-page/背景.png'
import tuya from '../../assets/main-page/涂鸦.png'
import huangban from '../../assets/main-page/黄板.png'
import baiban from '../../assets/main-page/白板.png'
import zuobiao from '../../assets/main-page/坐标.png'
import riqi from '../../assets/main-page/日期.png'
import biaoti from '../../assets/main-page/标题.png'
import changsha from '../../assets/main-page/长沙对话框.png'
import caidai2 from '../../assets/main-page/彩带2.png'
import shaomai from '../../assets/main-page/烧卖.png'
import hua from '../../assets/main-page/椛.png'
import feng from '../../assets/main-page/楓.png'

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
