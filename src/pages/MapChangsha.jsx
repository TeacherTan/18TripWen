import { Link } from 'react-router-dom'

export default function MapChangsha() {
  return (
    <div className="map-page">
      <header className="map-header">
        <Link to="/map" className="map-back">{'< 返回'}</Link>
        <h1 className="map-title">长沙地图</h1>
        <span className="map-spacer" />
      </header>
      <div className="map-coming-soon">
        <div className="map-coming-soon__pulse">
          <div className="map-coming-soon__big">敬请期待</div>
          <div className="map-coming-soon__sub">COMING SOON</div>
        </div>
        <p className="map-coming-soon__hint">长沙站地图正在筹备中</p>
      </div>
    </div>
  )
}
