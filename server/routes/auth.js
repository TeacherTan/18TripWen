import { Router } from 'express';
import bcrypt from 'bcrypt';
import { query } from '../db/index.js';
import { signToken } from '../utils/jwt.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();
const BCRYPT_ROUNDS = 10;

function toPublicUser(row) {
  return {
    id: row.id,
    username: row.username,
    city: row.city,
    avatar_url: row.avatar_url,
    role: row.role,
    is_registered: row.is_registered,
  };
}

function issueToken(user) {
  return signToken({
    userId: user.id,
    username: user.username,
    role: user.role,
  });
}

// POST /api/auth/nfc — NFC 碰触登录
router.post('/nfc', async (req, res, next) => {
  try {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ error: 'token is required' });

    const { rows } = await query(
      'SELECT * FROM users WHERE nfc_token = $1 AND deactivated_at IS NULL',
      [token],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'invalid nfc token' });
    }

    const user = rows[0];
    const jwt = issueToken(user);
    res.json({
      jwt,
      user: toPublicUser(user),
      registered: user.is_registered,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/register — 绑定用户名密码（需 NFC JWT）
router.post('/register', authenticate, async (req, res, next) => {
  try {
    const { username, password, city } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }
    if (username.length > 50 || password.length < 4) {
      return res.status(400).json({ error: 'invalid username or password length' });
    }

    const existing = await query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'username already taken' });
    }

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const { rows } = await query(
      `UPDATE users
       SET username = $1, password_hash = $2, city = $3, is_registered = true
       WHERE id = $4 AND deactivated_at IS NULL
       RETURNING *`,
      [username, hash, city || null, req.auth.userId],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'user not found' });
    }

    const user = rows[0];
    res.json({ jwt: issueToken(user), user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login — 用户名密码登录
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }

    const { rows } = await query(
      'SELECT * FROM users WHERE username = $1 AND deactivated_at IS NULL',
      [username],
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'invalid credentials' });
    }

    const user = rows[0];
    if (!user.password_hash) {
      return res.status(401).json({ error: 'invalid credentials' });
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'invalid credentials' });
    }

    res.json({ jwt: issueToken(user), user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh — 续期 JWT（未过期前可续）
router.post('/refresh', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT * FROM users WHERE id = $1 AND deactivated_at IS NULL',
      [req.auth.userId],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'user not found' });
    }
    res.json({ jwt: issueToken(rows[0]) });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me — 当前用户信息
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT * FROM users WHERE id = $1 AND deactivated_at IS NULL',
      [req.auth.userId],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'user not found' });
    }
    res.json({ user: toPublicUser(rows[0]) });
  } catch (err) {
    next(err);
  }
});

export default router;
