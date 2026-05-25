import { Link } from 'react-router-dom'
import momiji from '../assets/main-page/momiji.png'
import kaede from '../assets/main-page/kaede.png'

export default function MapHub() {
  return (
    <div className="map-page">
      <img src={momiji} className="map-deco map-deco--tl" alt="" draggable={false} />
      <img src={kaede}  className="map-deco map-deco--br" alt="" draggable={false} />
      <header className="map-header">
        <Link to="/" className="map-back">{'< 返回'}</Link>
        <h1 className="map-title">地图</h1>
        <span className="map-spacer" />
      </header>
      <div className="map-hub">
        <Link to="/map/changsha" className="map-card">
          <span className="map-card__label">长沙地图</span>
          <span className="map-card__sublabel">CHANGSHA</span>
        </Link>
        <Link to="/map/venue" className="map-card">
          <span className="map-card__label">场馆地图</span>
          <span className="map-card__sublabel">VENUE</span>
        </Link>
      </div>
    </div>
  )
}
