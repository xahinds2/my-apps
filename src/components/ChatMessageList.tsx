'use client';

import { RefObject, useEffect, useRef, useState } from 'react';
import { Paperclip, X } from 'lucide-react';

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

type ChatView = { type: 'channel'; id: string } | { type: 'dm'; room: string; peer: string };

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

function isSameGroup(a: ChatMessage, b: ChatMessage): boolean {
  const senderA = a.username ?? a.from ?? '?';
  const senderB = b.username ?? b.from ?? '?';
  if (senderA !== senderB) return false;
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() < 5 * 60_000;
}

interface ChatMessageListProps {
  messages: ChatMessage[];
  username: string;
  view: ChatView;
  onStartDm: (peer: string) => void;
  bottomRef: RefObject<HTMLDivElement | null>;
  isLoading?: boolean;
}

export default function ChatMessageList({ messages, username, view, onStartDm, bottomRef, isLoading }: ChatMessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [, setTick] = useState(0);
  const initialScrollDone = useRef(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Refresh relative timestamps every minute
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Always scroll on first load; smart scroll for subsequent updates
  useEffect(() => {
    const el = containerRef.current;
    if (!el || messages.length === 0) return;
    if (!initialScrollDone.current) {
      initialScrollDone.current = true;
      bottomRef.current?.scrollIntoView({ behavior: 'instant' });
      return;
    }
    const last = messages[messages.length - 1];
    const lastSender = last.username ?? last.from ?? '?';
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    if (nearBottom || lastSender === username) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, username, bottomRef]);

  // Reset on view change so switching channels always scrolls to bottom
  useEffect(() => {
    initialScrollDone.current = false;
  }, [view]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-4">
      {!isLoading && messages.length === 0 && (
        <p className="text-center text-sm text-neutral-400 mt-16">
          {view.type === 'dm' ? `Start a conversation with ${view.peer}.` : 'No messages yet. Say something.'}
        </p>
      )}
      <div className="flex flex-col gap-0.5">
        {messages.map((msg, i) => {
          const sender = msg.username ?? msg.from ?? '?';
          const isOwn = sender === username;
          const prev = messages[i - 1];
          const isGrouped = !!prev && isSameGroup(prev, msg);
          const next = messages[i + 1];
          const isLastInGroup = !next || !isSameGroup(msg, next);

          return (
            <div
              key={msg._id}
              className={`flex flex-col max-w-xl ${isOwn ? 'ml-auto items-end' : 'items-start'} ${isGrouped ? 'mt-0.5' : 'mt-3'}`}
            >
              {!isGrouped && (
                <span className="text-xs text-neutral-400 mb-1 px-1">
                  {isOwn ? 'you' : (
                    <button onClick={() => onStartDm(sender)} className="hover:underline cursor-pointer" title={`DM ${sender}`}>
                      {sender}
                    </button>
                  )}
                  {' · '}{relativeTime(msg.createdAt)}
                </span>
              )}
              <div className={[
                'px-3 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap max-w-full',
                isOwn ? 'bg-neutral-900 text-white dark:bg-white dark:text-black' : 'bg-neutral-100 dark:bg-neutral-900',
                !isGrouped ? 'rounded-t-2xl' : 'rounded-t-lg',
                isLastInGroup
                  ? isOwn ? 'rounded-bl-2xl rounded-br-sm' : 'rounded-br-2xl rounded-bl-sm'
                  : 'rounded-b-lg',
              ].join(' ')}>
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className={`flex flex-wrap gap-1.5 ${msg.text ? 'mb-1.5' : ''}`}>
                    {msg.attachments.map((a, idx) =>
                      a.fileType.startsWith('image/') ? (
                        <button key={idx} onClick={() => setPreviewUrl(a.url)} className="cursor-pointer">
                          <img src={a.url} alt={a.name} className="max-w-48 max-h-48 rounded-lg object-cover" />
                        </button>
                      ) : (
                        <a key={idx} href={a.url} download={a.name} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs ${isOwn ? 'bg-white/10 dark:bg-black/10' : 'bg-neutral-200 dark:bg-neutral-800'}`}>
                          <Paperclip size={12} />
                          <span className="truncate max-w-32">{a.name}</span>
                        </a>
                      )
                    )}
                  </div>
                )}
                {msg.text}
              </div>
            </div>
          );
        })}
      </div>
      <div ref={bottomRef} />

      {/* Image preview lightbox */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setPreviewUrl(null)}>
          <button onClick={() => setPreviewUrl(null)} className="absolute top-4 right-4 size-10 rounded-full bg-white/10 flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors">
            <X size={20} className="text-white" />
          </button>
          <img src={previewUrl} alt="Preview" className="max-w-[90vw] max-h-[90vh] rounded-xl object-contain" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
