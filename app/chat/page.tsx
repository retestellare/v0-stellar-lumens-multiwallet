'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, Loader, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatMessage {
  id: string;
  sender: string;
  avatar: string;
  avatarColor: string;
  message: string;
  timestamp: string;
}

const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-green-500',
  'bg-orange-500',
  'bg-red-500',
  'bg-indigo-500',
  'bg-cyan-500',
  'bg-teal-500',
  'bg-yellow-600',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const POLL_INTERVAL_MS = 3000;

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [userName, setUserName] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [isSettingName, setIsSettingName] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastTimestampRef = useRef<string>('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const userAvatar = userName ? getInitials(userName) : '?';
  const userColor = userName ? getAvatarColor(userName) : 'bg-gray-500';

  // Fetch all messages on first load
  const fetchAllMessages = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/chat');
      const data = await res.json();
      const msgs: ChatMessage[] = data.messages || [];
      setMessages(msgs);
      if (msgs.length > 0) {
        lastTimestampRef.current = msgs[msgs.length - 1].timestamp;
      }
    } catch {
      // silently fail
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  // Poll for new messages since last known timestamp
  const pollMessages = useCallback(async () => {
    try {
      const url = lastTimestampRef.current
        ? `/api/chat?after=${encodeURIComponent(lastTimestampRef.current)}`
        : '/api/chat';
      const res = await fetch(url);
      const data = await res.json();
      const newMsgs: ChatMessage[] = data.messages || [];
      if (newMsgs.length > 0) {
        setMessages(prev => {
          // Avoid duplicates in case of edge cases
          const existingIds = new Set(prev.map(m => m.id));
          const unique = newMsgs.filter(m => !existingIds.has(m.id));
          if (unique.length === 0) return prev;
          return [...prev, ...unique];
        });
        lastTimestampRef.current = newMsgs[newMsgs.length - 1].timestamp;
      }
    } catch {
      // silently fail on poll errors
    }
  }, []);

  // Start polling once logged in
  useEffect(() => {
    if (!isSettingName) {
      fetchAllMessages();
      pollRef.current = setInterval(pollMessages, POLL_INTERVAL_MS);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isSettingName, fetchAllMessages, pollMessages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Restore saved name
  useEffect(() => {
    const saved = localStorage.getItem('chatUserName');
    if (saved) {
      setUserName(saved);
      setIsSettingName(false);
    }
  }, []);

  const handleSetName = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (trimmed.length < 2) {
      alert('Name must be at least 2 characters');
      return;
    }
    setUserName(trimmed);
    localStorage.setItem('chatUserName', trimmed);
    setIsSettingName(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: userName,
          avatar: userAvatar,
          avatarColor: userColor,
          message: messageInput.trim(),
        }),
      });
      const data = await res.json();
      if (data.message) {
        setMessages(prev => {
          const exists = prev.some(m => m.id === data.message.id);
          if (exists) return prev;
          return [...prev, data.message];
        });
        lastTimestampRef.current = data.message.timestamp;
        setMessageInput('');
      }
    } catch {
      // silently fail
    } finally {
      setSending(false);
    }
  };

  const handleChangeName = () => {
    if (confirm(`Change name from "${userName}"?`)) {
      localStorage.removeItem('chatUserName');
      setUserName('');
      setNameInput('');
      setMessages([]);
      lastTimestampRef.current = '';
      if (pollRef.current) clearInterval(pollRef.current);
      setIsSettingName(true);
    }
  };

  // ---- Name setup screen ----
  if (isSettingName) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <Link href="/" className="p-2 hover:bg-muted rounded-lg transition">
            <ArrowLeft className="w-6 h-6 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Community Chat</h1>
            <p className="text-xs text-muted-foreground">Messages shared by all users</p>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-amber-500 flex items-center justify-center mx-auto">
                <User className="w-8 h-8 text-black" />
              </div>
              <h2 className="text-2xl font-bold">Set Your Name</h2>
              <p className="text-muted-foreground text-sm">
                Choose a name to appear in the community chat
              </p>
            </div>

            <form onSubmit={handleSetName} className="space-y-4">
              <input
                type="text"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                placeholder="Enter your name..."
                maxLength={40}
                autoFocus
                className="w-full px-4 py-3 rounded-lg border border-border bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <Button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold py-3"
              >
                Enter Chat
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ---- Main chat screen ----
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 p-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 hover:bg-muted rounded-lg transition">
            <ArrowLeft className="w-6 h-6 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Community Chat</h1>
            <p className="text-xs text-muted-foreground">
              {loadingHistory ? 'Loading history...' : `${messages.length} messages`}
            </p>
          </div>
        </div>

        {/* Current user avatar — click to change name */}
        <button
          onClick={handleChangeName}
          title="Change name"
          className={`flex items-center justify-center w-10 h-10 rounded-full text-white text-sm font-bold flex-shrink-0 ${userColor} hover:opacity-80 transition`}
        >
          {userAvatar}
        </button>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <Loader className="w-8 h-8 animate-spin text-amber-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center space-y-3">
              <User className="w-12 h-12 mx-auto opacity-40" />
              <p>No messages yet. Be the first to say something!</p>
            </div>
          </div>
        ) : (
          messages.map(msg => {
            const isOwn = msg.sender === userName;
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div
                  className={`flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full text-white text-xs font-bold ${msg.avatarColor || getAvatarColor(msg.sender)}`}
                >
                  {msg.avatar || getInitials(msg.sender)}
                </div>

                {/* Bubble */}
                <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                  {!isOwn && (
                    <span className="text-xs font-semibold text-muted-foreground mb-1">
                      {msg.sender}
                    </span>
                  )}
                  <div
                    className={`px-4 py-2 rounded-2xl text-sm break-words ${
                      isOwn
                        ? 'bg-amber-500 text-black rounded-tr-sm'
                        : 'bg-muted text-foreground rounded-tl-sm'
                    }`}
                  >
                    {msg.message}
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSendMessage}
        className="border-t border-border p-4 flex gap-3 flex-shrink-0"
      >
        <input
          type="text"
          value={messageInput}
          onChange={e => setMessageInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage(e);
            }
          }}
          placeholder="Type a message..."
          maxLength={1000}
          disabled={sending}
          className="flex-1 px-4 py-3 rounded-xl border border-border bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
        />
        <Button
          type="submit"
          disabled={sending || !messageInput.trim()}
          className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-4 rounded-xl flex-shrink-0"
        >
          {sending ? (
            <Loader className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </Button>
      </form>
    </div>
  );
}
