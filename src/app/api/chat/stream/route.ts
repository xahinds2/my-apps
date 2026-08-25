import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import ChatMessage from '@/features/chat/models/ChatMessage';
import DirectMessage from '@/features/chat/models/DirectMessage';

export const runtime = 'nodejs';
// Disable response buffering on proxies/CDNs
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const ch = req.nextUrl.searchParams.get('ch');
  const room = req.nextUrl.searchParams.get('room');
  const sinceParam = req.nextUrl.searchParams.get('since');

  const db = await connectToDatabase();
  if (!db) return new Response('Database unavailable', { status: 503 });

  const encoder = new TextEncoder();
  let lastTimestamp = sinceParam ? new Date(sinceParam) : new Date();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      // Keepalive comment prevents proxies and Vercel from closing idle connections
      const keepalive = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(': ping\n\n'));
      }, 20_000);

      const poll = setInterval(async () => {
        if (closed) return;
        try {
          const query = ch
            ? { channel: ch, createdAt: { $gt: lastTimestamp } }
            : { roomId: room, createdAt: { $gt: lastTimestamp } };

          const Model = ch ? ChatMessage : DirectMessage;
          const msgs = await (Model as typeof ChatMessage)
            .find(query)
            .sort({ createdAt: 1 })
            .limit(50)
            .lean();

          if (msgs.length > 0) {
            msgs.forEach(msg => send({ type: 'message', data: msg }));
            lastTimestamp = new Date(msgs[msgs.length - 1].createdAt as Date);
          }
        } catch { /* ignore transient errors */ }
      }, 800);

      req.signal.addEventListener('abort', () => {
        closed = true;
        clearInterval(keepalive);
        clearInterval(poll);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
