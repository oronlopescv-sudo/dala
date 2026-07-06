'use client';

import { useEffect, useState, useCallback } from 'react';
import { Shield, Loader2, Ban, Undo2, Flag, Check } from 'lucide-react';
import { getToken, getIdentity } from '@/lib/identity';
import { cn } from '@/lib/cn';

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: 'USER' | 'ADMIN';
  banned: boolean;
  bannedAt: string | null;
  country: string | null;
  createdAt: string;
}

interface AdminReport {
  id: string;
  reporterName: string;
  reportedId: string;
  reportedName: string;
  reason: string;
  createdAt: string;
}

interface AdminChannel {
  id: number;
  name: string;
  description: string | null;
  type: 'PUBLIC' | 'PRIVATE' | 'THEME';
}

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [channels, setChannels] = useState<AdminChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [newChannelType, setNewChannelType] = useState<'PUBLIC' | 'THEME'>('THEME');

  const token = typeof window !== 'undefined' ? getToken() : null;

  const load = useCallback(async () => {
    if (!token) {
      setDenied(true);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 403 || res.status === 401) {
        setDenied(true);
        return;
      }
      const data = await res.json();
      setUsers(data.users ?? []);
      setReports(data.reports ?? []);
      // Canais (route pública)
      const chRes = await fetch('/api/channels');
      if (chRes.ok) setChannels(await chRes.json());
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const banToggle = async (u: AdminUser) => {
    if (!token) return;
    const action = u.banned ? 'unban' : 'ban';
    if (action === 'ban' && !confirm(`Banir ${u.username} PARA SEMPRE?`)) return;
    setBusy(u.id);
    try {
      const res = await fetch('/api/admin/ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: u.id, action }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((x) => (x.id === u.id ? { ...x, banned: action === 'ban' } : x))
        );
      } else {
        const data = await res.json();
        alert(data.error || 'Erro');
      }
    } finally {
      setBusy(null);
    }
  };

  const resolveReport = async (r: AdminReport) => {
    if (!token) return;
    setBusy(r.id);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ resolveReportId: r.id }),
      });
      if (res.ok) setReports((prev) => prev.filter((x) => x.id !== r.id));
    } finally {
      setBusy(null);
    }
  };

  const banFromReport = async (r: AdminReport) => {
    if (!token) return;
    if (!confirm(`Banir ${r.reportedName} PARA SEMPRE?`)) return;
    setBusy(r.id);
    try {
      const res = await fetch('/api/admin/ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: r.reportedId, action: 'ban' }),
      });
      if (res.ok) {
        await resolveReport(r);
        load();
      }
    } finally {
      setBusy(null);
    }
  };

  const createChannel = async () => {
    if (!newChannelName.trim()) return;
    setBusy('new-channel');
    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newChannelName.trim(),
          description: newChannelDesc.trim() || null,
          type: newChannelType,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setChannels((prev) => [...prev, data]);
        setNewChannelName('');
        setNewChannelDesc('');
      } else {
        alert(data.error || 'Erro ao criar canal');
      }
    } finally {
      setBusy(null);
    }
  };

  const editChannel = async (c: AdminChannel) => {
    if (!token) return;
    const name = prompt('Novo nome do canal:', c.name);
    if (name === null) return;
    const description = prompt('Nova descrição:', c.description ?? '');
    if (description === null) return;
    setBusy(String(c.id));
    try {
      const res = await fetch('/api/admin/channels', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ channelId: c.id, name, description }),
      });
      const data = await res.json();
      if (res.ok) {
        setChannels((prev) => prev.map((x) => (x.id === c.id ? data.channel : x)));
      } else {
        alert(data.error || 'Erro ao editar');
      }
    } finally {
      setBusy(null);
    }
  };

  const deleteChannel = async (c: AdminChannel) => {
    if (!token) return;
    if (!confirm(`Apagar o canal "${c.name}" e todas as mensagens? Não dá para desfazer.`)) return;
    setBusy(String(c.id));
    try {
      const res = await fetch('/api/admin/channels', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ channelId: c.id }),
      });
      if (res.ok) {
        setChannels((prev) => prev.filter((x) => x.id !== c.id));
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao apagar');
      }
    } finally {
      setBusy(null);
    }
  };

  const identity = typeof window !== 'undefined' ? getIdentity() : null;
  const filtered = users.filter(
    (u) =>
      !query ||
      u.username.toLowerCase().includes(query.toLowerCase()) ||
      u.email.toLowerCase().includes(query.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
      </div>
    );
  }

  if (denied) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
        <Shield className="w-12 h-12 text-red-400" />
        <h1 className="text-xl font-bold text-emerald-50">Acesso negado</h1>
        <p className="text-sm text-emerald-400">
          Só admins podem entrar aqui. Faz login com a conta admin na página inicial.
        </p>
        <a href="/" className="mt-2 px-5 py-2.5 rounded-xl bg-amber-400 text-emerald-950 font-semibold text-sm">
          Voltar
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full max-w-md mx-auto overflow-y-auto">
      <header className="flex items-center gap-2 px-5 py-4 border-b border-emerald-800/50 sticky top-0 bg-emerald-950 z-10">
        <Shield className="w-6 h-6 text-amber-400" />
        <div className="flex-1">
          <h1 className="text-lg font-bold text-emerald-50">Painel Admin</h1>
          <p className="text-xs text-emerald-400">{identity?.username}</p>
        </div>
        <a href="/" className="text-xs text-emerald-300 underline">
          ← app
        </a>
      </header>

      {/* Denúncias */}
      {reports.length > 0 && (
        <section className="px-5 py-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-red-400 mb-2 flex items-center gap-1.5">
            <Flag className="w-3.5 h-3.5" /> Denúncias ({reports.length})
          </h2>
          <div className="flex flex-col gap-2">
            {reports.map((r) => (
              <div
                key={r.id}
                className="p-3 bg-red-900/20 border border-red-900/40 rounded-2xl"
              >
                <p className="text-sm text-emerald-50">
                  <b>{r.reporterName}</b> denunciou <b>{r.reportedName}</b>
                </p>
                <p className="text-xs text-emerald-300 mt-1">&ldquo;{r.reason}&rdquo;</p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => banFromReport(r)}
                    disabled={busy === r.id}
                    className="flex-1 py-2 rounded-xl bg-red-600 text-white text-xs font-bold disabled:opacity-50"
                  >
                    <Ban className="w-3.5 h-3.5 inline mr-1" />
                    Banir
                  </button>
                  <button
                    onClick={() => resolveReport(r)}
                    disabled={busy === r.id}
                    className="flex-1 py-2 rounded-xl bg-emerald-900/60 text-emerald-200 text-xs font-bold border border-emerald-800 disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5 inline mr-1" />
                    Ignorar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Salas */}
      <section className="px-5 py-4 border-b border-emerald-800/40">
        <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">
          📡 Salas ({channels.length})
        </h2>

        {/* Criar nova sala */}
        <div className="flex flex-col gap-2 mb-4 p-3 bg-emerald-900/30 border border-emerald-800/50 rounded-2xl">
          <input
            value={newChannelName}
            onChange={(e) => setNewChannelName(e.target.value)}
            placeholder="Nome da nova sala"
            maxLength={40}
            className="w-full px-3 py-2.5 bg-emerald-950/60 border border-emerald-800/50 rounded-xl text-emerald-50 placeholder:text-emerald-500 focus:outline-none text-sm"
          />
          <input
            value={newChannelDesc}
            onChange={(e) => setNewChannelDesc(e.target.value)}
            placeholder="Descrição (opcional)"
            maxLength={100}
            className="w-full px-3 py-2.5 bg-emerald-950/60 border border-emerald-800/50 rounded-xl text-emerald-50 placeholder:text-emerald-500 focus:outline-none text-sm"
          />
          <div className="flex gap-2">
            <select
              value={newChannelType}
              onChange={(e) => setNewChannelType(e.target.value as 'PUBLIC' | 'THEME')}
              className="flex-1 px-3 py-2.5 bg-emerald-950/60 border border-emerald-800/50 rounded-xl text-emerald-50 text-sm focus:outline-none"
            >
              <option value="THEME">Tema</option>
              <option value="PUBLIC">Pública</option>
            </select>
            <button
              onClick={createChannel}
              disabled={busy === 'new-channel' || !newChannelName.trim()}
              className="px-5 py-2.5 rounded-xl bg-amber-400 text-emerald-950 font-bold text-sm disabled:opacity-40"
            >
              Criar
            </button>
          </div>
        </div>

        {/* Lista de salas */}
        <div className="flex flex-col gap-2">
          {channels.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-2 p-3 bg-emerald-900/40 border border-emerald-800/50 rounded-2xl"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-emerald-50 truncate">
                  {c.name}
                  <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-emerald-800 text-emerald-300 uppercase">
                    {c.type === 'THEME' ? 'tema' : c.type === 'PRIVATE' ? 'privada' : 'pública'}
                  </span>
                </p>
                {c.description && (
                  <p className="text-xs text-emerald-400 truncate">{c.description}</p>
                )}
              </div>
              <button
                onClick={() => editChannel(c)}
                disabled={busy === String(c.id)}
                className="px-3 py-2 rounded-xl bg-emerald-900/60 border border-emerald-800 text-emerald-200 text-xs font-bold disabled:opacity-50"
              >
                ✏️
              </button>
              <button
                onClick={() => deleteChannel(c)}
                disabled={busy === String(c.id)}
                className="px-3 py-2 rounded-xl bg-red-600 text-white text-xs font-bold disabled:opacity-50"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Utilizadores */}
      <section className="px-5 py-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">
          Utilizadores ({users.length})
        </h2>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar por nome ou email…"
          className="w-full mb-3 px-4 py-2.5 bg-emerald-900/40 border border-emerald-800/50 rounded-2xl text-emerald-50 placeholder:text-emerald-500 focus:outline-none text-sm"
        />
        <div className="flex flex-col gap-2 pb-10">
          {filtered.map((u) => (
            <div
              key={u.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-2xl border',
                u.banned
                  ? 'bg-red-900/15 border-red-900/40'
                  : 'bg-emerald-900/40 border-emerald-800/50'
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-emerald-50 truncate">
                  {u.username}
                  {u.role === 'ADMIN' && (
                    <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-400 text-emerald-950 font-bold uppercase">
                      admin
                    </span>
                  )}
                  {u.banned && (
                    <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-red-600 text-white font-bold uppercase">
                      banido
                    </span>
                  )}
                </p>
                <p className="text-xs text-emerald-400 truncate">{u.email}</p>
              </div>
              {u.role !== 'ADMIN' && (
                <button
                  onClick={() => banToggle(u)}
                  disabled={busy === u.id}
                  className={cn(
                    'px-3 py-2 rounded-xl text-xs font-bold disabled:opacity-50',
                    u.banned
                      ? 'bg-emerald-900/60 text-emerald-200 border border-emerald-800'
                      : 'bg-red-600 text-white'
                  )}
                >
                  {u.banned ? (
                    <>
                      <Undo2 className="w-3.5 h-3.5 inline mr-1" />
                      Desbanir
                    </>
                  ) : (
                    <>
                      <Ban className="w-3.5 h-3.5 inline mr-1" />
                      Banir
                    </>
                  )}
                </button>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-emerald-500 py-6 text-center">Nenhum utilizador.</p>
          )}
        </div>
      </section>
    </div>
  );
}
