import React, { useEffect, useState } from 'react';
import WalkieTalkieApp from '@/components/WalkieTalkieApp';
import { Channel } from '@prisma/client';

export default function Home() {
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const res = await fetch('/api/channels');
        if (!res.ok) throw new Error('Failed to load channels');
        const data = await res.json();
        setChannels(data);
        if (data.length > 0) setSelectedChannel(data[0].name);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchChannels();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-screen">Carregando canais…</div>;
  if (error) return <div className="text-red-500 p-4">{error}</div>;

  return (
    <div className="flex flex-col items-center p-6">
      <h1 className="text-2xl font-bold mb-4 text-emerald-50">Selecione um Canal</h1>
      <ul className="flex flex-wrap gap-4 mb-6">
        {channels.map((ch) => (
          <li key={ch.id}>
            <button
              className={`px-4 py-2 rounded-lg transition ${selectedChannel === ch.name ? 'bg-amber-400 text-emerald-950' : 'bg-emerald-800 text-emerald-200'}`}
              onClick={() => setSelectedChannel(ch.name)}
            >
              {ch.name}
            </button>
          </li>
        ))}
      </ul>
      {selectedChannel && (
        <WalkieTalkieApp channelName={selectedChannel} />
      )}
    </div>
  );
}
