'use client';

import { FormEvent, Dispatch, SetStateAction } from 'react';
import { Hash, AtSign, Search, Plus, Check } from 'lucide-react';

type ChatView = { type: 'channel'; id: string } | { type: 'dm'; room: string; peer: string };

interface ChannelState {
  mode: null | 'search' | 'add';
  setMode: Dispatch<SetStateAction<null | 'search' | 'add'>>;
  search: string;
  setSearch: (s: string) => void;
  newInput: string;
  setNewInput: (s: string) => void;
  error: string;
  setError: (s: string) => void;
}

interface DmState {
  mode: null | 'search';
  setMode: Dispatch<SetStateAction<null | 'search' | 'add'>>;
  search: string;
  setSearch: (s: string) => void;
  results: string[];
  setResults: (r: string[]) => void;
}

interface ChatNavContentProps {
  compact?: boolean;
  view: ChatView;
  channels: string[];
  mergedDms: { room: string; peer: string; lastAt: string }[];
  unreadRooms: Set<string>;
  channelState: ChannelState;
  dmState: DmState;
  onSelectChannel: (id: string) => void;
  onSelectDm: (peer: string) => void;
  onCreateChannel: (e: FormEvent) => void;
}

export default function ChatNavContent({
  compact = false,
  view,
  channels,
  mergedDms,
  unreadRooms,
  channelState,
  dmState,
  onSelectChannel,
  onSelectDm,
  onCreateChannel,
}: ChatNavContentProps) {
  const px = compact ? 'px-3' : 'px-4';
  const itemPy = compact ? 'py-2' : 'py-3';
  const iconSize = compact ? 13 : 15;
  const textSize = compact ? 'text-sm' : 'text-base';
  const inputCls = compact
    ? 'w-full px-2.5 py-1.5 rounded-lg text-xs bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 outline-none focus:ring-1 focus:ring-neutral-400 placeholder-neutral-400'
    : 'w-full px-3 py-2 rounded-xl text-sm bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 outline-none focus:ring-1 focus:ring-neutral-400 placeholder-neutral-400';

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Channels */}
      <div className={`flex items-center justify-between ${px} pt-3 pb-1`}>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Channels</p>
        <div className="flex gap-0.5">
          <button
            onClick={() => channelState.setMode(m => m === 'search' ? null : 'search')}
            className={`p-1 rounded-md transition-colors cursor-pointer ${channelState.mode === 'search' ? 'bg-neutral-100 dark:bg-neutral-900' : 'hover:bg-neutral-100 dark:hover:bg-neutral-900'}`}
          >
            <Search size={compact ? 12 : 13} className="text-neutral-400" />
          </button>
          <button
            onClick={() => channelState.setMode(m => m === 'add' ? null : 'add')}
            className={`p-1 rounded-md transition-colors cursor-pointer ${channelState.mode === 'add' ? 'bg-neutral-100 dark:bg-neutral-900' : 'hover:bg-neutral-100 dark:hover:bg-neutral-900'}`}
          >
            <Plus size={compact ? 12 : 13} className="text-neutral-400" />
          </button>
        </div>
      </div>

      {channelState.mode === 'search' && (
        <div className={`${px} pb-2`}>
          <input autoFocus value={channelState.search} onChange={e => channelState.setSearch(e.target.value)} placeholder="Search channels…" className={inputCls} />
        </div>
      )}

      {channels
        .filter(id => !channelState.search || id.includes(channelState.search.toLowerCase()))
        .map(id => (
          <button
            key={id}
            onClick={() => onSelectChannel(id)}
            className={`w-full flex items-center gap-2.5 ${px} ${itemPy} hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors text-left cursor-pointer`}
          >
            <Hash size={iconSize} className="text-neutral-400 shrink-0" />
            <span className={`${textSize} flex-1 truncate`}>{id}</span>
            {view.type === 'channel' && view.id === id && <Check size={compact ? 12 : 14} className="text-neutral-400" />}
          </button>
        ))
      }

      {channelState.mode === 'add' && (
        <div className={`${px} py-2 border-t border-neutral-100 dark:border-neutral-900`}>
          <form onSubmit={onCreateChannel} className="flex gap-1.5">
            <input
              autoFocus
              value={channelState.newInput}
              onChange={e => { channelState.setNewInput(e.target.value); channelState.setError(''); }}
              placeholder="Channel name…"
              maxLength={32}
              className={inputCls}
            />
            <button
              type="submit"
              disabled={!channelState.newInput.trim()}
              className={`${compact ? 'px-2.5 py-1.5 text-xs rounded-lg' : 'px-3 py-2 text-sm rounded-xl'} bg-neutral-900 dark:bg-white text-white dark:text-black disabled:opacity-30 cursor-pointer shrink-0`}
            >
              Add
            </button>
          </form>
          {channelState.error && <p className="text-xs text-red-500 mt-1">{channelState.error}</p>}
        </div>
      )}

      {/* DMs */}
      <div className="border-t border-neutral-100 dark:border-neutral-900 mt-1" />
      <div className={`flex items-center justify-between ${px} pt-3 pb-1`}>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Direct Messages</p>
        <button
          onClick={() => dmState.setMode(m => m === 'search' ? null : 'search')}
          className={`p-1 rounded-md transition-colors cursor-pointer ${dmState.mode === 'search' ? 'bg-neutral-100 dark:bg-neutral-900' : 'hover:bg-neutral-100 dark:hover:bg-neutral-900'}`}
        >
          <Search size={compact ? 12 : 13} className="text-neutral-400" />
        </button>
      </div>

      {dmState.mode === 'search' && (
        <div className={`${px} pb-2`}>
          <input
            autoFocus
            value={dmState.search}
            onChange={e => dmState.setSearch(e.target.value)}
            placeholder="Search users…"
            className={inputCls}
          />
          {dmState.results.map(u => (
            <button
              key={u}
              onClick={() => { onSelectDm(u); dmState.setSearch(''); dmState.setResults([]); }}
              className={`w-full flex items-center gap-2.5 px-1 ${compact ? 'py-1.5' : 'py-2.5'} hover:opacity-70 transition-opacity text-left cursor-pointer`}
            >
              <AtSign size={iconSize} className="text-neutral-400 shrink-0" />
              <span className={`${textSize} flex-1 truncate`}>{u}</span>
            </button>
          ))}
        </div>
      )}

      {mergedDms
        .filter(({ peer }) => !dmState.search || peer.includes(dmState.search.toLowerCase()))
        .map(({ room, peer }) => {
          const isUnread = unreadRooms.has(room);
          return (
            <button
              key={room}
              onClick={() => onSelectDm(peer)}
              className={`w-full flex items-center gap-2.5 ${px} ${itemPy} hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors text-left cursor-pointer`}
            >
              <AtSign size={iconSize} className="text-neutral-400 shrink-0" />
              <span className={`${textSize} flex-1 truncate`}>{peer}</span>
              {isUnread && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}
              {!isUnread && view.type === 'dm' && view.peer === peer && <Check size={compact ? 12 : 14} className="text-neutral-400" />}
            </button>
          );
        })
      }
    </div>
  );
}
