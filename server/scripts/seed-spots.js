import { pool, query } from '../db/index.js';

const spots = [
  { name: '签到台',     asset_key: 'spot_01', display_order: 1, spot_token: '11111111-0000-0000-0000-000000000001' },
  { name: '主舞台',     asset_key: 'spot_02', display_order: 2, spot_token: '11111111-0000-0000-0000-000000000002' },
  { name: '市集区',     asset_key: 'spot_03', display_order: 3, spot_token: '11111111-0000-0000-0000-000000000003' },
  { name: '拍照打卡墙', asset_key: 'spot_04', display_order: 4, spot_token: '11111111-0000-0000-0000-000000000004' },
  { name: '待定点位5',  asset_key: 'spot_05', display_order: 5, spot_token: '11111111-0000-0000-0000-000000000005' },
  { name: '待定点位6',  asset_key: 'spot_06', display_order: 6, spot_token: '11111111-0000-0000-0000-000000000006' },
];

async function main() {
  for (const s of spots) {
    await query(
      `INSERT INTO check_in_spots (name, asset_key, display_order, spot_token)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (spot_token) DO UPDATE
       SET name = EXCLUDED.name,
           asset_key = EXCLUDED.asset_key,
           display_order = EXCLUDED.display_order,
           active = true`,
      [s.name, s.asset_key, s.display_order, s.spot_token],
    );
    console.log(`[seed-spots] upserted: ${s.display_order}. ${s.name} (${s.asset_key})`);
  }
  await pool.end();
}

main().catch((err) => {
  console.error('[seed-spots] failed:', err);
  process.exit(1);
});
