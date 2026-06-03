import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { pool, query } from '../db/index.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { baseUrl: 'https://18trip.tyzhome.xyz', outPath: 'local/spot-tokens.csv' };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--base-url') out.baseUrl = args[++i];
    else if (args[i] === '--out') out.outPath = args[++i];
  }
  return out;
}

async function main() {
  const opts = parseArgs();
  const { rows } = await query(
    `SELECT display_order, type, name, spot_token
     FROM check_in_spots
     ORDER BY display_order ASC`,
  );

  mkdirSync(dirname(opts.outPath), { recursive: true });
  const lines = ['display_order,type,name,spot_token,spot_url'];
  for (const r of rows) {
    const url = `${opts.baseUrl}/?spot=${r.spot_token}`;
    lines.push(`${r.display_order},${r.type},"${r.name}","${r.spot_token}","${url.replace(/"/g, '""')}"`);
  }
  writeFileSync(opts.outPath, lines.join('\n') + '\n', 'utf8');

  console.log(`[export-spot-tokens] 导出 ${rows.length} 个打卡点到 ${opts.outPath}`);
  await pool.end();
}

main().catch(async (err) => {
  console.error('[export-spot-tokens] failed:', err.message);
  await pool.end();
  process.exit(1);
});
