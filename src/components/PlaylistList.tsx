'use client';

import { useEffect, useState } from 'react';
import { Music, Plus, Lock, Globe } from 'lucide-react';
import { getToken } from '@/lib/identity';
import type { Playlist } from '@/types/playlist';

export default function PlaylistList({
  onSelectPlaylist,
  onCreatePlaylist,
}: {
  onSelectPlaylist: (playlist: Playlist) => void;
  onCreatePlaylist: () => void;
}) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        const token = getToken();
        const res = await fetch('/api/playlists', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          setPlaylists(await res.json());
        }
      } catch (error) {
        console.error('Erro ao carregar playlists:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylists();
  }, []);

  if (loading) {
    return <div className="p-6 text-center text-emerald-400">A carregar playlists...</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-emerald-50 flex items-center gap-2">
            <Music className="w-6 h-6" />
            Playlists
          </h2>
          <button
            onClick={onCreatePlaylist}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 text-emerald-950 font-bold text-sm uppercase active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Nova
          </button>
        </div>

        {playlists.length === 0 ? (
          <div className="text-center py-12 text-emerald-400">
            Nenhuma playlist ainda. Cria a tua primeira!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {playlists.map((playlist) => (
              <button
                key={playlist.id}
                onClick={() => onSelectPlaylist(playlist)}
                className="p-4 rounded-2xl bg-emerald-900/40 border border-emerald-800/50 text-left hover:border-emerald-700 active:scale-95 transition"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-emerald-50 truncate">{playlist.name}</h3>
                  {playlist.isPublic ? (
                    <Globe className="w-4 h-4 text-emerald-400 flex-shrink-0 ml-2" />
                  ) : (
                    <Lock className="w-4 h-4 text-amber-400 flex-shrink-0 ml-2" />
                  )}
                </div>
                {playlist.description && (
                  <p className="text-xs text-emerald-300 mb-2 line-clamp-2">{playlist.description}</p>
                )}
                <div className="flex items-center justify-between text-xs text-emerald-400">
                  <span>{playlist.musics.length} músicas</span>
                  <span>{playlist._count.listeners} ouvintes</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
