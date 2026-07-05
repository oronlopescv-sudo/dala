'use client';

import React, { useRef, useState } from 'react';
import { Radio, Camera, Loader2 } from 'lucide-react';
import { fileToAvatarDataUrl, saveIdentity, type Identity } from '@/lib/identity';
import { COUNTRIES, LANGUAGES } from '@/lib/constants';
import Avatar from '@/components/Avatar';

export default function Onboarding({ onDone }: { onDone: (identity: Identity) => void }) {
  const [username, setUsername] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [country, setCountry] = useState('CV');
  const [language, setLanguage] = useState('pt');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setPhotoUrl(await fileToAvatarDataUrl(file));
    } catch {
      setError('Não foi possível processar a imagem');
    }
  };

  const handleSubmit = async () => {
    const name = username.trim();
    if (!name) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: name, photoUrl, bio: bio.trim() || null, country, language }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Falha ao criar conta');
      const user = (await res.json()) as Identity;
      saveIdentity(user);
      onDone(user);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 w-full p-6 overflow-y-auto">
      <div className="w-full max-w-sm p-7 bg-emerald-900/40 backdrop-blur-md rounded-3xl border border-emerald-800/50 shadow-2xl flex flex-col gap-5">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center justify-center w-16 h-16 bg-amber-400 rounded-full shadow-lg">
            <Radio className="w-8 h-8 text-emerald-950" />
          </div>
          <h1 className="text-2xl font-bold text-emerald-50">Da Fala</h1>
          <p className="text-sm text-emerald-300/80">Cria a tua conta e começa a falar</p>
        </div>

        {/* Foto de perfil */}
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative group"
            aria-label="Escolher foto"
          >
            <Avatar name={username || '?'} photoUrl={photoUrl} size={88} />
            <span className="absolute bottom-0 right-0 flex items-center justify-center w-8 h-8 bg-emerald-950 rounded-full border-2 border-amber-400">
              <Camera className="w-4 h-4 text-amber-400" />
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
        </div>

        <input
          type="text"
          placeholder="Nome de utilizador"
          value={username}
          maxLength={24}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-4 py-3 text-emerald-950 bg-emerald-50 rounded-2xl focus:outline-none focus:ring-4 focus:ring-amber-400 placeholder:text-emerald-900/40"
        />

        <textarea
          placeholder="Bio (opcional)"
          value={bio}
          maxLength={140}
          rows={2}
          onChange={(e) => setBio(e.target.value)}
          className="w-full px-4 py-3 text-emerald-950 bg-emerald-50 rounded-2xl resize-none focus:outline-none focus:ring-4 focus:ring-amber-400 placeholder:text-emerald-900/40"
        />

        <div className="flex gap-3">
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="flex-1 px-3 py-3 text-emerald-950 bg-emerald-50 rounded-2xl focus:outline-none focus:ring-4 focus:ring-amber-400"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name}
              </option>
            ))}
          </select>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="flex-1 px-3 py-3 text-emerald-950 bg-emerald-50 rounded-2xl focus:outline-none focus:ring-4 focus:ring-amber-400"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-red-400 text-center">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={!username.trim() || loading}
          className="flex items-center justify-center gap-2 w-full py-3.5 text-lg font-bold text-emerald-950 uppercase bg-amber-400 rounded-2xl active:bg-amber-500 disabled:opacity-50 shadow-[0_0_20px_rgba(251,191,36,0.3)]"
        >
          {loading && <Loader2 className="w-5 h-5 animate-spin" />}
          Entrar
        </button>
      </div>
    </div>
  );
}
