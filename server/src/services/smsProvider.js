// SMS + voice delivery. Uses Twilio's REST API when TWILIO_ACCOUNT_SID,
// TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER are set; otherwise messages are
// "simulated" (logged to the console and to alert_log) so the feature is fully
// demoable without a paid account.

const TWILIO_BASE = 'https://api.twilio.com/2010-04-01';

export function isTwilioConfigured() {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);
}

export function providerName() {
  return isTwilioConfigured() ? 'twilio' : 'simulated';
}

// Normalizes Indian numbers to E.164: "98450 11111" -> "+919845011111".
export function toE164(phone, defaultCountryCode = process.env.SMS_DEFAULT_COUNTRY_CODE || '91') {
  if (!phone) return null;
  const trimmed = String(phone).trim();
  const digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('+')) return digits.length >= 8 ? `+${digits}` : null;
  if (digits.length === 10) return `+${defaultCountryCode}${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `+${defaultCountryCode}${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith(defaultCountryCode)) return `+${digits}`;
  return null;
}

function escapeXml(s) {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]);
}

async function twilioPost(path, params) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
  const res = await fetch(`${TWILIO_BASE}/Accounts/${sid}/${path}`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Twilio HTTP ${res.status}`);
  }
  return res.json();
}

// Returns { provider, status, error? }. Never throws.
export async function deliver(channel, to, message) {
  if (!isTwilioConfigured()) {
    console.log(`[alert:${channel}:simulated] -> ${to}: ${message}`);
    return { provider: 'simulated', status: 'simulated' };
  }
  try {
    if (channel === 'voice') {
      const twiml = `<Response><Say voice="alice" language="en-IN">${escapeXml(message)}</Say><Pause length="1"/><Say voice="alice" language="en-IN">${escapeXml(message)}</Say></Response>`;
      await twilioPost('Calls.json', { To: to, From: process.env.TWILIO_FROM_NUMBER, Twiml: twiml });
    } else {
      await twilioPost('Messages.json', { To: to, From: process.env.TWILIO_FROM_NUMBER, Body: message });
    }
    return { provider: 'twilio', status: 'sent' };
  } catch (err) {
    console.error(`Twilio ${channel} to ${to} failed:`, err.message);
    return { provider: 'twilio', status: 'failed', error: err.message };
  }
}
