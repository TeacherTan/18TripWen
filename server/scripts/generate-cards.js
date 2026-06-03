import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { pool } from '../db/index.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { count: 300, baseUrl: 'https://18trip.tyzhome.xyz', outPath: 'local/nfc-cards.csv', importPath: null, force: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--count') out.count = parseInt(args[++i], 10);
    else if (args[i] === '--base-url') out.baseUrl = args[++i];
    else if (args[i] === '--out') out.outPath = args[++i];
    else if (args[i] === '--force') out.force = true;
    else if (args[i] === '--import') {
      out.importPath = args[++i];
      if (!out.importPath) { console.error('[generate-cards] --import requires a file path'); process.exit(1); }
    }
  }
  return out;
}

async function insertTokens(tokens) {
  const client = await pool.connect();
  let inserted = 0;
  try {
    await client.query('BEGIN');
    for (const t of tokens) {
      const { rowCount } = await client.query(
        `INSERT INTO users (nfc_token, role, is_registered)
         VALUES ($1, 'user', false)
         ON CONFLICT (nfc_token) DO NOTHING`,
        [t],
      );
      inserted += rowCount;
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return inserted;
}

function writeCsv(outPath, tokens, baseUrl) {
  mkdirSync(dirname(outPath), { recursive: true });
  const lines = ['index,nfc_token,login_url'];
  tokens.forEach((t, i) => {
    // 去掉协议头（https:// 或 http://），只保留域名+路径，方便写卡工具自行拼接
    const url = `${baseUrl}/?nfc=${t}`.replace(/^https?:\/\//, '');
    lines.push(`${i + 1},${t},${url}`);
  });
  writeFileSync(outPath, lines.join('\n') + '\n', 'utf8');
}

function readTokensFromCsv(importPath) {
  const raw = readFileSync(importPath, 'utf8');
  const rows = raw.split(/\r?\n/).filter(Boolean);
  const tokens = [];
  for (let i = 1; i < rows.length; i++) {
    const token = rows[i].split(',')[1]?.trim();
    if (token && UUID_RE.test(token)) tokens.push(token);
  }
  return tokens;
}

async function main() {
  const opts = parseArgs();

  if (opts.importPath) {
    const tokens = readTokensFromCsv(opts.importPath);
    if (tokens.length === 0) throw new Error(`no valid nfc_token found in ${opts.importPath}`);
    const inserted = await insertTokens(tokens);
    console.log(`[generate-cards] import: ${tokens.length} 个 token 读取，${inserted} 个新插入，${tokens.length - inserted} 个已存在跳过`);
    await pool.end();
    return;
  }

  if (!Number.isInteger(opts.count) || opts.count <= 0) {
    throw new Error(`--count must be a positive integer, got: ${opts.count}`);
  }
  // 防覆盖：备份文件已存在时拒绝生成，避免覆盖已分发卡片的 token 备份
  if (existsSync(opts.outPath) && !opts.force) {
    console.error(`[generate-cards] ${opts.outPath} 已存在，拒绝覆盖（防止旧 token 备份丢失）。`);
    console.error('[generate-cards] 如确需重新生成：换 --out 路径，或加 --force，或手动删除旧文件。');
    await pool.end();
    process.exit(1);
  }
  const tokens = Array.from({ length: opts.count }, () => randomUUID());
  const inserted = await insertTokens(tokens);
  writeCsv(opts.outPath, tokens, opts.baseUrl);
  console.log(`[generate-cards] generate: ${opts.count} 张卡已创建（${inserted} 新插入），CSV 写入 ${opts.outPath}`);
  console.log(`[generate-cards] base-url: ${opts.baseUrl}`);
  await pool.end();
}

main().catch(async (err) => {
  console.error('[generate-cards] failed:', err.message);
  await pool.end();
  process.exit(1);
});
