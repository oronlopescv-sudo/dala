'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, X } from 'lucide-react';

import type { Playlist } from '@/types/playlist';

export default function PlaylistPlayer({
  playlist,
  onClose,
}: {
  playlist: Playlist;
  onClose: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);

  const currentMusic: Playlist['musics'][number] | undefined = playlist.musics[currentIndex];

  useEffect(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;
    if (isPlaying) {
      audio.play().catch((e) => console.error('Erro ao tocar:', e));
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    if (currentIndex < playlist.musics.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsPlaying(false);
    }
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const nextTrack = () => {
    if (currentIndex < playlist.musics.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsPlaying(true);
    }
  };

  const prevTrack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsPlaying(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Playlist ainda sem músicas: não há nada para tocar
  if (!currentMusic) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
        <div className="w-full bg-emerald-950 border-t border-emerald-800/50 p-6 rounded-t-3xl text-center">
          <p className="text-emerald-300 mb-4">Esta playlist ainda não tem músicas.</p>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-amber-400 text-emerald-950 font-bold text-sm uppercase"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
      <div className="w-full bg-emerald-950 border-t border-emerald-800/50 p-6 rounded-t-3xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <p className="text-xs text-emerald-400 mb-1">Playlist: {playlist.name}</p>
            <h3 className="text-lg font-bold text-emerald-50 truncate">{currentMusic.title}</h3>
            {currentMusic.artist && (
              <p className="text-sm text-emerald-300">{currentMusic.artist}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-emerald-400 hover:text-emerald-200"
            aria-label="Fechar"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progresso */}
        <div className="mb-4">
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={(e) => {
              if (audioRef.current) {
                audioRef.current.currentTime = parseFloat(e.target.value);
              }
            }}
            className="w-full h-2 bg-emerald-900/40 rounded-full cursor-pointer"
          />
          <div className="flex justify-between text-xs text-emerald-400 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controles */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <button
            onClick={prevTrack}
            disabled={currentIndex === 0}
            className="p-2 rounded-full text-emerald-400 disabled:opacity-40"
            aria-label="Anterior"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          <button
            onClick={togglePlay}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-400 text-emerald-950 font-bold active:scale-95"
            aria-label={isPlaying ? 'Pausar' : 'Tocar'}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 ml-0.5" />
            )}
          </button>

          <button
            onClick={nextTrack}
            disabled={currentIndex === playlist.musics.length - 1}
            className="p-2 rounded-full text-emerald-400 disabled:opacity-40"
            aria-label="Próxima"
          >
            <SkipForward className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <Volume2 className="w-4 h-4 text-emerald-400" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-20 h-2 bg-emerald-900/40 rounded-full cursor-pointer"
              aria-label="Volume"
            />
          </div>
        </div>

        {/* Lista de próximas */}
        <div className="text-xs text-emerald-400 mb-2">
          {currentIndex + 1} de {playlist.musics.length}
        </div>

        <audio
          ref={audioRef}
          src={currentMusic?.fileUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
        />
      </div>
    </div>
  );
}
