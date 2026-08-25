'use client';

import { useEffect, useRef, useState, useCallback, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Send, Hash, ChevronDown, Check, Plus, Image as ImageIcon, Settings, X, RefreshCw, AtSign } from 'lucide-react';

const CHANNELS = [
  { id: 'general',   desc: 'General conversation' },
  { id: 'random',    desc: 'Anything goes' },
  { id: 'tech',      desc: 'Dev & tech talk' },
  { id: 'off-topic', desc: 'Everything else' },
] as const;
type Channel = typeof CHANNELS[number]['id'];

type ChatView =
  | { type: 'channel'; id: Channel }
  | { type: 'dm'; room: string; peer: string };

function makeDmRoom(a: string, b: string) {
  return [a, b].sort().join('::');
}

interface ChatMessage {
  _id: string;
  username?: string;
  from?: string;
  text: string;
  createdAt: string;
}

const ADJECTIVES = [
  'silent', 'velvet', 'cosmic', 'amber', 'neon', 'hollow', 'silver', 'drifting',
  'frozen', 'blazing', 'ashen', 'lunar', 'vivid', 'faded', 'wired', 'obsidian',
  'scarlet', 'indigo', 'golden', 'onyx', 'jade', 'crimson', 'azure', 'mossy',
  'rusted', 'glass', 'muted', 'raw', 'electric', 'phantom', 'spectral', 'ancient',
  'vapor', 'iron', 'midnight', 'solar', 'icy', 'burning', 'cursed', 'blessed',
];
const NOUNS = [
  'fox', 'echo', 'tide', 'spark', 'cloud', 'raven', 'dusk', 'leaf', 'stone', 'wave',
  'moth', 'crest', 'void', 'prism', 'drift', 'flare', 'shard', 'glyph', 'pulse', 'bloom',
  'wraith', 'comet', 'ridge', 'basin', 'creek', 'marsh', 'peak', 'vale', 'gust', 'mist',
  'ember', 'forge', 'anvil', 'cipher', 'signal', 'node', 'arc', 'orbit', 'relay', 'trace',
];

