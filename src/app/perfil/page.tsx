'use client';

import { useState, useEffect } from 'react';
import { getIdentity, getToken } from '@/lib/identity';
import ChangePasswordForm from '@/components/ChangePasswordForm';
import type { Identity } from '@/lib/identity';

export default function PerfilPage() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = getIdentity();
    setIdentity(id);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-emerald-950">
        <p className="text-emerald-400">A carregar perfil...</p>
      </div>
    );
  }

  if (!identity) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-emerald-950">
        <p className="text-red-400">Não autenticado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-emerald-950 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-emerald-50 mb-8">Perfil</h1>

        {/* Informacoes do utilizador */}
        <div className="bg-emerald-900/40 border border-emerald-800/50 rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-bold text-emerald-50 mb-4">Informações</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-emerald-400 mb-1">Nome de utilizador</label>
              <p className="text-emerald-50">{identity.username}</p>
            </div>

            <div>
              <label className="block text-sm text-emerald-400 mb-1">Email</label>
              <p className="text-emerald-50">{identity.email}</p>
            </div>

            <div>
              <label className="block text-sm text-emerald-400 mb-1">Papel</label>
              <p className="text-emerald-50">
                {identity.role === 'ADMIN' ? '👑 Admin' : 'Utilizador'}
              </p>
            </div>
          </div>
        </div>

        {/* Mudar password */}
        <div className="bg-emerald-900/40 border border-emerald-800/50 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-emerald-50 mb-6">Alterar password</h2>
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
