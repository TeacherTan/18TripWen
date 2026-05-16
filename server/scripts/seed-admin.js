import bcrypt from 'bcrypt';
import { pool, query } from '../db/index.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--username') out.username = args[++i];
    else if (args[i] === '--password') out.password = args[++i];
  }
  return out;
}

async function main() {
  const { username = 'admin', password = 'admin123' } = parseArgs();

  const existing = await query(
    `SELECT id, nfc_token FROM users WHERE role = 'admin' AND username = $1`,
    [username],
  );
  if (existing.rows.length > 0) {
    console.log(`[seed-admin] admin "${username}" 已存在 (id=${existing.rows[0].id})`);
    console.log(`[seed-admin] nfc_token: ${existing.rows[0].nfc_token}`);
    await pool.end();
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  const { rows } = await query(
    `INSERT INTO users (username, password_hash, role, is_registered)
     VALUES ($1, $2, 'admin', true)
     RETURNING id, nfc_token`,
    [username, hash],
  );

  console.log(`[seed-admin] 已创建管理员 "${username}"`);
  console.log(`[seed-admin] user_id: ${rows[0].id}`);
  console.log(`[seed-admin] nfc_token: ${rows[0].nfc_token}`);
  console.log(`[seed-admin] 默认密码: ${password}（生产环境请通过 --password 指定）`);
  await pool.end();
}

main().catch((err) => {
  console.error('[seed-admin] failed:', err);
  process.exit(1);
});
