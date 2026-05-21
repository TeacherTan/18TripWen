import { pool, query } from '../db/index.js';

const VENUES = [
  { name: '朝班', asset_key: 'venue_01', description: '于此一并眺望那份阳光~' },
  { name: '昼班', asset_key: 'venue_02', description: '一起寻找未知的神秘吧！' },
  { name: '夕班', asset_key: 'venue_03', description: '作为偶像会带来什么样的演出呢？' },
  { name: '夜班', asset_key: 'venue_04', description: '留存在这里的幸福' },
];

// 顺序固定：方便后台对照；floor 与 mockNpcs.js 保持一致
const NPCS = [
  { name: '大黑 可不可',   asset_key: 'npc_kafka',   floor: 1, description: '来完成一场解谜游戏吧~' },
  { name: '西园 练牙',     asset_key: 'npc_renga',   floor: 1, description: '玫瑰绽放的那个瞬间' },
  { name: '鹿 礼光',       asset_key: 'npc_lu',      floor: 1, description: '雀友，来试试长麻？' },
  { name: '衣川 季肋',     asset_key: 'npc_kiroku',  floor: 2, description: '绘制出来的会是什么呢' },
  { name: '斜木七基',      asset_key: 'npc_nanaki',  floor: 2, description: '如果可以心灵相通' },
  { name: '久乐间 潮',     asset_key: 'npc_ushio',   floor: 2, description: '好像哪里有点心的味道~' },
  { name: '夏烧 千弥',     asset_key: 'npc_chihiro', floor: 3, description: '小偶像应该学会打造的"人设"！' },
  { name: '木之内 太绪',   asset_key: 'npc_tao',     floor: 3, description: '来一把惊险刺激的____？' },
  { name: '白光 糖衣',     asset_key: 'npc_toi',     floor: 4, description: '作为弟弟所珍视的' },
  { name: '白光 琉衣',     asset_key: 'npc_ryui',    floor: 4, description: '作为兄长所守护的' },
];

// 其他成就：'计划通' 自动触发（前 14 个全部解锁后），其余 3 个仍走 NFC
const EXTRAS = [
  { name: '计划通',         asset_key: 'extra_plan',     description: '完成所有的 NPC 互动和队标打卡' },
  { name: '命运所指向',     asset_key: 'extra_fortune',  description: '购置"占卜券"并找到 白光糖衣 完成一次占卜' },
  { name: '那位神秘的画家', asset_key: 'extra_painter',  description: '购置"印象券"并找到 衣川季肋 绘制麦芽糖/色纸印象画' },
  { name: '我全都要',       asset_key: 'extra_buyall',   description: '在官摊购买任意制品' },
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
  return NPCS.map((n) => {
    const pos_x = +(15 + rand() * 70).toFixed(2);
    const pos_y = +(15 + rand() * 70).toFixed(2);
    return {
      name: n.name,
      asset_key: n.asset_key,
      description: n.description,
      activity_intro: `${n.name}的活动正在筹备中`,
      floor: n.floor,
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

async function upsertExtra(s, order) {
  const idx = order - VENUES.length - NPCS.length;
  const token = `c0000000-0000-0000-0000-${idx.toString(16).padStart(12, '0')}`;
  await query(
    `INSERT INTO check_in_spots (name, asset_key, display_order, spot_token, type, description)
     VALUES ($1, $2, $3, $4, 'extra', $5)
     ON CONFLICT (spot_token) DO UPDATE
     SET name = EXCLUDED.name,
         asset_key = EXCLUDED.asset_key,
         display_order = EXCLUDED.display_order,
         type = 'extra',
         description = EXCLUDED.description,
         active = true`,
    [s.name, s.asset_key, order, token, s.description],
  );
  console.log(`[seed-spots] upserted extra: ${order}. ${s.name}`);
}

async function main() {
  const npcs = buildNpcs();
  let order = 1;
  for (const v of VENUES) await upsertVenue(v, order++);
  for (const n of npcs)   await upsertNpc(n, order++);
  for (const x of EXTRAS) await upsertExtra(x, order++);
  await pool.end();
}

main().catch((err) => {
  console.error('[seed-spots] failed:', err);
  pool.end();
  process.exit(1);
});
