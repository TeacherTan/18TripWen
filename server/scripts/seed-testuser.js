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
  const { username = 'testuser', password = 'test123' } = parseArgs();

  let userId;
  const existing = await query(
    `SELECT id, nfc_token FROM users WHERE username = $1`,
    [username],
  );

  if (existing.rows.length > 0) {
    userId = existing.rows[0].id;
    console.log(`[seed-testuser] "${username}" 已存在 (id=${userId})`);
    console.log(`[seed-testuser] nfc_token: ${existing.rows[0].nfc_token}`);
  } else {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await query(
      `INSERT INTO users (username, password_hash, role, is_registered, city)
       VALUES ($1, $2, 'user', true, '测试城市')
       RETURNING id, nfc_token`,
      [username, hash],
    );
    userId = rows[0].id;
    console.log(`[seed-testuser] 已创建测试用户 "${username}"`);
    console.log(`[seed-testuser] user_id: ${userId}`);
    console.log(`[seed-testuser] nfc_token: ${rows[0].nfc_token}`);
    console.log(`[seed-testuser] 默认密码: ${password}`);
  }

  // 为该用户解锁所有 active spots（包含 extra/计划通）
  const result = await query(
    `INSERT INTO check_ins (user_id, spot_id)
     SELECT $1, id FROM check_in_spots WHERE active = true
     ON CONFLICT (user_id, spot_id) DO NOTHING
     RETURNING id`,
    [userId],
  );
  console.log(`[seed-testuser] 新增解锁 ${result.rowCount} 个成就（已存在的跳过）`);

  await pool.end();
}

main().catch((err) => {
  console.error('[seed-testuser] failed:', err);
  pool.end();
  process.exit(1);
});
