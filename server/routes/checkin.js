import { Router } from 'express';
import { query } from '../db/index.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

function toPublicSpot(row) {
  return {
    id: row.id,
    name: row.name,
    asset_key: row.asset_key,
    display_order: row.display_order,
  };
}

// GET /api/check-in/spots — 公开打卡点列表（不含 spot_token）
router.get('/spots', async (_req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, name, asset_key, display_order
       FROM check_in_spots
       WHERE active = true
       ORDER BY display_order ASC`,
    );
    res.json({ spots: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/check-in/status — 当前用户成就墙状态
router.get('/status', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT s.id, s.name, s.asset_key, s.display_order,
              ci.checked_at
       FROM check_in_spots s
       LEFT JOIN check_ins ci
         ON ci.spot_id = s.id AND ci.user_id = $1
       WHERE s.active = true
       ORDER BY s.display_order ASC`,
      [req.auth.userId],
    );

    const spots = rows.map((r) => ({
      id: r.id,
      name: r.name,
      asset_key: r.asset_key,
      display_order: r.display_order,
      unlocked: !!r.checked_at,
      checked_at: r.checked_at,
    }));

    res.json({
      spots,
      total: spots.length,
      unlocked_count: spots.filter((s) => s.unlocked).length,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/check-in — 打卡（幂等）
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { spotToken } = req.body || {};
    if (!spotToken) return res.status(400).json({ error: 'spotToken is required' });

    const spotResult = await query(
      `SELECT * FROM check_in_spots WHERE spot_token = $1 AND active = true`,
      [spotToken],
    );
    if (spotResult.rows.length === 0) {
      return res.status(404).json({ error: 'invalid or inactive spot' });
    }
    const spot = spotResult.rows[0];

    const existing = await query(
      `SELECT checked_at FROM check_ins WHERE user_id = $1 AND spot_id = $2`,
      [req.auth.userId, spot.id],
    );
    if (existing.rows.length > 0) {
      const totals = await getProgress(req.auth.userId);
      return res.json({
        success: true,
        alreadyCheckedIn: true,
        spot: toPublicSpot(spot),
        checkedAt: existing.rows[0].checked_at,
        ...totals,
      });
    }

    await query(
      `INSERT INTO check_ins (user_id, spot_id) VALUES ($1, $2)`,
      [req.auth.userId, spot.id],
    );

    const totals = await getProgress(req.auth.userId);
    res.json({
      success: true,
      alreadyCheckedIn: false,
      spot: toPublicSpot(spot),
      ...totals,
    });
  } catch (err) {
    next(err);
  }
});

async function getProgress(userId) {
  const { rows } = await query(
    `SELECT
       (SELECT COUNT(*) FROM check_in_spots WHERE active = true) AS total,
       (SELECT COUNT(*) FROM check_ins ci
          JOIN check_in_spots s ON s.id = ci.spot_id
         WHERE ci.user_id = $1 AND s.active = true) AS unlocked`,
    [userId],
  );
  return {
    total: Number(rows[0].total),
    unlocked_count: Number(rows[0].unlocked),
  };
}

export default router;
