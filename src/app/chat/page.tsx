'use client';

import { useEffect, useRef, useState, useCallback, FormEvent, KeyboardEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Send, Hash, Image as ImageIcon, Settings, X, RefreshCw, AtSign, Link, Search, Plus, Check, ArrowLeft, Paperclip } from 'lucide-react';
import ChatNavContent from '@/components/ChatNavContent';
import ChatMessageList from '@/components/ChatMessageList';

type ChatView =
  | { type: 'channel'; id: string }
  | { type: 'dm'; room: string; peer: string };

function msgCacheKey(view: ChatView) {
  return view.type === 'channel' ? `chat_msgs_ch:${view.id}` : `chat_msgs_dm:${view.room}`;
}

function makeDmRoom(a: string, b: string) {
  return [a, b].sort().join('::');
}

interface Attachment {
  url: string;
  name: string;
  fileType: string;
  size: number;
}

interface ChatMessage {
  _id: string;
  username?: string;
  from?: string;
  text: string;
  createdAt: string;
  attachments?: Attachment[];
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
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `${adj}-${noun}-${num}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  if (hours < 48) return 'yesterday';
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<ChatView>({ type: 'channel', id: 'general' });
  const [mobileNavOpen, setMobileNavOpen] = useState(true);
  const [newDmInput, setNewDmInput] = useState('');
  const [recentDms, setRecentDms] = useState<string[]>([]);
  const [dmInbox, setDmInbox] = useState<{ room: string; peer: string; lastAt: string }[]>([]);
  const [dmLastRead, setDmLastRead] = useState<Record<string, string>>({});
  const [customChannels, setCustomChannels] = useState<string[]>(['general', 'random', 'tech', 'off-topic']);
  const [newChannelInput, setNewChannelInput] = useState('');
  const [newChannelError, setNewChannelError] = useState('');
  const [channelMode, setChannelMode] = useState<null | 'search' | 'add'>(null);
  const [channelSearch, setChannelSearch] = useState('');
  const [dmMode, setDmMode] = useState<null | 'search' | 'add'>(null);
  const [dmSearch, setDmSearch] = useState('');
  const [dmSearchResults, setDmSearchResults] = useState<string[]>([]);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draftUsername, setDraftUsername] = useState('');
  const [confirmingUsername, setConfirmingUsername] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [sending, setSending] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [error, setError] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [peerStatus, setPeerStatus] = useState<{ online: boolean; lastActiveAt: string | null } | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const latestTimestampRef = useRef<string | null>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const didMountRef = useRef(false);
  const poppingRef = useRef(false);


  useEffect(() => {
    async function init() {
      // Get or generate a persistent device token tied to this browser
      let deviceToken = localStorage.getItem('chat_device_token');
      if (!deviceToken) {
        deviceToken = crypto.randomUUID();
        localStorage.setItem('chat_device_token', deviceToken);
      }

      let name = localStorage.getItem('chat_username');

      // Try to restore username from device token (works across instances sharing same DB)
      if (!name) {
        const r = await fetch(`/api/chat/username?device=${encodeURIComponent(deviceToken)}`).catch(() => null);
        if (r?.ok) {
          const d = await r.json();
          if (d.username) {
            name = d.username;
            localStorage.setItem('chat_username', name!);
          }
        }
      }

      if (!name) {
        // Auto-claim: generate until one is free
        let candidate = generateUsername();
        while (true) {
          const res = await fetch('/api/chat/username', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: candidate, deviceToken }),
          }).catch(() => null);
          if (!res || res.status !== 409) { name = candidate; break; }
          candidate = generateUsername();
        }
        localStorage.setItem('chat_username', name!);
      } else {
        // Ensure username is registered in DB with this device token
        fetch('/api/chat/username', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: name, deviceToken }),
        }).catch(() => null);
      }
      setUsername(name!);

      const dms = localStorage.getItem('chat_recent_dms');
      if (dms) setRecentDms(JSON.parse(dms));
      const lastRead = localStorage.getItem('chat_dm_last_read');
      if (lastRead) setDmLastRead(JSON.parse(lastRead));

      // Apply cached channels immediately (after hydration), then refresh from API
      try {
        const cached = localStorage.getItem('chat_channels');
        if (cached) setCustomChannels(JSON.parse(cached));
      } catch { /* ignore */ }

      fetch('/api/chat/channels')
        .then(r => r.ok ? r.json() : { channels: ['general', 'random', 'tech', 'off-topic'] })
        .then(d => {
          const ch = d.channels ?? [];
          setCustomChannels(ch);
          try { localStorage.setItem('chat_channels', JSON.stringify(ch)); } catch { /* ignore */ }
        });

      const ch = searchParams.get('ch');
      const dm = searchParams.get('dm');
      if (dm && dm !== name) {
        setView({ type: 'dm', room: makeDmRoom(name!, dm), peer: dm });
        setMobileNavOpen(false);
      } else if (ch) {
        setView({ type: 'channel', id: ch });
        setMobileNavOpen(false);
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
        const updated = [...prev, ...data.messages.filter(m => !ids.has(m._id))];
        // Cache last 60 messages for instant load next visit
        try { localStorage.setItem(msgCacheKey(view), JSON.stringify(updated.slice(-60))); } catch { /* ignore */ }
        return updated;
      });
      latestTimestampRef.current = data.messages[data.messages.length - 1].createdAt;
    } catch { /* silently retry */ }
  }, [view]);

  // Sync URL when view changes — push so browser back/forward works
  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return; }
    if (poppingRef.current) { poppingRef.current = false; return; }
    const url = view.type === 'channel'
      ? view.id === 'general' ? '/chat' : `/chat?ch=${view.id}`
      : `/chat?dm=${encodeURIComponent(view.peer)}`;
    router.push(url, { scroll: false });
  }, [view, router]);

  // Sync state when browser back/forward changes the URL
  useEffect(() => {
    function onPop() {
      const params = new URLSearchParams(window.location.search);
      const ch = params.get('ch');
      const dm = params.get('dm');
      poppingRef.current = true;
      if (dm && username && dm !== username) {
        setView({ type: 'dm', room: makeDmRoom(username, dm), peer: dm });
        setMobileNavOpen(false);
      } else if (ch) {
        setView({ type: 'channel', id: ch });
        setMobileNavOpen(false);
      } else {
        setView({ type: 'channel', id: 'general' });
        setMobileNavOpen(true);
      }
    }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [username]);

  useEffect(() => {
    if (!username) return;
    // Show cached messages instantly, then fetch fresh
    try {
      const cached = localStorage.getItem(msgCacheKey(view));
      setMessages(cached ? JSON.parse(cached) : []);
    } catch { setMessages([]); }
    latestTimestampRef.current = null;
    setMessagesLoading(true);
    fetchMessages(true).finally(() => setMessagesLoading(false));
  }, [view, fetchMessages, username]);

  useEffect(() => {
    const id = setInterval(() => fetchMessages(false), 3000);
    return () => clearInterval(id);
  }, [fetchMessages]);

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

  // Debounced username search for DM
  useEffect(() => {
    if (!dmSearch.trim()) { setDmSearchResults([]); return; }
    const id = setTimeout(() => {
      fetch(`/api/chat/username?q=${encodeURIComponent(dmSearch.trim())}`)
        .then(r => r.ok ? r.json() : { usernames: [] })
        .then(d => setDmSearchResults((d.usernames ?? []).filter((u: string) => u !== username)));
    }, 250);
    return () => clearTimeout(id);
  }, [dmSearch, username]);

  // Heartbeat — keep username alive, re-register if expired
  useEffect(() => {
    if (!username) return;
    const deviceToken = localStorage.getItem('chat_device_token') ?? '';
    async function heartbeat() {
      const res = await fetch('/api/chat/username', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      }).catch(() => null);
      if (res?.status === 404) {
        // Username expired — re-register it with device token
        const re = await fetch('/api/chat/username', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, deviceToken }),
        }).catch(() => null);
        if (re?.status === 409) {
          // Someone else took it — get a fresh identity
          const fresh = generateUsername();
          localStorage.setItem('chat_username', fresh);
          localStorage.removeItem('chat_recent_dms');
          localStorage.removeItem('chat_dm_last_read');
          localStorage.removeItem('chat_dm_inbox');
          window.location.reload();
        }
      }
    }
    heartbeat();
    const id = setInterval(heartbeat, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [username]);

  // Poll peer online status in DM view
  useEffect(() => {
    if (view.type !== 'dm') { setPeerStatus(null); return; }
    const peer = view.peer;
    // Clear stale data immediately before fetching for new peer
    setPeerStatus(null);
    function fetchStatus() {
      fetch(`/api/chat/username?status=${encodeURIComponent(peer)}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => d && setPeerStatus(d))
        .catch(() => null);
    }
    fetchStatus();
    const id = setInterval(fetchStatus, 30_000);
    return () => clearInterval(id);
  }, [view]);

  // Poll DM inbox so user sees incoming DMs they didn't initiate
  useEffect(() => {
    if (!username) return;
    // Load cached inbox immediately
    try {
      const cached = localStorage.getItem('chat_dm_inbox');
      if (cached) setDmInbox(JSON.parse(cached));
    } catch { /* ignore */ }
    async function fetchInbox() {
      const res = await fetch(`/api/chat/dm/inbox?username=${encodeURIComponent(username)}`).catch(() => null);
      if (!res?.ok) return;
      const data = await res.json();
      const rooms = data.rooms ?? [];
      setDmInbox(rooms);
      try { localStorage.setItem('chat_dm_inbox', JSON.stringify(rooms)); } catch { /* ignore */ }
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
    setMobileNavOpen(false);
    setNewDmInput('');
  }

  async function uploadFile(file: File): Promise<Attachment | null> {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/chat/upload', { method: 'POST', body: form }).catch(() => null);
    if (!res?.ok) return null;
    return res.json();
  }

  async function handleFileSelect(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setOptionsOpen(false);
    const results = await Promise.all(Array.from(files).slice(0, 5).map(uploadFile));
    const uploaded = results.filter(Boolean) as Attachment[];
    setPendingAttachments(prev => [...prev, ...uploaded].slice(0, 5));
    setUploading(false);
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if ((!trimmed && pendingAttachments.length === 0) || !username) return;
    setSending(true);
    setError('');
    try {
      const attachments = pendingAttachments.length > 0 ? pendingAttachments : undefined;
      const [endpoint, body] = view.type === 'channel'
        ? ['/api/chat/messages', { username, text: trimmed, channel: view.id, attachments }]
        : ['/api/chat/dm', { from: username, to: view.peer, room: view.room, text: trimmed, attachments }];
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { setError('Failed to send. Try again.'); return; }
      setText('');
      setPendingAttachments([]);
      if (textareaRef.current) { textareaRef.current.style.height = 'auto'; }
      await fetchMessages(false);
    } catch { setError('Network error. Try again.'); }
    finally { setSending(false); }
  }

  function handleTextareaKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as unknown as FormEvent);
    }
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  async function copyDmLink() {
    const url = `${window.location.origin}/chat?dm=${encodeURIComponent(username)}`;
    await navigator.clipboard.writeText(url).catch(() => null);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  async function createChannel(e: FormEvent) {
    e.preventDefault();
    const name = newChannelInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (!name) return;
    setNewChannelError('');
    const res = await fetch('/api/chat/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }).catch(() => null);
    if (res?.status === 409) { setNewChannelError('Already exists'); return; }
    if (!res?.ok) { setNewChannelError('Invalid name'); return; }
    setCustomChannels(prev => [...prev, name]);
    setNewChannelInput('');
    setView({ type: 'channel', id: name });
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
    localStorage.removeItem('chat_dm_inbox');
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

  // Batch poll online status for all DM peers (must be after mergedDms)
  useEffect(() => {
    if (mergedDms.length === 0) { setOnlineUsers(new Set()); return; }
    function fetchOnline() {
      const names = mergedDms.map(d => d.peer).join(',');
      fetch(`/api/chat/username?online=${encodeURIComponent(names)}`)
        .then(r => r.ok ? r.json() : { online: [] })
        .then(d => setOnlineUsers(new Set(d.online ?? [])))
        .catch(() => null);
    }
    fetchOnline();
    const id = setInterval(fetchOnline, 30_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergedDms.length]);

  return (
    <div className="fixed inset-0 flex flex-col md:flex-row bg-[var(--background)] text-[var(--foreground)]">
      {/* Mobile full-page nav — hidden on md+ */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 flex flex-col bg-[var(--background)] text-[var(--foreground)] md:hidden">
          <header className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
            <span className="font-semibold text-sm">Whisprr</span>
            <button onClick={() => setSettingsOpen(true)} className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer" title="Settings">
              <Settings size={15} className="text-neutral-400" />
            </button>
          </header>
          <ChatNavContent
            view={view}
            channels={customChannels}
            mergedDms={mergedDms}
            unreadRooms={unreadRooms}
            channelState={{ mode: channelMode, setMode: setChannelMode, search: channelSearch, setSearch: setChannelSearch, newInput: newChannelInput, setNewInput: setNewChannelInput, error: newChannelError, setError: setNewChannelError }}
            dmState={{ mode: dmMode as null | 'search', setMode: setDmMode, search: dmSearch, setSearch: setDmSearch, results: dmSearchResults, setResults: setDmSearchResults }}
            onSelectChannel={id => { setView({ type: 'channel', id }); setMobileNavOpen(false); setChannelSearch(''); setChannelMode(null); }}
            onSelectDm={startDm}
            onCreateChannel={createChannel}
            onlineUsers={onlineUsers}
          />
        </div>
      )}

      {/* Desktop sidebar — hidden on mobile */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
          <span className="font-semibold text-sm">Whisprr</span>
          <button onClick={() => setSettingsOpen(true)} className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer" title="Settings">
            <Settings size={15} className="text-neutral-400" />
          </button>
        </div>
        <ChatNavContent
          compact
          view={view}
          channels={customChannels}
          mergedDms={mergedDms}
          unreadRooms={unreadRooms}
          channelState={{ mode: channelMode, setMode: setChannelMode, search: channelSearch, setSearch: setChannelSearch, newInput: newChannelInput, setNewInput: setNewChannelInput, error: newChannelError, setError: setNewChannelError }}
          dmState={{ mode: dmMode as null | 'search', setMode: setDmMode, search: dmSearch, setSearch: setDmSearch, results: dmSearchResults, setResults: setDmSearchResults }}
          onSelectChannel={id => { setView({ type: 'channel', id }); setChannelSearch(''); setChannelMode(null); }}
          onSelectDm={startDm}
          onCreateChannel={createChannel}
          onlineUsers={onlineUsers}
        />
        {username && (
          <div className="px-3 py-2.5 border-t border-neutral-200 dark:border-neutral-800 flex items-center gap-2 shrink-0">
            <div className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">{username[0].toUpperCase()}</span>
            </div>
            <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate flex-1">{username}</span>
          </div>
        )}
      </aside>

      {/* Chat panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <header className="flex items-center gap-3 px-6 py-3 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
        {/* Back button — mobile only */}
        <button onClick={() => { setMobileNavOpen(true); window.history.pushState(null, '', '/chat'); }} className="md:hidden flex items-center justify-center w-7 h-7 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer shrink-0">
          <ArrowLeft size={15} className="text-neutral-400" />
        </button>
        {/* Mobile view label */}
        <div className="md:hidden flex flex-col justify-center">
          <div className="flex items-center gap-1.5">
            <ViewIcon size={15} className="text-neutral-400" />
            <span className="font-semibold tracking-tight text-sm">{viewLabel}</span>
            {unreadRooms.size > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-500" />
            )}
          </div>
          {peerStatus && (
            <span className="text-[10px] flex items-center gap-1 pl-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${peerStatus.online ? 'bg-green-500' : 'bg-neutral-400'}`} />
              {peerStatus.online ? 'Online' : peerStatus.lastActiveAt ? `Last seen ${relativeTime(peerStatus.lastActiveAt)}` : 'Offline'}
            </span>
          )}
        </div>
        {/* Desktop view label — left-aligned, no absolute positioning */}
        <div className="hidden md:flex flex-col justify-center">
          <div className="flex items-center gap-2">
            <ViewIcon size={15} className="text-neutral-400" />
            <span className="font-semibold text-sm">{viewLabel}</span>
          </div>
          {peerStatus && (
            <span className="text-[10px] flex items-center gap-1 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${peerStatus.online ? 'bg-green-500' : 'bg-neutral-400'}`} />
              {peerStatus.online ? 'Online' : peerStatus.lastActiveAt ? `Last seen ${relativeTime(peerStatus.lastActiveAt)}` : 'Offline'}
            </span>
          )}
        </div>
        <span className="flex-1" />
        {/* Settings — mobile only; desktop uses sidebar */}
        <button onClick={() => setSettingsOpen(true)} className="md:hidden flex items-center justify-center w-7 h-7 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer" title="Settings">
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
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Your DM Link</p>
                <p className="text-xs text-neutral-400">Share this link so others can message you directly.</p>
                <button
                  onClick={copyDmLink}
                  disabled={!username}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer disabled:opacity-40"
                >
                  <Link size={14} className="text-neutral-400" />
                  {linkCopied ? 'Copied!' : 'Copy link'}
                </button>
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
      <ChatMessageList
        messages={messages}
        username={username}
        view={view}
        onStartDm={startDm}
        bottomRef={bottomRef}
        isLoading={messagesLoading}
      />

      {/* Input */}
      <footer className="shrink-0 border-t border-neutral-200 dark:border-neutral-800 bg-[var(--background)]">
        {error && <p className="text-xs text-red-500 px-4 pt-2">{error}</p>}
        {/* Attachment preview */}
        {pendingAttachments.length > 0 && (
          <div className="flex gap-2 px-4 pt-2 overflow-x-auto">
            {pendingAttachments.map((a, i) => (
              <div key={i} className="relative shrink-0 group">
                {a.fileType.startsWith('image/') ? (
                  <img src={a.url} alt={a.name} className="h-16 w-16 object-cover rounded-lg border border-neutral-200 dark:border-neutral-800" />
                ) : (
                  <div className="h-16 w-16 rounded-lg border border-neutral-200 dark:border-neutral-800 flex items-center justify-center bg-neutral-50 dark:bg-neutral-900">
                    <Paperclip size={16} className="text-neutral-400" />
                  </div>
                )}
                <button type="button" onClick={() => setPendingAttachments(prev => prev.filter((_, j) => j !== i))} className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                  <X size={10} />
                </button>
                <p className="text-[9px] text-neutral-400 truncate w-16 mt-0.5 text-center">{a.name}</p>
              </div>
            ))}
          </div>
        )}
        <input ref={imageInputRef} type="file" accept="image/*" multiple hidden onChange={e => { handleFileSelect(e.target.files); e.target.value = ''; }} />
        <input ref={fileInputRef} type="file" accept="image/*,.pdf,.txt,.doc,.docx,.xls,.xlsx,.zip" multiple hidden onChange={e => { handleFileSelect(e.target.files); e.target.value = ''; }} />
        <div className="max-w-3xl mx-auto w-full">
        <form onSubmit={handleSend} className="flex items-center gap-2 px-4 md:px-6 py-2.5">
          <div ref={optionsRef} className="relative">
            <button type="button" onClick={() => setOptionsOpen(o => !o)} className="flex items-center justify-center size-10 rounded-full border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer">
              <Plus size={18} className="text-neutral-500" />
            </button>
            {optionsOpen && (
              <div className="absolute left-0 bottom-full mb-2 w-52 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black shadow-lg z-50 overflow-hidden">
                <button type="button" onClick={() => { imageInputRef.current?.click(); setOptionsOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors text-left cursor-pointer">
                  <ImageIcon size={14} className="text-neutral-400 shrink-0" />
                  <span className="text-sm">Image</span>
                </button>
                <button type="button" onClick={() => { fileInputRef.current?.click(); setOptionsOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors text-left cursor-pointer">
                  <Paperclip size={14} className="text-neutral-400 shrink-0" />
                  <span className="text-sm">File</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 relative flex items-center min-h-10 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus-within:ring-2 focus-within:ring-neutral-400 dark:focus-within:ring-neutral-600">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextareaChange}
              onKeyDown={handleTextareaKeyDown}
              placeholder={username ? `Message as ${username}` : 'Message'}
              maxLength={500}
              rows={1}
              disabled={sending}
              className="flex-1 bg-transparent px-4 py-2 text-sm placeholder-neutral-400 disabled:opacity-50 resize-none overflow-hidden outline-none leading-snug"
            />
            {text.length > 400 && (
              <span className={`mr-3 text-[10px] tabular-nums shrink-0 ${text.length >= 490 ? 'text-red-500' : 'text-neutral-400'}`}>
                {500 - text.length}
              </span>
            )}
          </div>

          <button type="submit" disabled={sending || (!text.trim() && pendingAttachments.length === 0)} className="flex items-center justify-center size-10 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-black hover:opacity-80 transition-opacity disabled:opacity-30 cursor-pointer">
            <Send size={16} />
          </button>
        </form>
        </div>
      </footer>
      </div>
    </div>
  );
}

export default function ChatPageWrapper() {
  return (
    <Suspense>
      <ChatPage />
    </Suspense>
  );
}
