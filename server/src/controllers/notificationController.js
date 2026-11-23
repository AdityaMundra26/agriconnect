import jwt from 'jsonwebtoken';
import { subscribe } from '../services/realtime.js';
import {
  findNotificationsForUser,
  countUnread,
  markRead,
  markAllRead,
} from '../models/notificationModel.js';

export async function listNotifications(req, res, next) {
  try {
    const [notifications, unread] = await Promise.all([
      findNotificationsForUser(req.user.id),
      countUnread(req.user.id),
    ]);
    res.json({ notifications, unread });
  } catch (err) {
    next(err);
  }
}

// Server-Sent Events stream. Browsers' EventSource can't send an Authorization
// header, so the JWT comes in the query string for this one route.
export function streamNotifications(req, res) {
  let payload;
  try {
    payload = jwt.verify(String(req.query.token || ''), process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  subscribe(payload.id, res);
}

export async function readNotification(req, res, next) {
  try {
    const notification = await markRead(req.params.id, req.user.id);
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    res.json({ notification });
  } catch (err) {
    next(err);
  }
}

export async function readAllNotifications(req, res, next) {
  try {
    await markAllRead(req.user.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
