'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useWallet } from '@/lib/wallet-context';
import {
  createXMTPClientFromStellar,
  fetchConversations,
  fetchConversationMessages,
  sendMessage,
  formatXMTPAddress,
  formatMessageTime,
} from '@/lib/xmtp-utils';
import { Client, Conversation, Message } from '@xmtp/browser-sdk';
import { ArrowLeft, Send, MessageCircle, Loader, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ChatPage() {
  const { activeWallet, globalDecryptedSecret } = useWallet();
  const [xmtpClient, setXmtpClient] = useState<Client | null>(null);
  const [xmtpAddress, setXmtpAddress] = useState<string>('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipientInput, setRecipientInput] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize XMTP client from Stellar secret
  useEffect(() => {
    if (!globalDecryptedSecret) {
      setError('Wallet is locked. Please unlock to use chat.');
      return;
    }

    const initXMTP = async () => {
      try {
        setLoading(true);
        const { client, address } = await createXMTPClientFromStellar(globalDecryptedSecret);
        setXmtpClient(client);
        setXmtpAddress(address);

        // Fetch conversations
        const convos = await fetchConversations(client);
        setConversations(convos);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to initialize XMTP');
      } finally {
        setLoading(false);
      }
    };

    initXMTP();
  }, [globalDecryptedSecret]);

  // Load messages when conversation is selected
  useEffect(() => {
    if (!selectedConversation) return;

    const loadMessages = async () => {
      try {
        setLoading(true);
        const msgs = await fetchConversationMessages(selectedConversation, 50);
        setMessages(msgs);
        setTimeout(() => scrollToBottom(), 100);
      } catch (err: any) {
        setError(err.message || 'Failed to load messages');
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [selectedConversation]);

  // Auto-scroll to bottom when messages update
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send a message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !xmtpClient || !selectedConversation) return;

    try {
      setSendingMessage(true);
      const message = await sendMessage(xmtpClient, selectedConversation.peerAddress, newMessage);
      setMessages(prev => [...prev, message]);
      setNewMessage('');
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  // Start a new conversation
  const handleStartChat = async () => {
    if (!recipientInput.trim() || !xmtpClient) {
      setError('Please enter a valid recipient address');
      return;
    }

    try {
      setLoading(true);
      // Open or create conversation with recipient
      const conversation = await xmtpClient.conversations.openOrCreate(recipientInput);
      setSelectedConversation(conversation);
      setRecipientInput('');
      setShowNewChat(false);

      // Add to conversations list if not already there
      if (!conversations.some(c => c.peerAddress === recipientInput)) {
        setConversations(prev => [conversation, ...prev]);
      }

      // Load messages
      const msgs = await fetchConversationMessages(conversation, 50);
      setMessages(msgs);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to start conversation');
    } finally {
      setLoading(false);
    }
  };

  // Handle Enter key to send message
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!globalDecryptedSecret) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <Lock className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Wallet Locked</h1>
        <p className="text-muted-foreground text-center max-w-sm">
          Please unlock your wallet to access Web3 Chat.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/exchange">
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold">Web3 Chat</h1>
              <p className="text-xs text-muted-foreground">XMTP Encrypted Messaging</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Your Identity:</p>
            <p className="text-sm font-mono font-semibold text-primary">{formatXMTPAddress(xmtpAddress)}</p>
          </div>
        </div>
      </header>

      {/* Error Alert */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 mx-4 mt-2 rounded-lg flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-lg leading-none">×</button>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex gap-4 max-w-7xl w-full mx-auto px-4 py-4 overflow-hidden">
        {/* Conversations List */}
        <div className="w-full md:w-72 flex-shrink-0 border border-border/40 rounded-lg bg-card flex flex-col">
          <div className="p-4 border-b border-border/40">
            <Button
              onClick={() => setShowNewChat(!showNewChat)}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              New Chat
            </Button>
          </div>

          {/* New Chat Input */}
          {showNewChat && (
            <div className="p-4 border-b border-border/40 space-y-2">
              <input
                type="text"
                placeholder="0x... (XMTP address)"
                value={recipientInput}
                onChange={e => setRecipientInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                    handleStartChat();
                  }
                }}
                className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleStartChat}
                  disabled={loading || !recipientInput.trim()}
                  size="sm"
                  className="flex-1"
                >
                  {loading ? <Loader className="w-4 h-4 animate-spin" /> : 'Start'}
                </Button>
                <Button
                  onClick={() => setShowNewChat(false)}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No conversations yet. Start a new chat!
              </div>
            ) : (
              <div className="space-y-2 p-2">
                {conversations.map(convo => (
                  <button
                    key={convo.peerAddress}
                    onClick={() => setSelectedConversation(convo)}
                    className={`w-full px-3 py-3 rounded text-left text-sm transition-colors ${
                      selectedConversation?.peerAddress === convo.peerAddress
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <p className="font-mono font-semibold">{formatXMTPAddress(convo.peerAddress)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="hidden md:flex flex-1 flex-col border border-border/40 rounded-lg bg-card overflow-hidden">
          {selectedConversation ? (
            <>
              {/* Messages Header */}
              <div className="p-4 border-b border-border/40">
                <p className="text-sm font-semibold">Chatting with</p>
                <p className="text-sm font-mono text-primary">{formatXMTPAddress(selectedConversation.peerAddress)}</p>
              </div>

              {/* Messages Display */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loading && messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                    <p>Start the conversation with a message!</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.senderAddress === xmtpAddress ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs px-4 py-2 rounded-lg text-sm ${
                          msg.senderAddress === xmtpAddress
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        <p className="break-words">{msg.content}</p>
                        <p
                          className={`text-xs mt-1 opacity-70 ${
                            msg.senderAddress === xmtpAddress ? 'text-primary-foreground' : 'text-muted-foreground'
                          }`}
                        >
                          {formatMessageTime(new Date(msg.sentAt))}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-border/40">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={sendingMessage}
                    className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={sendingMessage || !newMessage.trim()}
                    size="icon"
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {sendingMessage ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-center text-muted-foreground">
              <p>Select a conversation or start a new chat</p>
            </div>
          )}
        </div>

        {/* Mobile Message View */}
        {selectedConversation && (
          <div className="md:hidden absolute inset-0 top-20 flex-1 flex-col border border-border/40 rounded-lg bg-card overflow-hidden z-50">
            <div className="p-4 border-b border-border/40 flex items-center justify-between">
              <p className="text-sm font-mono text-primary">{formatXMTPAddress(selectedConversation.peerAddress)}</p>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedConversation(null)}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading && messages.length === 0 ? (
                <Loader className="w-6 h-6 animate-spin text-muted-foreground" />
              ) : messages.length === 0 ? (
                <p className="text-center text-muted-foreground">Start the conversation!</p>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.senderAddress === xmtpAddress ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg text-sm ${
                        msg.senderAddress === xmtpAddress
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      <p className="break-words">{msg.content}</p>
                      <p className="text-xs mt-1 opacity-70">
                        {formatMessageTime(new Date(msg.sentAt))}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-border/40">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={sendingMessage}
                  className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={sendingMessage || !newMessage.trim()}
                  size="icon"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {sendingMessage ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
