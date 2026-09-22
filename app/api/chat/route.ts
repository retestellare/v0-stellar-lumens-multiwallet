import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

interface ChatMessage {
  id: string;
  sender: string;
  avatar: string;
  avatarColor: string;
  avatarUrl?: string; // Optional custom image URL
  message: string;
  timestamp: string; // ISO string — safe to serialize
}

// Neon database connection via DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// GET — fetch all messages (optionally after a given timestamp for polling)
export async function GET(request: NextRequest) {
  try {
    const after = request.nextUrl.searchParams.get('after');
    const client = await pool.connect();

    try {
      let query = 'SELECT id, sender, avatar, avatar_color as "avatarColor", avatar_url as "avatarUrl", message, timestamp::text FROM public.messages ORDER BY timestamp ASC';
      const params: any[] = [];

      if (after) {
        query += ' WHERE timestamp > $1';
        params.push(new Date(after));
      }

      const result = await client.query(query, params);
      const messages: ChatMessage[] = result.rows;

      return NextResponse.json({ messages });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[v0] Chat GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch messages', messages: [] }, { status: 500 });
  }
}

// POST — add a new message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sender, avatar, avatarColor, avatarUrl, message } = body;

    if (!sender || !message || typeof message !== 'string') {
      return NextResponse.json({ error: 'sender and message are required' }, { status: 400 });
    }

    if (message.trim().length === 0 || message.trim().length > 1000) {
      return NextResponse.json({ error: 'Message must be 1–1000 characters' }, { status: 400 });
    }

    const client = await pool.connect();

    try {
      const query = `
        INSERT INTO public.messages (sender, avatar, avatar_color, avatar_url, message, timestamp)
        VALUES ($1, $2, $3, $4, $5, now())
        RETURNING id, sender, avatar, avatar_color as "avatarColor", avatar_url as "avatarUrl", message, timestamp::text
      `;

      const result = await client.query(query, [
        String(sender).slice(0, 40),
        String(avatar || '?').slice(0, 2),
        String(avatarColor || 'bg-blue-500'),
        avatarUrl ? String(avatarUrl) : null,
        message.trim(),
      ]);

      const newMessage: ChatMessage = result.rows[0];
      return NextResponse.json({ message: newMessage });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[v0] Chat POST error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
