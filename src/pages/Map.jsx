import { Link } from 'react-router-dom'

export default function MapHub() {
  return (
    <div className="map-page">
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
