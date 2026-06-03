import { Router } from 'express';
import { pool, query } from '../db/index.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const router = Router();
router.use(authenticate, requireAdmin);

function toAdminUser(row) {
  return {
    id: row.id,
    username: row.username,
    city: row.city,
    avatar_url: row.avatar_url,
    nfc_token: row.nfc_token,
    role: row.role,
    is_registered: row.is_registered,
    deactivated_at: row.deactivated_at,
    created_at: row.created_at,
  };
}

// ----- 用户管理 -----

// GET /api/admin/users?search=xxx&include_deactivated=1
router.get('/users', async (req, res, next) => {
  try {
    const { search, include_deactivated } = req.query;
    const conditions = [];
    const params = [];
    if (!include_deactivated) conditions.push('deactivated_at IS NULL');
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(username ILIKE $${params.length} OR city ILIKE $${params.length})`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await query(
      `SELECT * FROM users ${where} ORDER BY created_at DESC`,
      params,
    );
    res.json({ users: rows.map(toAdminUser) });
  } catch (err) { next(err); }
});

// POST /api/admin/users — 新增空白用户（自动生成 nfc_token）
router.post('/users', async (req, res, next) => {
  try {
    const { city } = req.body || {};
    const { rows } = await query(
      `INSERT INTO users (city) VALUES ($1) RETURNING *`,
      [city || null],
    );
    res.status(201).json({ user: toAdminUser(rows[0]) });
  } catch (err) { next(err); }
});

// PUT /api/admin/users/:id — 修改用户字段（username、city、role）
router.put('/users/:id', async (req, res, next) => {
  try {
    const { username, city, role } = req.body || {};
    const fields = [];
    const params = [];
    if (username !== undefined) { params.push(username); fields.push(`username = $${params.length}`); }
    if (city !== undefined) { params.push(city); fields.push(`city = $${params.length}`); }
    if (role !== undefined) {
      if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: 'invalid role' });
      params.push(role);
      fields.push(`role = $${params.length}`);
    }
    if (fields.length === 0) return res.status(400).json({ error: 'no fields to update' });

    params.push(req.params.id);
    const { rows } = await query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params,
    );
    if (rows.length === 0) return res.status(404).json({ error: 'user not found' });
    res.json({ user: toAdminUser(rows[0]) });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'username already taken' });
    next(err);
  }
});

// PUT /api/admin/users/:id/deactivate — 软删除（停用）
router.put('/users/:id/deactivate', async (req, res, next) => {
  try {
    if (req.params.id === req.auth.userId) {
      return res.status(400).json({ error: 'cannot deactivate yourself' });
    }
    const { rows } = await query(
      `UPDATE users SET deactivated_at = now()
       WHERE id = $1 AND deactivated_at IS NULL
       RETURNING *`,
      [req.params.id],
    );
    if (rows.length === 0) return res.status(404).json({ error: 'user not found or already deactivated' });
    res.json({ user: toAdminUser(rows[0]) });
  } catch (err) { next(err); }
});

// POST /api/admin/users/:id/report-loss — 挂失（重新生成 nfc_token，旧卡失效）
router.post('/users/:id/report-loss', async (req, res, next) => {
  try {
    const { rows } = await query(
      `UPDATE users SET nfc_token = gen_random_uuid()
       WHERE id = $1 AND deactivated_at IS NULL
       RETURNING *`,
      [req.params.id],
    );
    if (rows.length === 0) return res.status(404).json({ error: 'user not found' });
    res.json({ user: toAdminUser(rows[0]), message: '旧卡已失效，新 nfc_token 已生成' });
  } catch (err) { next(err); }
});

// POST /api/admin/users/clear-registration — 批量仅清空注册信息（保留 token 与打卡）
router.post('/users/clear-registration', async (req, res, next) => {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids must be a non-empty array' });
    }
    const { rowCount } = await query(
      `UPDATE users
       SET username = NULL, password_hash = NULL, city = NULL, is_registered = false
       WHERE id = ANY($1::uuid[]) AND role <> 'admin' AND deactivated_at IS NULL`,
      [ids],
    );
    res.json({ affected: rowCount });
  } catch (err) { next(err); }
});

// POST /api/admin/users/reset-card — 批量重置为新卡（清注册信息 + 删打卡，保留 token）
router.post('/users/reset-card', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids must be a non-empty array' });
    }
    await client.query('BEGIN');
    const eligible = await client.query(
      `SELECT id FROM users
       WHERE id = ANY($1::uuid[]) AND role <> 'admin' AND deactivated_at IS NULL`,
      [ids],
    );
    const eligibleIds = eligible.rows.map((r) => r.id);
    if (eligibleIds.length === 0) {
      await client.query('COMMIT');
      return res.json({ affected: 0, deleted_check_ins: 0 });
    }
    const del = await client.query(
      `DELETE FROM check_ins WHERE user_id = ANY($1::uuid[])`,
      [eligibleIds],
    );
    const upd = await client.query(
      `UPDATE users
       SET username = NULL, password_hash = NULL, city = NULL, is_registered = false
       WHERE id = ANY($1::uuid[])`,
      [eligibleIds],
    );
    await client.query('COMMIT');
    res.json({ affected: upd.rowCount, deleted_check_ins: del.rowCount });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// POST /api/admin/users/transfer — 用户数据迁移
router.post('/users/transfer', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { sourceUserId, targetUserId } = req.body || {};
    if (!sourceUserId || !targetUserId) {
      return res.status(400).json({ error: 'sourceUserId and targetUserId are required' });
    }
    if (sourceUserId === targetUserId) {
      return res.status(400).json({ error: 'source and target must differ' });
    }

    await client.query('BEGIN');

    const source = await client.query(
      'SELECT id FROM users WHERE id = $1 AND deactivated_at IS NULL',
      [sourceUserId],
    );
    const target = await client.query(
      'SELECT id FROM users WHERE id = $1 AND deactivated_at IS NULL',
      [targetUserId],
    );
    if (source.rows.length === 0 || target.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'source or target user not found' });
    }

    // 迁移打卡：只迁移目标未打过的，避免违反 UNIQUE
    const migrated = await client.query(
      `UPDATE check_ins SET user_id = $2
       WHERE user_id = $1
         AND spot_id NOT IN (SELECT spot_id FROM check_ins WHERE user_id = $2)
       RETURNING id`,
      [sourceUserId, targetUserId],
    );

    // 删除剩余的（目标已有的）source 记录
    const dropped = await client.query(
      `DELETE FROM check_ins WHERE user_id = $1 RETURNING id`,
      [sourceUserId],
    );

    // 停用 source
    await client.query(
      `UPDATE users SET deactivated_at = now() WHERE id = $1`,
      [sourceUserId],
    );

    await client.query('COMMIT');
    res.json({
      success: true,
      migrated_check_ins: migrated.rows.length,
      dropped_duplicate_check_ins: dropped.rows.length,
      source_deactivated: true,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// ----- 打卡点管理 -----

router.get('/spots', async (req, res, next) => {
  try {
    const { include_inactive } = req.query;
    const where = include_inactive ? '' : 'WHERE active = true';
    const { rows } = await query(
      `SELECT * FROM check_in_spots ${where} ORDER BY display_order ASC`,
    );
    res.json({ spots: rows });
  } catch (err) { next(err); }
});

router.post('/spots', async (req, res, next) => {
  try {
    const { name, asset_key, display_order, type, description, activity_intro, floor, pos_x, pos_y } = req.body || {};
    if (!name || !asset_key || display_order === undefined) {
      return res.status(400).json({ error: 'name, asset_key, display_order are required' });
    }
    const spotType = type || 'venue';
    if (!['venue', 'npc'].includes(spotType)) return res.status(400).json({ error: 'invalid type' });
    if (spotType === 'npc' && (floor == null || pos_x == null || pos_y == null)) {
      return res.status(400).json({ error: 'npc spot requires floor, pos_x, pos_y' });
    }
    const { rows } = await query(
      `INSERT INTO check_in_spots
         (name, asset_key, display_order, type, description, activity_intro, floor, pos_x, pos_y)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, asset_key, display_order, spotType, description ?? '', activity_intro ?? null,
       spotType === 'npc' ? floor : null, spotType === 'npc' ? pos_x : null, spotType === 'npc' ? pos_y : null],
    );
    res.status(201).json({ spot: rows[0] });
  } catch (err) { next(err); }
});

