'use client';

import { RefObject } from 'react';

interface ChatMessage {
  _id: string;
  username?: string;
  from?: string;
  text: string;
  createdAt: string;
}

type ChatView = { type: 'channel'; id: string } | { type: 'dm'; room: string; peer: string };

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

interface ChatMessageListProps {
  messages: ChatMessage[];
  username: string;
  view: ChatView;
  onStartDm: (peer: string) => void;
  bottomRef: RefObject<HTMLDivElement | null>;
}

export default function ChatMessageList({ messages, username, view, onStartDm, bottomRef }: ChatMessageListProps) {
  return (
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
                <button onClick={() => onStartDm(sender)} className="hover:underline cursor-pointer" title={`DM ${sender}`}>
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
  );
}
