import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FLOORS } from '../data/venueFloors'
import { MOCK_NPCS } from '../data/mockNpcs'
import FloorStack from '../components/FloorStack/FloorStack'

export default function MapVenue() {
  const navigate = useNavigate()
  const [active, setActive] = useState(FLOORS[0]?.id ?? 1)
  const [highlighted, setHighlighted] = useState(null)

  const npcs = MOCK_NPCS
  const floorNpcs = npcs.filter((n) => n.floor === active)

  const pickPin = (npcId) => {
    setHighlighted(npcId)
    setTimeout(() => setHighlighted((cur) => (cur === npcId ? null : cur)), 1800)
  }

  const goNpc = (npcId) => {
    navigate(`/npc/${npcId}`)
  }

  return (
    <div className="map-page map-page--venue">
      <header className="map-header">
        <Link to="/map" className="map-back">{'< 返回'}</Link>
        <h1 className="map-title">场馆地图</h1>
        <span className="map-spacer" />
      </header>

      <div className="map-venue">
        <FloorStack
          floors={FLOORS}
          npcs={npcs}
          active={active}
          onActiveChange={setActive}
          highlighted={highlighted}
          onPickNpc={pickPin}
        />

        <section className="venue-list">
          <h2>
            {FLOORS.find((f) => f.id === active)?.name}
            <span> · {floorNpcs.length} 位居民</span>
          </h2>
          {floorNpcs.length === 0 ? (
            <p className="venue-list__empty">本层暂无人物</p>
          ) : (
            <ul>
              {floorNpcs.map((n) => (
                <li
                  key={n.id}
                  className={`venue-list__item ${highlighted === n.id ? 'highlighted' : ''}`}
                  onClick={() => goNpc(n.id)}
                  style={{ '--theme': n.theme_color }}
                >
                  <img src={n.asset_key ? `/npc/${n.asset_key}.png` : "/shumai.png"} alt={n.name} className="venue-list__avatar" />
                  <div className="venue-list__body">
                    <div className="venue-list__name">{n.name}</div>
                    <div className="venue-list__intro">{n.activity_intro || '活动待定'}</div>
                  </div>
                  <span className="venue-list__arrow">›</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
