import { createNotification } from '../models/notificationModel.js';
import { publish } from './realtime.js';
import { sendAlert } from './alertService.js';

// Creates an in-app notification, pushes it live to the user's open tabs, and
// optionally sends an SMS and/or voice alert (only if the user opted in).
// Notifications are a side effect: a failure here must never fail the
// order/report action that triggered it.
//
//   notify(userId, 'Order #4 shipped', { type: 'order', link: '/orders', sms: true })
export async function notify(userId, message, { type = 'info', link = null, sms = false, voice = false, smsText } = {}) {
  try {
    const notification = await createNotification({ userId, message, type, link });
    publish(userId, 'notification', notification);
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
  // Alerts go out in the background so slow SMS gateways don't delay the API response.
  if (sms) sendAlert(userId, 'sms', smsText || message);
  if (voice) sendAlert(userId, 'voice', smsText || message);
}
