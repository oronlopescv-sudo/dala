'use client';

import React, { useRef, useState } from 'react';
import { ArrowLeft, Camera, Loader2, LogOut } from 'lucide-react';
import { fileToAvatarDataUrl, saveIdentity, clearIdentity, type Identity } from '@/lib/identity';
import { COUNTRIES, LANGUAGES, countryFlag } from '@/lib/constants';
import Avatar from '@/components/Avatar';

export default function Profile({
  identity,
  onBack,
  onUpdate,
  onLogout,
}: {
  identity: Identity;
  onBack: () => void;
  onUpdate: (i: Identity) => void;
  onLogout: () => void;
}) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(identity.photoUrl);
  const [bio, setBio] = useState(identity.bio ?? '');
  const [country, setCountry] = useState(identity.country ?? 'CV');
  const [language, setLanguage] = useState(identity.language ?? 'pt');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setPhotoUrl(await fileToAvatarDataUrl(file));
    } catch {
      /* ignore */
    }
  };

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/users/${identity.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl, bio: bio.trim() || null, country, language }),
      });
      if (res.ok) {
        const updated = (await res.json()) as Identity;
        saveIdentity(updated);
        onUpdate(updated);
        setSaved(true);
      }
    } finally {
      setSaving(false);
    }
  };

  const logout = () => {
    clearIdentity();
    onLogout();
  };

  return (
    <div className="flex flex-col h-full w-full max-w-md mx-auto">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-emerald-800/50">
        <button onClick={onBack} aria-label="Voltar" className="p-1">
          <ArrowLeft className="w-6 h-6 text-emerald-200" />
        </button>
        <h1 className="text-lg font-bold text-emerald-50">O meu perfil</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
        <div className="flex flex-col items-center gap-2">
          <button onClick={() => fileRef.current?.click()} className="relative" aria-label="Mudar foto">
            <Avatar name={identity.username} photoUrl={photoUrl} size={100} />
            <span className="absolute bottom-0 right-0 flex items-center justify-center w-9 h-9 bg-emerald-950 rounded-full border-2 border-amber-400">
              <Camera className="w-4 h-4 text-amber-400" />
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
          <h2 className="text-xl font-bold text-emerald-50 mt-1">
            {countryFlag(country)} {identity.username}
          </h2>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-emerald-400">Bio</label>
          <textarea
            value={bio}
            maxLength={140}
            rows={3}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Fala um pouco sobre ti…"
            className="mt-1 w-full px-4 py-3 text-emerald-950 bg-emerald-50 rounded-2xl resize-none focus:outline-none focus:ring-4 focus:ring-amber-400"
          />
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-emerald-400">País</label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="mt-1 w-full px-4 py-3 text-emerald-950 bg-emerald-50 rounded-2xl focus:outline-none focus:ring-4 focus:ring-amber-400"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-emerald-400">Idioma</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="mt-1 w-full px-4 py-3 text-emerald-950 bg-emerald-50 rounded-2xl focus:outline-none focus:ring-4 focus:ring-amber-400"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="flex items-center justify-center gap-2 w-full py-3.5 font-bold text-emerald-950 uppercase bg-amber-400 rounded-2xl disabled:opacity-50"
        >
          {saving && <Loader2 className="w-5 h-5 animate-spin" />}
          {saved ? 'Guardado ✓' : 'Guardar alterações'}
        </button>

        <button
          onClick={logout}
          className="flex items-center justify-center gap-2 w-full py-3 font-semibold text-red-300 border border-red-400/30 rounded-2xl active:bg-red-500/10"
        >
          <LogOut className="w-5 h-5" />
          Terminar sessão
        </button>
      </div>
    </div>
  );
}
