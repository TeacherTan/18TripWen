// 一次性迁移：给已存在的 300 张卡填写 card_index（来自 local/nfc-cards.csv）
// 用法：node server/scripts/migrate-card-index.js [--csv local/nfc-cards.csv]
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { pool } from '../db/index.js';

function parseArgs() {
  const args = process.argv.slice(2);
  let csvPath = 'local/nfc-cards.csv';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--csv') csvPath = args[++i];
  }
  return { csvPath };
}

async function main() {
  const { csvPath } = parseArgs();
  const raw = readFileSync(csvPath, 'utf8');
  const rows = raw.split(/\r?\n/).filter(Boolean).slice(1); // 跳过表头

  const client = await pool.connect();
  let updated = 0;
  let skipped = 0;
  try {
    await client.query('BEGIN');
    for (const row of rows) {
      const parts = row.split(',');
      const idx = parseInt(parts[0], 10);
      const token = parts[1]?.trim();
      if (!token || isNaN(idx)) { skipped++; continue; }
      const { rowCount } = await client.query(
        `UPDATE users SET card_index = $1 WHERE nfc_token = $2 AND card_index IS DISTINCT FROM $1`,
        [idx, token],
      );
      updated += rowCount;
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  console.log(`[migrate-card-index] 完成：${updated} 行已更新，${rows.length - skipped - updated} 行无变化，${skipped} 行跳过`);
  await pool.end();
}

main().catch(async (err) => {
  console.error('[migrate-card-index] failed:', err.message);
  await pool.end();
  process.exit(1);
});
