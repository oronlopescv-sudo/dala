import React from 'react';
import { cn } from '@/lib/cn';

interface AvatarProps {
  name: string;
  photoUrl?: string | null;
  size?: number;
  speaking?: boolean;
  className?: string;
}

const COLORS = [
  'bg-amber-400 text-emerald-950',
  'bg-lime-500 text-emerald-950',
  'bg-emerald-400 text-emerald-950',
  'bg-teal-400 text-emerald-950',
  'bg-yellow-300 text-emerald-950',
];

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

export default function Avatar({ name, photoUrl, size = 40, speaking, className }: AvatarProps) {
  const initials = (name || '?').trim().slice(0, 2).toUpperCase();
  return (
    <div
      className={cn(
        'relative flex items-center justify-center rounded-full font-bold overflow-hidden shrink-0 ring-2',
        speaking ? 'ring-lime-400 shadow-[0_0_12px_rgba(132,204,22,0.7)]' : 'ring-emerald-800/50',
        !photoUrl && colorFor(name),
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
