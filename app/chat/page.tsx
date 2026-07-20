'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, Loader, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatMessage {
  id: string;
  sender: string;
  avatar: string;
  message: string;
  timestamp: Date;
}

// In-memory store for all messages
let messageStore: ChatMessage[] = [];

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [userName, setUserName] = useState('');
  const [userAvatar, setUserAvatar] = useState('');
  const [isSettingName, setIsSettingName] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize user name and avatar on mount
  useEffect(() => {
    const savedName = localStorage.getItem('chatUserName');
    const savedAvatar = localStorage.getItem('chatUserAvatar');

    if (savedName && savedAvatar) {
      setUserName(savedName);
      setUserAvatar(savedAvatar);
      setIsSettingName(false);
      // Load existing messages
      setMessages(messageStore);
    }
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const generateAvatar = (name: string): string => {
    // Simple avatar: colored circle with initials
    const initials = name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    // Generate a color based on name hash
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;

    return initials;
  };

  const getAvatarBgColor = (name: string): string => {
    const colors = [
      'bg-blue-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-green-500',
      'bg-orange-500',
      'bg-red-500',
      'bg-indigo-500',
      'bg-cyan-500',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const handleSetName = (name: string) => {
    if (name.trim().length < 2) {
      alert('Name must be at least 2 characters');
      return;
    }

    const avatar = generateAvatar(name);
    setUserName(name);
    setUserAvatar(avatar);
    setIsSettingName(false);

    localStorage.setItem('chatUserName', name);
    localStorage.setItem('chatUserAvatar', avatar);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!messageInput.trim()) return;

    setSending(true);

    try {
      const newMessage: ChatMessage = {
        id: `${Date.now()}-${Math.random()}`,
        sender: userName,
        avatar: userAvatar,
        message: messageInput.trim(),
        timestamp: new Date(),
      };

      // Add to in-memory store
      messageStore.push(newMessage);
      setMessages([...messageStore]);
      setMessageInput('');
    } catch (error) {
      console.error('[v0] Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isSettingName) {
    return (
      <div className="flex flex-col h-screen bg-background">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <Link href="/" className="p-2 hover:bg-muted rounded-lg transition">
            <ArrowLeft className="w-6 h-6 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Community Chat</h1>
            <p className="text-xs text-muted-foreground">Messages shared by all users</p>
          </div>
        </div>

        {/* Setup Screen */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-sm space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Set Your Chat Name</h2>
              <p className="text-muted-foreground">Choose a name to use in the community chat</p>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                const input = document.getElementById('nameInput') as HTMLInputElement;
                handleSetName(input.value);
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium">Your Name</label>
                <input
                  id="nameInput"
                  type="text"
                  placeholder="Enter your name..."
                  defaultValue=""
                  className="w-full px-4 py-3 rounded-lg border border-border bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                Enter Chat
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 hover:bg-muted rounded-lg transition">
            <ArrowLeft className="w-6 h-6 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Community Chat</h1>
            <p className="text-xs text-muted-foreground">{messages.length} messages</p>
          </div>
        </div>

        {/* User info */}
        <div
          className="flex items-center gap-2 cursor-pointer hover:bg-muted px-3 py-2 rounded-lg transition"
          onClick={() => {
            if (
              confirm(
                `Change user from "${userName}"? This will switch your chat identity.`
              )
            ) {
              localStorage.removeItem('chatUserName');
              localStorage.removeItem('chatUserAvatar');
              setIsSettingName(true);
              messageStore = [];
              setMessages([]);
            }
          }}
        >
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-bold ${getAvatarBgColor(userName)}`}
          >
            {userAvatar}
          </div>
          <span className="text-sm font-medium hidden sm:inline">{userName}</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center space-y-2">
              <User className="w-12 h-12 mx-auto opacity-50" />
              <p>No messages yet. Be the first to say something!</p>
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className="flex gap-3 animate-fade-in">
              {/* Avatar */}
              <div
                className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full text-white text-sm font-bold ${getAvatarBgColor(msg.sender)}`}
              >
                {msg.avatar}
              </div>

              {/* Message */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-foreground">{msg.sender}</span>
                  <span className="text-xs text-muted-foreground">{formatTime(msg.timestamp)}</span>
                </div>
                <p className="text-foreground break-words">{msg.message}</p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="border-t border-border p-4 space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={messageInput}
            onChange={e => setMessageInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 rounded-lg border border-border bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
            disabled={sending}
          />
          <Button
            type="submit"
            disabled={sending || !messageInput.trim()}
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
          >
            {sending ? <Loader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </div>
      </form>
    </div>
  );
}
