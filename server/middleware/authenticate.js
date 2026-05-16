import { verifyToken } from '../utils/jwt.js';

export function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'missing bearer token' });
  }

  try {
    req.auth = verifyToken(token);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid or expired token', detail: err.message });
  }
}
