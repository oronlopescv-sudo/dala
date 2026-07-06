'use client';

import { useEffect, useState } from 'react';
import Auth from '@/components/Auth';
import ChannelList, { type ChannelDTO } from '@/components/ChannelList';
import ChannelRoom from '@/components/ChannelRoom';
import Profile from '@/components/Profile';
import { getIdentity, type Identity } from '@/lib/identity';

type View = 'list' | 'room' | 'profile';

export default function Home() {
  const [ready, setReady] = useState(false);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [view, setView] = useState<View>('list');
  const [channel, setChannel] = useState<ChannelDTO | null>(null);

  useEffect(() => {
    setIdentity(getIdentity());
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="flex items-center justify-center flex-1 text-emerald-400">Carregando…</div>
    );
  }

  if (!identity) {
    return <Auth onDone={(i) => setIdentity(i)} />;
  }

  if (view === 'profile') {
    return (
      <Profile
        identity={identity}
        onBack={() => setView('list')}
        onUpdate={setIdentity}
        onLogout={() => {
          setIdentity(null);
          setView('list');
        }}
      />
    );
  }

  if (view === 'room' && channel) {
    return (
      <ChannelRoom
        channel={channel}
        identity={identity}
        onLeave={() => {
          setChannel(null);
          setView('list');
        }}
      />
    );
  }

  return (
    <ChannelList
      identity={identity}
      onOpenChannel={(c) => {
        setChannel(c);
        setView('room');
      }}
      onOpenProfile={() => setView('profile')}
    />
  );
}
