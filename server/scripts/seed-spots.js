import { pool, query } from '../db/index.js';

const VENUES = [
  { name: '场地点位 1', asset_key: 'venue_01', description: '你已抵达「场地点位 1」' },
  { name: '场地点位 2', asset_key: 'venue_02', description: '你已抵达「场地点位 2」' },
  { name: '场地点位 3', asset_key: 'venue_03', description: '你已抵达「场地点位 3」' },
  { name: '场地点位 4', asset_key: 'venue_04', description: '你已抵达「场地点位 4」' },
];

// 顺序固定：方便后台对照
const NPC_NAMES = [
  ['可不可',     'npc_kafka'],
  ['西园练牙',   'npc_renga'],
  ['鹿礼光',     'npc_lu'],
  ['斜木七基',   'npc_nanaki'],
  ['久乐间潮',   'npc_ushio'],
  ['衣川季肋',   'npc_kiroku'],
  ['夏烧千弥',   'npc_chihiro'],
  ['木之内太绪', 'npc_tao'],
  ['白光糖衣',   'npc_toi'],
  ['白光琉衣',   'npc_ryui'],
];

// 固定种子的伪随机：保证每次 db:reset 结果一致
function seededRand(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function buildNpcs() {
  const rand = seededRand(20260519);
  return NPC_NAMES.map(([name, asset_key], i) => {
    const floor = (i % 4) + 1; // 均分到 4 层
    const pos_x = +(15 + rand() * 70).toFixed(2);
    const pos_y = +(15 + rand() * 70).toFixed(2);
    return {
      name,
      asset_key,
      description: `你与${name}相遇了`,
      activity_intro: `${name}的活动正在筹备中`,
      floor,
      pos_x,
      pos_y,
    };
  });
}

async function upsertVenue(s, order) {
  const token = `a0000000-0000-0000-0000-${order.toString(16).padStart(12, '0')}`;
  await query(
    `INSERT INTO check_in_spots (name, asset_key, display_order, spot_token, type, description)
     VALUES ($1, $2, $3, $4, 'venue', $5)
     ON CONFLICT (spot_token) DO UPDATE
     SET name = EXCLUDED.name,
         asset_key = EXCLUDED.asset_key,
         display_order = EXCLUDED.display_order,
         type = 'venue',
         description = EXCLUDED.description,
         active = true`,
    [s.name, s.asset_key, order, token, s.description],
  );
  console.log(`[seed-spots] upserted venue: ${order}. ${s.name}`);
}

async function upsertNpc(n, order) {
  const idx = order - VENUES.length;
  const token = `b0000000-0000-0000-0000-${idx.toString(16).padStart(12, '0')}`;
  await query(
    `INSERT INTO check_in_spots
       (name, asset_key, display_order, spot_token, type, description, activity_intro, floor, pos_x, pos_y)
     VALUES ($1, $2, $3, $4, 'npc', $5, $6, $7, $8, $9)
     ON CONFLICT (spot_token) DO UPDATE
     SET name = EXCLUDED.name,
         asset_key = EXCLUDED.asset_key,
         display_order = EXCLUDED.display_order,
         type = 'npc',
         description = EXCLUDED.description,
         activity_intro = EXCLUDED.activity_intro,
         floor = EXCLUDED.floor,
         pos_x = EXCLUDED.pos_x,
         pos_y = EXCLUDED.pos_y,
         active = true`,
    [n.name, n.asset_key, order, token, n.description, n.activity_intro, n.floor, n.pos_x, n.pos_y],
  );
  console.log(`[seed-spots] upserted npc:   ${order}. ${n.name} (F${n.floor} @${n.pos_x},${n.pos_y})`);
}

async function main() {
  const npcs = buildNpcs();
  let order = 1;
  for (const v of VENUES) await upsertVenue(v, order++);
  for (const n of npcs)   await upsertNpc(n, order++);
  await pool.end();
}

main().catch((err) => {
  console.error('[seed-spots] failed:', err);
  pool.end();
  process.exit(1);
});