function generateUsername(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 90) + 10;
  return `${adj}-${noun}-${num}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<ChatView>({ type: 'channel', id: 'general' });
  const [navOpen, setNavOpen] = useState(false);
  const [newDmInput, setNewDmInput] = useState('');
  const [recentDms, setRecentDms] = useState<string[]>([]);
  const [dmInbox, setDmInbox] = useState<{ room: string; peer: string; lastAt: string }[]>([]);
  const [dmLastRead, setDmLastRead] = useState<Record<string, string>>({});
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draftUsername, setDraftUsername] = useState('');
  const [confirmingUsername, setConfirmingUsername] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const latestTimestampRef = useRef<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function init() {
      let name = localStorage.getItem('chat_username');
      if (!name) {
        // Auto-claim: generate until one is free
        let candidate = generateUsername();
        while (true) {
          const res = await fetch('/api/chat/username', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: candidate }),
          }).catch(() => null);
          if (!res || res.status !== 409) { name = candidate; break; }
          candidate = generateUsername();
        }
        localStorage.setItem('chat_username', name!);
      }
      setUsername(name!);

      const dms = localStorage.getItem('chat_recent_dms');
      if (dms) setRecentDms(JSON.parse(dms));
      const lastRead = localStorage.getItem('chat_dm_last_read');
      if (lastRead) setDmLastRead(JSON.parse(lastRead));

      const ch = searchParams.get('ch');
      const dm = searchParams.get('dm');
      if (dm && dm !== name) {
        setView({ type: 'dm', room: makeDmRoom(name!, dm), peer: dm });
      } else if (ch && CHANNELS.some(c => c.id === ch)) {
        setView({ type: 'channel', id: ch as Channel });
      }
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMessages = useCallback(async (initial = false) => {
    try {
      const baseUrl = view.type === 'channel'
        ? `/api/chat/messages?ch=${view.id}`
        : `/api/chat/dm?room=${encodeURIComponent(view.room)}`;
      const url = initial || !latestTimestampRef.current
        ? baseUrl
        : `${baseUrl}&since=${encodeURIComponent(latestTimestampRef.current)}`;

      const res = await fetch(url);
      if (!res.ok) return;
      const data: { messages: ChatMessage[] } = await res.json();
      if (data.messages.length === 0) return;

      setMessages(prev => {
        const ids = new Set(prev.map(m => m._id));
        return [...prev, ...data.messages.filter(m => !ids.has(m._id))];
      });
      latestTimestampRef.current = data.messages[data.messages.length - 1].createdAt;
    } catch { /* silently retry */ }
  }, [view]);

  // Sync URL when view changes
  useEffect(() => {
    const url = view.type === 'channel'
      ? view.id === 'general' ? '/chat' : `/chat?ch=${view.id}`
      : `/chat?dm=${encodeURIComponent(view.peer)}`;
    router.replace(url, { scroll: false });
  }, [view, router]);

  useEffect(() => {
    // Wait for username before fetching (DM room needs username to be known)
    if (!username) return;
    setMessages([]);
    latestTimestampRef.current = null;
    fetchMessages(true);
  }, [view, fetchMessages, username]);

  useEffect(() => {
    const id = setInterval(() => fetchMessages(false), 3000);
    return () => clearInterval(id);
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setNavOpen(false);
    }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (optionsRef.current && !optionsRef.current.contains(e.target as Node)) setOptionsOpen(false);
    }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (settingsOpen) setDraftUsername(username);
    if (!settingsOpen) { setConfirmingUsername(false); setUsernameError(''); }
  }, [settingsOpen, username]);

  // Poll DM inbox so user sees incoming DMs they didn't initiate
  useEffect(() => {
    if (!username) return;
    async function fetchInbox() {
      const res = await fetch(`/api/chat/dm/inbox?username=${encodeURIComponent(username)}`).catch(() => null);
      if (!res?.ok) return;
      const data = await res.json();
      setDmInbox(data.rooms ?? []);
    }
    fetchInbox();
    const id = setInterval(fetchInbox, 5_000);
    return () => clearInterval(id);
  }, [username]);

  function markRead(room: string) {
    const now = new Date().toISOString();
    setDmLastRead(prev => {
      const updated = { ...prev, [room]: now };
      localStorage.setItem('chat_dm_last_read', JSON.stringify(updated));
      return updated;
    });
  }

  function startDm(peer: string) {
    if (!username || peer === username) return;
    const room = makeDmRoom(username, peer);
    const updated = [peer, ...recentDms.filter(p => p !== peer)].slice(0, 10);
    localStorage.setItem('chat_recent_dms', JSON.stringify(updated));
    setRecentDms(updated);
    setView({ type: 'dm', room, peer });
    markRead(room);
    setNavOpen(false);
    setNewDmInput('');
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !username) return;
    setSending(true);
    setError('');
    try {
      const [endpoint, body] = view.type === 'channel'
        ? ['/api/chat/messages', { username, text: trimmed, channel: view.id }]
        : ['/api/chat/dm', { from: username, to: view.peer, room: view.room, text: trimmed }];
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { setError('Failed to send. Try again.'); return; }
      setText('');
      await fetchMessages(false);
    } catch { setError('Network error. Try again.'); }
    finally { setSending(false); }
  }

  async function handleShareImage() {
    setOptionsOpen(false);
    try {
      if (navigator.share) await navigator.share({ title: 'chat', url: window.location.href });
      else await navigator.clipboard.writeText(window.location.href);
    } catch { /* cancelled */ }
  }

  async function applyUsername() {
    const trimmed = draftUsername.trim().slice(0, 32);
    if (!trimmed) return;
    if (trimmed === username) { setSettingsOpen(false); return; }
    if (!confirmingUsername) { setConfirmingUsername(true); return; }

    // Try to register new username
    const res = await fetch('/api/chat/username', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: trimmed }),
    }).catch(() => null);

    if (res?.status === 409) {
      setConfirmingUsername(false);
      setUsernameError('That username is already taken. Try another.');
      return;
    }
    setUsernameError('');

    // Delete DMs and release old username
    await Promise.all([
      fetch(`/api/chat/dm?username=${encodeURIComponent(username)}`, { method: 'DELETE' }),
      fetch(`/api/chat/username?username=${encodeURIComponent(username)}`, { method: 'DELETE' }),
    ]).catch(() => null);

    localStorage.setItem('chat_username', trimmed);
    localStorage.removeItem('chat_recent_dms');
    localStorage.removeItem('chat_dm_last_read');
    setUsername(trimmed);
    setRecentDms([]);
    setDmInbox([]);
    setDmLastRead({});
    setView({ type: 'channel', id: 'general' });
    setMessages([]);
    setConfirmingUsername(false);
    setSettingsOpen(false);
  }

  // Mark current DM as read when view switches to it
  useEffect(() => {
    if (view.type === 'dm') markRead(view.room);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const unreadRooms = new Set(
    dmInbox
      .filter(r => view.type !== 'dm' || r.room !== view.room)
      .filter(r => !dmLastRead[r.room] || r.lastAt > dmLastRead[r.room])
      .map(r => r.room)
  );

  // Merge inbox with locally-opened DMs not yet in inbox
  const mergedDms = [
    ...dmInbox,
    ...recentDms
      .filter(peer => !dmInbox.some(r => r.peer === peer))
      .map(peer => ({ room: makeDmRoom(username, peer), peer, lastAt: '', lastMessage: '' })),
  ];

  const viewLabel = view.type === 'channel' ? view.id : view.peer;
  const ViewIcon = view.type === 'channel' ? Hash : AtSign;

  return (
    <div className="fixed inset-0 flex flex-col bg-[var(--background)] text-[var(--foreground)]">
      {/* Header */}
      <header className="flex items-center gap-2 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
        {/* Nav picker: channels + DMs */}
        <div ref={navRef} className="relative">
          <button
            onClick={() => setNavOpen(o => !o)}
            className="relative flex items-center gap-1.5 cursor-pointer rounded-lg px-2 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
          >
            <ViewIcon size={15} className="text-neutral-400" />
            <span className="font-semibold tracking-tight text-sm">{viewLabel}</span>
            <ChevronDown size={13} className={`text-neutral-400 transition-transform ${navOpen ? 'rotate-180' : ''}`} />
            {unreadRooms.size > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>

          {navOpen && (
            <div className="absolute left-0 top-full mt-1 w-56 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black shadow-lg z-50 overflow-hidden">
              <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Channels</p>
              {CHANNELS.map(ch => (
                <button
                  key={ch.id}
                  onClick={() => { setView({ type: 'channel', id: ch.id }); setNavOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors text-left cursor-pointer"
                >
                  <Hash size={13} className="text-neutral-400 shrink-0" />
                  <span className="text-sm flex-1">{ch.id}</span>
                  {view.type === 'channel' && view.id === ch.id && <Check size={13} className="text-neutral-500" />}
                </button>
              ))}

              <div className="border-t border-neutral-100 dark:border-neutral-900 mt-1" />
              <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Direct Messages</p>
              {mergedDms.map(({ room, peer }) => {
                const isUnread = unreadRooms.has(room);
                return (
                  <button
                    key={room}
                    onClick={() => startDm(peer)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors text-left cursor-pointer"
                  >
                    <AtSign size={13} className="text-neutral-400 shrink-0" />
                    <span className="text-sm flex-1 truncate">{peer}</span>
                    {isUnread && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}
                    {!isUnread && view.type === 'dm' && view.peer === peer && <Check size={13} className="text-neutral-500" />}
                  </button>
                );
              })}
              <div className="px-3 py-2">
                <form onSubmit={e => { e.preventDefault(); if (newDmInput.trim()) startDm(newDmInput.trim()); }} className="flex gap-1.5">
                  <input
                    value={newDmInput}
                    onChange={e => setNewDmInput(e.target.value)}
                    placeholder="New DM…"
                    maxLength={32}
                    className="flex-1 px-2.5 py-1.5 rounded-lg text-xs bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 outline-none focus:ring-1 focus:ring-neutral-400 placeholder-neutral-400"
                  />
                  <button type="submit" disabled={!newDmInput.trim()} className="px-2.5 py-1.5 rounded-lg text-xs bg-neutral-900 dark:bg-white text-white dark:text-black disabled:opacity-30 cursor-pointer">
                    Go
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        <span className="ml-auto" />
        <button onClick={() => setSettingsOpen(true)} className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer" title="Settings">
          <Settings size={15} className="text-neutral-400" />
        </button>
      </header>

      {/* Settings drawer */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20 dark:bg-black/50" onClick={() => setSettingsOpen(false)} />
          <div className="relative w-72 h-full bg-white dark:bg-black border-l border-neutral-200 dark:border-neutral-800 flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
              <span className="font-semibold text-sm">Settings</span>
              <button onClick={() => setSettingsOpen(false)} className="cursor-pointer hover:opacity-60 transition-opacity"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Identity</p>
                <p className="text-xs text-neutral-400">Your anonymous display name. Only stored in your browser.</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={draftUsername}
                    onChange={e => { setDraftUsername(e.target.value); setConfirmingUsername(false); setUsernameError(''); }}
                    onKeyDown={e => e.key === 'Enter' && applyUsername()}
                    maxLength={32}
                    placeholder="username"
                    className="flex-1 px-3 py-2 rounded-xl text-sm bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600"
                  />
                  <button onClick={() => setDraftUsername(generateUsername())} title="Generate random" className="flex items-center justify-center w-9 h-9 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer shrink-0">
                    <RefreshCw size={14} className="text-neutral-500" />
                  </button>
                </div>
                <button onClick={applyUsername} disabled={!draftUsername.trim()} className="w-full py-2 rounded-xl text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-black hover:opacity-80 transition-opacity disabled:opacity-30 cursor-pointer">
                  Save
                </button>                  {usernameError && (
                    <p className="text-xs text-red-500">{usernameError}</p>
                  )}                {confirmingUsername && (
                  <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950 p-3 space-y-2">
                    <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                      This will clear your DM history and start fresh as <strong>{draftUsername.trim()}</strong>. Your old messages remain in channels but are no longer linked to you. Continue?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={applyUsername}
                        className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-amber-600 text-white hover:bg-amber-700 transition-colors cursor-pointer"
                      >
                        Yes, change it
                      </button>
                      <button
                        onClick={() => setConfirmingUsername(false)}
                        className="flex-1 py-1.5 rounded-lg text-xs font-medium border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">About</p>
                <p className="text-xs text-neutral-400 leading-relaxed">Fully anonymous. No account, no tracking. Channel messages are public. DMs are private between two usernames.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-sm text-neutral-400 mt-16">
            {view.type === 'dm' ? `Start a conversation with ${view.peer}.` : 'No messages yet. Say something.'}
          </p>
        )}
        {messages.map(msg => {
          const sender = msg.username ?? msg.from ?? '?';
          const isOwn = sender === username;
          return (
            <div key={msg._id} className={`flex flex-col gap-0.5 max-w-xl ${isOwn ? 'ml-auto items-end' : 'items-start'}`}>
              <span className="text-xs text-neutral-400">
                {isOwn ? 'you' : (
                  <button onClick={() => startDm(sender)} className="hover:underline cursor-pointer" title={`DM ${sender}`}>
                    {sender}
                  </button>
                )}
                {' · '}{formatTime(msg.createdAt)}
              </span>
              <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${isOwn ? 'bg-neutral-900 text-white dark:bg-white dark:text-black rounded-br-sm' : 'bg-neutral-100 dark:bg-neutral-900 rounded-bl-sm'}`}>
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-0 shrink-0 border-t border-neutral-200 dark:border-neutral-800 px-4 py-3 bg-[var(--background)]">
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
        <div className="flex items-center gap-2">
          <div ref={optionsRef} className="relative shrink-0">
            <button onClick={() => setOptionsOpen(o => !o)} className="flex items-center justify-center w-9 h-9 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer">
              <Plus size={16} className="text-neutral-500" />
            </button>
            {optionsOpen && (
              <div className="absolute left-0 bottom-full mb-2 w-52 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black shadow-lg z-50 overflow-hidden">
                <button onClick={handleShareImage} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors text-left cursor-pointer">
                  <ImageIcon size={14} className="text-neutral-400 shrink-0" />
                  <span className="text-sm">Share image</span>
                </button>
              </div>
            )}
          </div>
          <form onSubmit={handleSend} className="flex flex-1 gap-2">
            <input
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={username ? `Message as ${username}…` : 'Message…'}
              maxLength={500}
              disabled={sending}
              className="flex-1 px-3 py-2 rounded-xl text-sm bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600 placeholder-neutral-400 disabled:opacity-50"
            />
            <button type="submit" disabled={sending || !text.trim()} className="flex items-center justify-center w-9 h-9 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-black hover:opacity-80 transition-opacity disabled:opacity-30 shrink-0 cursor-pointer">
              <Send size={15} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
