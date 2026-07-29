'use client';

import { useEffect, useState } from 'react';
import PlaylistList from '@/components/PlaylistList';
import PlaylistForm from '@/components/PlaylistForm';
import PlaylistPlayer from '@/components/PlaylistPlayer';
import AddMusicButton from '@/components/AddMusicButton';
import MusicList from '@/components/MusicList';
import { ArrowLeft, Play } from 'lucide-react';
import Link from 'next/link';
import { getIdentity, type Identity } from '@/lib/identity';

import type { Playlist } from '@/types/playlist';

// Tem de bater certo com o limite do servidor em /api/playlists/:id/upload
const MAX_MUSICAS = 10;

export default function PlaylistsPage() {
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [identity, setIdentity] = useState<Identity | null>(null);

  useEffect(() => {
    setIdentity(getIdentity());
  }, []);

  const handlePlaylistCreated = (playlist: Playlist) => {
    setShowForm(false);
    setSelectedPlaylist(playlist);
  };

  if (selectedPlaylist) {
    return (
      <div className="h-screen flex flex-col bg-emerald-950">
        <header className="flex items-center gap-3 px-5 py-4 border-b border-emerald-800/50">
          <button
            onClick={() => setSelectedPlaylist(null)}
            className="p-1 text-emerald-200 hover:text-emerald-50"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-emerald-50">{selectedPlaylist.name}</h1>
            <p className="text-xs text-emerald-400">por {selectedPlaylist.creator.username}</p>
          </div>
        </header>

        {/* Só o dono acrescenta músicas — o servidor também o valida */}
        {identity?.id === selectedPlaylist.creator.id && (
          <AddMusicButton
            playlistId={selectedPlaylist.id}
            count={selectedPlaylist.musics.length}
            max={MAX_MUSICAS}
            onAdded={(m) =>
              setSelectedPlaylist({
                ...selectedPlaylist,
                musics: [...selectedPlaylist.musics, m],
              })
            }
          />
        )}

        <div className="flex-1 overflow-y-auto">
          <MusicList
            playlistId={selectedPlaylist.id}
            musics={selectedPlaylist.musics}
            canEdit={identity?.id === selectedPlaylist.creator.id}
            onRemoved={(musicId) =>
              setSelectedPlaylist({
                ...selectedPlaylist,
                musics: selectedPlaylist.musics.filter((m) => m.id !== musicId),
              })
            }
          />
        </div>

        {/* Botão de tocar: o player é um painel por cima, por isso só abre
            quando é pedido — senão tapava a lista e o botão de remover. */}
        {selectedPlaylist.musics.length > 0 && (
          <div className="px-5 pb-6">
            <button
              onClick={() => setPlaying(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-400 text-emerald-950 font-bold text-sm uppercase active:scale-95"
            >
              <Play className="w-4 h-4" />
              Tocar playlist
            </button>
          </div>
        )}

        {playing && (
          <PlaylistPlayer playlist={selectedPlaylist} onClose={() => setPlaying(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-emerald-950">
      <header className="flex items-center gap-3 px-5 py-4 border-b border-emerald-800/50">
        <Link href="/" className="p-1 text-emerald-200 hover:text-emerald-50">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-lg font-bold text-emerald-50">Playlists</h1>
      </header>

      <PlaylistList onSelectPlaylist={setSelectedPlaylist} onCreatePlaylist={() => setShowForm(true)} />

      {showForm && (
        <PlaylistForm
          onCreated={handlePlaylistCreated}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
