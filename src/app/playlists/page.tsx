'use client';

import { useState } from 'react';
import PlaylistList from '@/components/PlaylistList';
import PlaylistForm from '@/components/PlaylistForm';
import PlaylistPlayer from '@/components/PlaylistPlayer';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import type { Playlist } from '@/types/playlist';

export default function PlaylistsPage() {
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [showForm, setShowForm] = useState(false);

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

        <PlaylistPlayer playlist={selectedPlaylist} onClose={() => setSelectedPlaylist(null)} />
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
