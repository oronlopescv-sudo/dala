'use client';

import { useState } from 'react';
import { getToken } from '@/lib/identity';

export default function PlaylistForm({
  onCreated,
  onCancel,
}: {
  onCreated: (playlist: any) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Nome da playlist é obrigatório');
      return;
    }

    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          isPublic,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao criar playlist');
      }

      const playlist = await res.json();
      onCreated(playlist);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar playlist');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-emerald-950 border border-emerald-800/50 rounded-2xl p-6 max-w-md w-full">
        <h2 className="text-xl font-bold text-emerald-50 mb-4">Criar Playlist</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-emerald-400 mb-2">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Minha playlist de música"
              disabled={loading}
              className="w-full px-4 py-2.5 rounded-xl bg-emerald-900/40 border border-emerald-800/50 text-emerald-50 placeholder:text-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-emerald-400 mb-2">
              Descrição (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreve a tua playlist..."
              disabled={loading}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl bg-emerald-900/40 border border-emerald-800/50 text-emerald-50 placeholder:text-emerald-500 focus:outline-none resize-none"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              disabled={loading}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm text-emerald-200">Playlist pública (qualquer um pode ouvir)</span>
          </label>

          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-amber-400 text-emerald-950 font-bold text-sm uppercase disabled:opacity-50 active:scale-95"
            >
              {loading ? 'A criar...' : 'Criar'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl border border-emerald-800/50 text-emerald-300 font-bold text-sm uppercase disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
