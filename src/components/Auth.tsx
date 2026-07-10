'use client';

import { useState } from 'react';
import { Radio } from 'lucide-react';
import { saveIdentity, type Identity } from '@/lib/identity';
import { COUNTRIES, LANGUAGES } from '@/lib/constants';
import { cn } from '@/lib/cn';

type Mode = 'login' | 'signup';

export default function Auth({ onDone }: { onDone: (i: Identity) => void }) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState('CV');
  const [language, setLanguage] = useState('pt');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Preenche email e password');
      return;
    }
    if (mode === 'signup') {
      if (!username.trim()) {
        setError('Escolhe um nome de utilizador');
        return;
      }
      if (password.length < 6) {
        setError('A password deve ter pelo menos 6 caracteres');
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch(mode === 'login' ? '/api/auth/login' : '/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mode === 'login'
            ? { email: email.trim(), password }
            : { email: email.trim(), username: username.trim(), password }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Algo correu mal');
        return;
      }

      const identity: Identity = {
        id: data.user.id,
        email: data.user.email,
        username: data.user.username,
        photoUrl: data.user.photoUrl ?? null,
        bio: data.user.bio ?? null,
        country: data.user.country ?? country,
        language: data.user.language ?? language,
      };
      saveIdentity(identity, data.token);
      onDone(identity);
    } catch {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-5 overflow-y-auto">
      <div className="w-full max-w-sm bg-emerald-900/30 border border-emerald-800/50 rounded-3xl p-6 backdrop-blur-md">
        <div className="flex flex-col items-center mb-5">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-amber-400 shadow-[0_8px_24px_rgba(251,191,36,0.4)] mb-3">
            <Radio className="w-8 h-8 text-emerald-950" />
          </div>
          <h1 className="text-2xl font-bold text-emerald-50">Da Fala</h1>
          <p className="text-sm text-emerald-400">
            {mode === 'login' ? 'Entra e começa a falar' : 'Cria a tua conta e começa a falar'}
          </p>
        </div>

        {/* Abas login/signup */}
        <div className="flex gap-2 mb-4">
          {(['login', 'signup'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setError('');
              }}
              className={cn(
                'flex-1 py-2 rounded-xl text-sm font-semibold transition-colors',
                mode === m ? 'bg-amber-400 text-emerald-950' : 'bg-emerald-900/40 text-emerald-300'
              )}
            >
              {m === 'login' ? 'Entrar' : 'Registar'}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
            className="w-full px-4 py-3 bg-emerald-950/60 border border-emerald-800/50 rounded-2xl text-emerald-50 placeholder:text-emerald-500 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm"
          />

          {mode === 'signup' && (
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nome de utilizador"
              autoComplete="username"
              maxLength={30}
              className="w-full px-4 py-3 bg-emerald-950/60 border border-emerald-800/50 rounded-2xl text-emerald-50 placeholder:text-emerald-500 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm"
            />
          )}

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className="w-full px-4 py-3 bg-emerald-950/60 border border-emerald-800/50 rounded-2xl text-emerald-50 placeholder:text-emerald-500 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm"
          />

          {mode === 'signup' && (
            <div className="flex gap-3">
              <label className="flex-1 flex flex-col gap-1">
                <span className="px-1 text-xs font-medium text-emerald-400">País</span>
                <div className="relative">
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full appearance-none px-4 py-3 pr-10 bg-emerald-950/60 border border-emerald-800/50 rounded-2xl text-emerald-50 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code} className="text-emerald-950 bg-white">
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400 text-xs">▾</span>
                </div>
              </label>
              <label className="flex-1 flex flex-col gap-1">
                <span className="px-1 text-xs font-medium text-emerald-400">Língua</span>
                <div className="relative">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full appearance-none px-4 py-3 pr-10 bg-emerald-950/60 border border-emerald-800/50 rounded-2xl text-emerald-50 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code} className="text-emerald-950 bg-white">
                        {l.name}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400 text-xs">▾</span>
                </div>
              </label>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-300 bg-red-900/30 border border-red-900/50 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <button
            onClick={submit}
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-amber-400 text-emerald-950 font-bold uppercase tracking-wide disabled:opacity-50 active:scale-[0.98] transition-transform"
          >
            {loading ? 'Aguarda…' : mode === 'login' ? 'Entrar' : 'Registar'}
          </button>
        </div>
      </div>
    </div>
  );
}
