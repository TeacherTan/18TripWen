import { Link, useParams, Navigate } from 'react-router-dom'
import { MOCK_NPCS } from '../data/mockNpcs'

export default function NpcProfile() {
  const { id } = useParams()
  const npc = MOCK_NPCS.find((n) => n.id === id)

  if (!npc) return <Navigate to="/map/venue" replace />

  return (
    <div className="npc-page" style={{ '--theme': npc.theme_color }}>
      <header className="map-header">
        <Link to="/map/venue" className="map-back">{'< 返回'}</Link>
        <h1 className="map-title">{npc.name}</h1>
        <span className="map-spacer" />
      </header>

      <div className="npc-hero">
        <img src={npc.asset_key ? `/npc/${npc.asset_key}.png` : "/shumai.png"} alt={npc.name} className="npc-hero__avatar" />
        <div className="npc-hero__meta">
          <h1>{npc.name}</h1>
          <p>{npc.jp_name}</p>
          <p>{npc.district} · {npc.class_name}</p>
        </div>
      </div>

      <div className="npc-body">
        <section>
          <h2>身份</h2>
          <p>{npc.role}</p>
        </section>
        <section>
          <h2>简介</h2>
          <p>{npc.intro}</p>
        </section>
        <section>
          <h2>活动</h2>
          <p>{npc.activity_intro}</p>
        </section>
      </div>
    </div>
  )
}
