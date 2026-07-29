'use client';

import { useRef, useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { getToken } from '@/lib/identity';
import type { Music } from '@/types/playlist';

const MAX_MB = 10;

export default function AddMusicButton({
  playlistId,
  count,
  max,
  onAdded,
}: {
  playlistId: string;
  count: number;
  max: number;
  onAdded: (music: Music) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cheia = count >= max;

  // Lê a duração no browser: o servidor não descodifica o áudio.
  const lerDuracao = (file: File): Promise<number> =>
    new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const el = new Audio(url);
      el.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(Math.round(el.duration) || 0);
      };
      el.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(0);
      };
    });

  const enviar = async (file: File) => {
    setError(null);

    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`Ficheiro maior que ${MAX_MB} MB`);
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('title', file.name.replace(/\.[^.]+$/, ''));
      form.append('duration', String(await lerDuracao(file)));

      const res = await fetch(`/api/playlists/${playlistId}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form, // sem Content-Type: o browser define o boundary
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erro ao enviar');
      onAdded(data as Music);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="px-5 py-3">
      <input
        ref={fileRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) enviar(f);
          e.target.value = ''; // permite escolher o mesmo ficheiro outra vez
        }}
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading || cheia}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-400 text-emerald-950 font-bold text-sm uppercase disabled:opacity-50 active:scale-95"
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            A enviar…
          </>
        ) : (
          <>
            <Plus className="w-4 h-4" />
            {cheia ? `Limite de ${max} músicas` : 'Adicionar música'}
          </>
        )}
      </button>

      <p className="mt-1.5 text-center text-[11px] text-emerald-500">
        {count} de {max} · máx. {MAX_MB} MB por ficheiro
      </p>

      {error && (
        <p className="mt-2 px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-200 text-xs text-center">
          {error}
        </p>
      )}
    </div>
  );
}
