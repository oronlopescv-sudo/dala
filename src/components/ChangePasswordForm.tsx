'use client';

import { useState } from 'react';
import { getToken } from '@/lib/identity';

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: 'Todos os campos são obrigatórios' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'As passwords novas não correspondem' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'A nova password deve ter pelo menos 6 caracteres' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Password alterada com sucesso!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Erro ao alterar password' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
      <div>
        <label className="block text-sm font-bold text-emerald-50 mb-2">
          Password atual
        </label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-emerald-900/40 border border-emerald-800/50 text-emerald-50 placeholder:text-emerald-500 focus:outline-none"
          placeholder="••••••••"
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-emerald-50 mb-2">
          Nova password
        </label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-emerald-900/40 border border-emerald-800/50 text-emerald-50 placeholder:text-emerald-500 focus:outline-none"
          placeholder="••••••••"
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-emerald-50 mb-2">
          Confirmar nova password
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-emerald-900/40 border border-emerald-800/50 text-emerald-50 placeholder:text-emerald-500 focus:outline-none"
          placeholder="••••••••"
          disabled={loading}
        />
      </div>

      {message && (
        <div
          className={`px-4 py-3 rounded-lg text-sm font-bold ${
            message.type === 'success'
              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-200'
              : 'bg-red-500/20 border border-red-500/40 text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-2.5 rounded-lg bg-amber-400 text-emerald-950 font-bold text-sm uppercase disabled:opacity-50 active:scale-95"
      >
        {loading ? 'A alterar...' : 'Alterar password'}
      </button>
    </form>
  );
}
