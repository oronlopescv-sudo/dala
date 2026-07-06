'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Hash, Lock, Music, Loader2, X, Radio } from 'lucide-react';
import type { Identity } from '@/lib/identity';
import Avatar from '@/components/Avatar';
import { cn } from '@/lib/cn';

export interface ChannelDTO {
  id: number;
  name: string;
  description: string | null;
  type: 'PUBLIC' | 'PRIVATE' | 'THEME';
  _count?: { messages: number };
}

function ChannelIcon({ type }: { type: ChannelDTO['type'] }) {
  if (type === 'PRIVATE') return <Lock className="w-5 h-5" />;
  if (type === 'THEME') return <Music className="w-5 h-5" />;
  return <Hash className="w-5 h-5" />;
}

export default function ChannelList({
  identity,
  onOpenChannel,
  onOpenProfile,
}: {
  identity: Identity;
  onOpenChannel: (channel: ChannelDTO) => void;
  onOpenProfile: () => void;
}) {
  const [channels, setChannels] = useState<ChannelDTO[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [online, setOnline] = useState<Record<string, number>>({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/channels');
      if (res.ok) setChannels(await res.json());
    } finally {
      setLoading(false);
    }
  };

  // Contagem de pessoas online por canal — refresca a cada 10s
  useEffect(() => {
    const fetchOnline = () =>
      fetch('/api/online')
        .then((r) => (r.ok ? r.json() : {}))
        .then(setOnline)
        .catch(() => {});
    fetchOnline();
    const interval = setInterval(fetchOnline, 10000);
    return () => clearInterval(interval);
  }, []);

  // Shuffle: entra num canal aleatório (de preferência com gente)
  const shuffle = () => {
    if (channels.length === 0) return;
    const withPeople = channels.filter((c) => (online[String(c.id)] ?? 0) > 0);
    const pool = withPeople.length > 0 ? withPeople : channels;
    const random = pool[Math.floor(Math.random() * pool.length)];
    onOpenChannel(random);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return channels;
    return channels.filter(
      (c) => c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)
    );
  }, [channels, query]);

  const popular = useMemo(
    () => [...channels].sort((a, b) => (b._count?.messages ?? 0) - (a._count?.messages ?? 0)).slice(0, 3),
    [channels]
  );

  return (
    <div className="flex flex-col h-full w-full max-w-md mx-auto">
      {/* Cabeçalho */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-emerald-800/50">
        <div className="flex items-center gap-2">
          <Radio className="w-6 h-6 text-amber-400" />
          <h1 className="text-xl font-bold text-emerald-50">Da Fala</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={shuffle}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-400 text-xs font-bold uppercase tracking-wide active:scale-95"
            aria-label="Canal aleatório"
          >
            🎲 Shuffle
          </button>
          <button onClick={onOpenProfile} aria-label="O meu perfil">
            <Avatar name={identity.username} photoUrl={identity.photoUrl} size={38} />
          </button>
        </div>
      </header>

      {/* Pesquisa */}
      <div className="px-5 py-3">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-900/40 border border-emerald-800/50 rounded-2xl">
          <Search className="w-4 h-4 text-emerald-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar canais…"
            className="flex-1 bg-transparent text-emerald-50 placeholder:text-emerald-500 focus:outline-none text-sm"
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="Limpar">
              <X className="w-4 h-4 text-emerald-400" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
          </div>
        ) : (
          <>
            {!query && popular.length > 0 && (
              <section className="mb-5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">
                  🔥 Salas populares
                </h2>
                <div className="flex flex-col gap-2">
                  {popular.map((c) => (
                    <ChannelRow key={`pop-${c.id}`} channel={c} onlineCount={online[String(c.id)] ?? 0} onClick={() => onOpenChannel(c)} />
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">
                {query ? 'Resultados' : 'Todos os canais'}
              </h2>
              <div className="flex flex-col gap-2">
                {filtered.map((c) => (
                  <ChannelRow key={c.id} channel={c} onlineCount={online[String(c.id)] ?? 0} onClick={() => onOpenChannel(c)} />
                ))}
                {filtered.length === 0 && (
                  <p className="text-sm text-emerald-500 py-6 text-center">Nenhum canal encontrado.</p>
                )}
              </div>
            </section>
          </>
        )}
      </div>

      {/* Botão criar canal */}
      <button
        onClick={() => setCreating(true)}
        className="absolute bottom-6 right-6 flex items-center justify-center w-14 h-14 bg-amber-400 rounded-full shadow-[0_8px_24px_rgba(251,191,36,0.4)] active:scale-95 transition-transform"
        aria-label="Criar canal"
      >
        <Plus className="w-7 h-7 text-emerald-950" />
      </button>

      {creating && (
        <CreateChannelModal
          identity={identity}
          onClose={() => setCreating(false)}
          onCreated={(c) => {
            setCreating(false);
            setChannels((prev) => [...prev, c]);
            onOpenChannel(c);
          }}
        />
      )}
    </div>
  );
}

function ChannelRow({
  channel,
  onlineCount = 0,
  onClick,
}: {
  channel: ChannelDTO;
  onlineCount?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 bg-emerald-900/40 border border-emerald-800/50 rounded-2xl text-left active:bg-emerald-800/40 transition-colors"
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-800/60 text-amber-400 shrink-0">
        <ChannelIcon type={channel.type} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-emerald-50 truncate">{channel.name}</p>
        {channel.description && (
          <p className="text-xs text-emerald-400 truncate">{channel.description}</p>
        )}
      </div>
      {onlineCount > 0 && (
        <span className="flex items-center gap-1 text-xs font-bold text-lime-400">
          <span className="w-2 h-2 rounded-full bg-lime-500 animate-pulse" />
          {onlineCount}
        </span>
      )}
    </button>
  );
}

function CreateChannelModal({
  identity,
  onClose,
  onCreated,
}: {
  identity: Identity;
  onClose: () => void;
  onCreated: (c: ChannelDTO) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ChannelDTO['type']>('PUBLIC');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description, type, creatorId: identity.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Falha ao criar canal');
      onCreated(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro');
    } finally {
      setLoading(false);
    }
  };

  const types: { value: ChannelDTO['type']; label: string }[] = [
    { value: 'PUBLIC', label: 'Público' },
    { value: 'THEME', label: 'Tema' },
    { value: 'PRIVATE', label: 'Privado' },
  ];

  return (
    <div className="absolute inset-0 z-20 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-emerald-950 border-t border-emerald-800 rounded-t-3xl p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-emerald-50">Criar canal</h2>
          <button onClick={onClose} aria-label="Fechar">
            <X className="w-5 h-5 text-emerald-400" />
          </button>
        </div>

        <input
          value={name}
          maxLength={30}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do canal"
          className="w-full px-4 py-3 text-emerald-950 bg-emerald-50 rounded-2xl focus:outline-none focus:ring-4 focus:ring-amber-400"
        />
        <input
          value={description}
          maxLength={80}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descrição (opcional)"
          className="w-full px-4 py-3 text-emerald-950 bg-emerald-50 rounded-2xl focus:outline-none focus:ring-4 focus:ring-amber-400"
        />

        <div className="flex gap-2">
          {types.map((t) => (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              className={cn(
                'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors',
                type === t.value
                  ? 'bg-amber-400 text-emerald-950'
                  : 'bg-emerald-900/60 text-emerald-300 border border-emerald-800/50'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          onClick={submit}
          disabled={!name.trim() || loading}
          className="flex items-center justify-center gap-2 w-full py-3.5 font-bold text-emerald-950 uppercase bg-amber-400 rounded-2xl disabled:opacity-50"
        >
          {loading && <Loader2 className="w-5 h-5 animate-spin" />}
          Criar
        </button>
      </div>
    </div>
  );
}
