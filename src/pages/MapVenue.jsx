import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api/client'
import { FLOORS } from '../data/venueFloors'
import FloorStack from '../components/FloorStack/FloorStack'

export default function MapVenue() {
  const [npcs, setNpcs] = useState([])
  const [loading, setLoading] = useState(true)
  const [highlighted, setHighlighted] = useState(null)
  const listRefs = useRef({})

  useEffect(() => {
    apiFetch('/check-in/status')
      .then((data) => setNpcs(data.spots.filter((s) => s.type === 'npc')))
      .catch(() => setNpcs([]))
      .finally(() => setLoading(false))
  }, [])

  const pick = (npcId) => {
    setHighlighted(npcId)
    listRefs.current[npcId]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => setHighlighted((cur) => (cur === npcId ? null : cur)), 2000)
  }

  return (
    <div className="map-page">
      <header className="map-header">
        <Link to="/map" className="map-back">{'< 返回'}</Link>
        <h1 className="map-title">场馆地图</h1>
        <span className="map-spacer" />
      </header>

      <div className="map-venue">
        <FloorStack
          floors={FLOORS}
          npcs={npcs}
          highlighted={highlighted}
          onPickNpc={pick}
        />

        <section className="venue-list">
          <h2>楼层 NPC 列表</h2>
          {loading ? <p>加载中…</p> : (
            <ul>
              {npcs.map((n) => (
                <li
                  key={n.id}
                  ref={(el) => { listRefs.current[n.id] = el }}
                  className={`venue-list__item ${highlighted === n.id ? 'highlighted' : ''}`}
                  onClick={() => pick(n.id)}
                >
                  <img src="/shumai.png" alt={n.name} className="venue-list__avatar" />
                  <div>
                    <div className="venue-list__name">F{n.floor} · {n.name}</div>
                    <div className="venue-list__intro">{n.activity_intro || '活动待定'}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
