// In-process pub/sub for Server-Sent Events. Each logged-in browser tab holds
// one open /notifications/stream response; publish() writes to all of a user's
// open streams. (Single-process only - a multi-instance deploy would put
// Redis pub/sub behind this same interface.)

const streams = new Map(); // userId -> Set<res>
const HEARTBEAT_MS = 25000;

export function subscribe(userId, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 5000\n\n');
  res.write(`event: ready\ndata: {}\n\n`);

  if (!streams.has(userId)) streams.set(userId, new Set());
  streams.get(userId).add(res);

  // Comment lines keep proxies from closing an idle connection.
  const heartbeat = setInterval(() => res.write(': ping\n\n'), HEARTBEAT_MS);

  const cleanup = () => {
    clearInterval(heartbeat);
    const set = streams.get(userId);
    if (set) {
      set.delete(res);
      if (set.size === 0) streams.delete(userId);
    }
  };
  res.on('close', cleanup);
  return cleanup;
}

export function publish(userId, event, data) {
  const set = streams.get(userId);
  if (!set) return 0;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of set) res.write(payload);
  return set.size;
}

export function connectionCount(userId) {
  return streams.get(userId)?.size || 0;
}
