import { NextRequest, NextResponse } from 'next/server';

// Server-side in-memory store — shared across ALL clients for the lifetime of the server process
interface ChatMessage {
  id: string;
  sender: string;
  avatar: string;
  avatarColor: string;
  message: string;
  timestamp: string; // ISO string — safe to serialize
}

// Module-level array: lives on the server, not in the browser
const messageStore: ChatMessage[] = [];
const MAX_MESSAGES = 500; // keep last 500 messages to prevent unbounded growth

// GET — fetch all messages (optionally after a given timestamp for polling)
export async function GET(request: NextRequest) {
  const after = request.nextUrl.searchParams.get('after');

  let result = messageStore;
  if (after) {
    result = messageStore.filter(m => m.timestamp > after);
  }

  return NextResponse.json({ messages: result });
}

// POST — add a new message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sender, avatar, avatarColor, message } = body;

    if (!sender || !message || typeof message !== 'string') {
      return NextResponse.json({ error: 'sender and message are required' }, { status: 400 });
    }

    if (message.trim().length === 0 || message.trim().length > 1000) {
      return NextResponse.json({ error: 'Message must be 1–1000 characters' }, { status: 400 });
    }

    const newMessage: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      sender: String(sender).slice(0, 40),
      avatar: String(avatar || '?').slice(0, 2),
      avatarColor: String(avatarColor || 'bg-blue-500'),
      message: message.trim(),
      timestamp: new Date().toISOString(),
    };

    messageStore.push(newMessage);

    // Trim oldest messages if we exceed the cap
    if (messageStore.length > MAX_MESSAGES) {
      messageStore.splice(0, messageStore.length - MAX_MESSAGES);
    }

    return NextResponse.json({ message: newMessage });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
