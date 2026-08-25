'use client';

import { RefObject, useEffect, useRef, useState } from 'react';

interface ChatMessage {
  _id: string;
  username?: string;
  from?: string;
  text: string;
  createdAt: string;
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
                // Top corners: only round if first in group
                !isGrouped ? 'rounded-t-2xl' : 'rounded-t-lg',
                // Bottom corners: only round if last in group; indent the near corner
                isLastInGroup
                  ? isOwn ? 'rounded-bl-2xl rounded-br-sm' : 'rounded-br-2xl rounded-bl-sm'
                  : 'rounded-b-lg',
              ].join(' ')}>
                {msg.text}
              </div>
            </div>
          );
        })}
      </div>
      <div ref={bottomRef} />
    </div>
  );
}