router.put('/spots/:id', async (req, res, next) => {
  try {
    const editable = ['name', 'asset_key', 'display_order', 'active', 'type', 'description', 'activity_intro', 'floor', 'pos_x', 'pos_y'];
    const fields = [];
    const params = [];

    // Validate type if provided
    if (req.body && req.body.type != null && !['venue', 'npc'].includes(req.body.type)) {
      return res.status(400).json({ error: 'invalid type' });
    }

    // Validate floor range if provided
    if (req.body && req.body.floor != null) {
      const floor = Number(req.body.floor);
      if (isNaN(floor) || floor < 1 || floor > 4) {
        return res.status(400).json({ error: 'floor must be between 1 and 4' });
      }
    }

    for (const key of editable) {
      if (req.body && Object.prototype.hasOwnProperty.call(req.body, key)) {
        params.push(req.body[key]);
        fields.push(`${key} = $${params.length}`);
      }
    }
    if (fields.length === 0) return res.status(400).json({ error: 'no fields to update' });

    params.push(req.params.id);
    const { rows } = await query(
      `UPDATE check_in_spots SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params,
    );
    if (rows.length === 0) return res.status(404).json({ error: 'spot not found' });
    res.json({ spot: rows[0] });
  } catch (err) { next(err); }
});

router.put('/spots/:id/deactivate', async (req, res, next) => {
  try {
    const { rows } = await query(
      `UPDATE check_in_spots SET active = false WHERE id = $1 RETURNING *`,
      [req.params.id],
    );
    if (rows.length === 0) return res.status(404).json({ error: 'spot not found' });
    res.json({ spot: rows[0] });
  } catch (err) { next(err); }
});

// ----- 补卡 -----

// POST /api/admin/check-ins/supplement
router.post('/check-ins/supplement', async (req, res, next) => {
  try {
    const { userId, spotId } = req.body || {};
    if (!userId || !spotId) {
      return res.status(400).json({ error: 'userId and spotId are required' });
    }

    const u = await query('SELECT id FROM users WHERE id = $1 AND deactivated_at IS NULL', [userId]);
    if (u.rows.length === 0) return res.status(404).json({ error: 'user not found' });
    const s = await query('SELECT id FROM check_in_spots WHERE id = $1 AND active = true', [spotId]);
    if (s.rows.length === 0) return res.status(404).json({ error: 'spot not found' });

    const existing = await query(
      'SELECT checked_at FROM check_ins WHERE user_id = $1 AND spot_id = $2',
      [userId, spotId],
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'already checked in', checkedAt: existing.rows[0].checked_at });
    }

    const { rows } = await query(
      `INSERT INTO check_ins (user_id, spot_id) VALUES ($1, $2) RETURNING *`,
      [userId, spotId],
    );
    res.status(201).json({ check_in: rows[0] });
  } catch (err) { next(err); }
});

// GET /api/admin/check-ins?userId=xxx — 打卡记录查看
router.get('/check-ins', async (req, res, next) => {
  try {
    const { userId, spotId } = req.query;
    const conditions = [];
    const params = [];
    if (userId) { params.push(userId); conditions.push(`ci.user_id = $${params.length}`); }
    if (spotId) { params.push(spotId); conditions.push(`ci.spot_id = $${params.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await query(
      `SELECT ci.id, ci.checked_at,
              u.id AS user_id, u.username,
              s.id AS spot_id, s.name AS spot_name, s.display_order
       FROM check_ins ci
       JOIN users u ON u.id = ci.user_id
       JOIN check_in_spots s ON s.id = ci.spot_id
       ${where}
       ORDER BY ci.checked_at DESC
       LIMIT 500`,
      params,
    );
    res.json({ check_ins: rows });
  } catch (err) { next(err); }
});

export default router;
