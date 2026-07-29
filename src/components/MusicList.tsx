'use client';

import { useState } from 'react';
import { Trash2, Music as MusicIcon } from 'lucide-react';
import { getToken } from '@/lib/identity';
import type { Music } from '@/types/playlist';

export default function MusicList({
  playlistId,
  musics,
  canEdit,
  onRemoved,
}: {
  playlistId: string;
  musics: Music[];
  canEdit: boolean;
  onRemoved: (musicId: string) => void;
}) {
  const [removing, setRemoving] = useState<string | null>(null);

  const remover = async (m: Music) => {
    if (!confirm(`Remover "${m.title}" da playlist?`)) return;
    setRemoving(m.id);
    try {
      const res = await fetch(`/api/playlists/${playlistId}/musics/${m.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        onRemoved(m.id);
      } else {
        const d = await res.json();
        alert(d.error ?? 'Erro ao remover');
      }
    } catch {
      alert('Erro de ligação');
    } finally {
      setRemoving(null);
    }
  };

  const duracao = (s: number) => {
    if (!s) return '';
    const m = Math.floor(s / 60);
    return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  };

  if (musics.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-sm text-emerald-500">
        Ainda não há músicas nesta playlist.
      </p>
    );
  }

  return (
    <div className="px-5 pb-4 flex flex-col gap-1.5">
      {musics.map((m, i) => (
        <div
          key={m.id}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-emerald-900/40 border border-emerald-800/50"
        >
          <span className="text-xs text-emerald-500 w-5 flex-shrink-0">{i + 1}</span>
          <MusicIcon className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-emerald-50 truncate">{m.title}</p>
            {m.artist && <p className="text-xs text-emerald-400 truncate">{m.artist}</p>}
          </div>
          <span className="text-xs text-emerald-500 flex-shrink-0">{duracao(m.duration)}</span>
          {canEdit && (
            <button
              onClick={() => remover(m)}
              disabled={removing === m.id}
              aria-label={`Remover ${m.title}`}
              className="p-1.5 rounded-lg text-red-400 hover:bg-red-900/30 disabled:opacity-40 flex-shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
