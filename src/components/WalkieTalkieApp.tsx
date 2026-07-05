"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import { Mic, MicOff, Users, Radio } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for Tailwind
function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface User {
  id: string;
  userName: string;
}

export default function WalkieTalkieApp({ channelName = 'Geral' }: { channelName?: string }) {
  const [userName, setUserName] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  
  const [users, setUsers] = useState<User[]>([]);
  const [currentSpeaker, setCurrentSpeaker] = useState<{ userId: string; userName: string } | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Audio queue for smooth playback
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const nextStartTimeRef = useRef(0);

  // Initialize socket and Web Audio on Join
  const handleJoin = async () => {
    if (!userName.trim()) return;

    // 1. Initialize Audio Context on first user interaction to unlock iOS audio
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioContextRef.current = new AudioContextClass();
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
    }

    // 2. Request Microphone Permission
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
    } catch (err) {
      setError("Permissão de microfone negada. O aplicativo não pode funcionar.");
      return;
    }

    // 3. Connect to Socket.io
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join_channel', { channelName, userName });
      setIsJoined(true);
    });

    newSocket.on('user_joined', (user: User) => {
      setUsers(prev => {
        if (!prev.find(u => u.id === user.id)) {
          return [...prev, user];
        }
        return prev;
      });
    });

    newSocket.on('user_left', ({ id }) => {
      setUsers(prev => prev.filter(u => u.id !== id));
    });

    newSocket.on('speaker_started', ({ userId, userName }) => {
      setCurrentSpeaker({ userId, userName });
    });

    newSocket.on('speaker_ended', ({ userId }) => {
      setCurrentSpeaker(prev => prev?.userId === userId ? null : prev);
    });

    newSocket.on('speak_granted', () => {
      setIsSpeaking(true);
      startRecording();
    });

    newSocket.on('speak_denied', () => {
      setIsSpeaking(false);
      // Vibrate twice to indicate denial
      if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
    });

    newSocket.on('audio_data', async ({ userId, audioChunk }) => {
      if (!audioContextRef.current) return;
      
      try {
        const audioBuffer = await audioContextRef.current.decodeAudioData(audioChunk);
        playAudioBuffer(audioBuffer);
      } catch (e) {
        console.error("Error decoding audio chunk", e);
      }
    });

    return () => {
      newSocket.disconnect();
    };
  };

  const playAudioBuffer = (audioBuffer: AudioBuffer) => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    
    // Simple scheduling
    const currentTime = ctx.currentTime;
    if (nextStartTimeRef.current < currentTime) {
        nextStartTimeRef.current = currentTime;
    }
    
    source.start(nextStartTimeRef.current);
    nextStartTimeRef.current += audioBuffer.duration;
  };

  const startRecording = () => {
    if (!streamRef.current || !socket) return;
    
    const options = { mimeType: 'audio/webm;codecs=opus' };
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(streamRef.current, options);
    } catch (e) {
      // Fallback for browsers that don't support webm/opus (like iOS Safari)
      recorder = new MediaRecorder(streamRef.current);
    }
    
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = async (e) => {
      if (e.data.size > 0 && socket) {
        const arrayBuffer = await e.data.arrayBuffer();
        socket.emit('audio_data', arrayBuffer);
      }
    };

    // Emit chunk every 200ms to reduce latency
    recorder.start(200);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault(); // Prevent 300ms delay and default zoom
    if (navigator.vibrate) navigator.vibrate(50);
    
    // Wake up AudioContext if it was suspended (e.g., incoming call)
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    if (socket) {
      socket.emit('request_speak');
    }
  };

  const handleTouchEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (isSpeaking) {
      if (navigator.vibrate) navigator.vibrate(30);
      setIsSpeaking(false);
      stopRecording();
      if (socket) {
        socket.emit('release_speak');
      }
    }
  };

  // Prevent context menu on long press
  useEffect(() => {
    const handleContextMenu = (e: Event) => {
      e.preventDefault();
    };
    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  if (!isJoined) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 w-full p-6">
        <div className="w-full max-w-sm p-8 bg-emerald-900/40 backdrop-blur-md rounded-3xl border border-emerald-800/50 shadow-2xl flex flex-col gap-6">
          <div className="flex items-center justify-center w-20 h-20 mx-auto bg-amber-400 rounded-full shadow-lg">
            <Radio className="w-10 h-10 text-emerald-950" />
          </div>
          <h1 className="text-3xl font-bold text-center text-emerald-50">Da Fala</h1>
          <p className="text-center text-emerald-300/80">Comunicação PTT Direta</p>
          
          <input
            type="text"
            placeholder="Seu Nome"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="w-full px-4 py-4 mt-4 text-lg font-medium text-emerald-950 bg-emerald-50 rounded-2xl focus:outline-none focus:ring-4 focus:ring-amber-400 placeholder:text-emerald-900/40"
          />
          {error && <p className="text-sm text-red-400 text-center">{error}</p>}
          <button
            onClick={handleJoin}
            disabled={!userName.trim()}
            className="w-full py-4 text-lg font-bold text-emerald-950 uppercase transition-colors bg-amber-400 rounded-2xl active:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(251,191,36,0.3)]"
          >
            Entrar
          </button>
        </div>
      </div>
    );
  }

  const isSomeoneElseSpeaking = currentSpeaker && currentSpeaker.userId !== socket?.id;

  return (
    <div className="flex flex-col h-full w-full max-w-md mx-auto relative overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5 bg-emerald-900/30 backdrop-blur-md border-b border-emerald-800/50">
        <div>
          <h2 className="text-xl font-bold text-emerald-50">Canal: {channelName}</h2>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2 h-2 rounded-full bg-lime-500 shadow-[0_0_8px_rgba(132,204,22,0.8)]"></div>
            <span className="text-sm font-medium text-emerald-200">Online</span>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-900/50 border border-emerald-800/50 text-emerald-300">
          <Users className="w-4 h-4" />
          <span className="font-medium text-sm">{users.length + 1}</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative">
        {/* Status Indicator */}
        <div className="absolute top-10 w-full px-6 flex justify-center">
          <div className={cn(
            "px-6 py-3 rounded-full text-sm font-bold tracking-wide uppercase transition-all duration-300 backdrop-blur-md border",
            isSpeaking 
              ? "bg-lime-500/20 text-lime-400 border-lime-500/50 shadow-[0_0_20px_rgba(132,204,22,0.2)]" 
              : isSomeoneElseSpeaking
                ? "bg-amber-400/20 text-amber-400 border-amber-400/50 shadow-[0_0_20px_rgba(251,191,36,0.2)]"
                : "bg-emerald-900/40 text-emerald-400 border-emerald-800/50"
          )}>
            {isSpeaking ? "Você está falando..." : isSomeoneElseSpeaking ? `${currentSpeaker.userName} falando...` : "Canal Livre"}
          </div>
        </div>

        {/* Giant PTT Button */}
        <div className="relative mt-8">
          {/* Ripple effects when speaking */}
          {isSpeaking && (
            <>
              <div className="absolute inset-0 rounded-full animate-ping bg-lime-500/30"></div>
              <div className="absolute inset-[-20px] rounded-full animate-pulse bg-lime-500/20" style={{ animationDuration: '1.5s' }}></div>
            </>
          )}

          <button
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleTouchStart}
            onMouseUp={handleTouchEnd}
            onMouseLeave={handleTouchEnd}
            className={cn(
              "relative z-10 flex items-center justify-center w-64 h-64 rounded-full shadow-2xl transition-all duration-100 outline-none select-none",
              isSpeaking 
                ? "bg-lime-500 scale-95 shadow-[inset_0_10px_20px_rgba(0,0,0,0.3)]" 
                : "bg-amber-400 scale-100 shadow-[0_20px_40px_rgba(0,0,0,0.3),inset_0_10px_20px_rgba(255,255,255,0.4)] active:scale-95",
              isSomeoneElseSpeaking && !isSpeaking && "opacity-50 cursor-not-allowed bg-emerald-800 shadow-none"
            )}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            {isSpeaking ? (
              <Mic className="w-24 h-24 text-emerald-950" />
            ) : (
              <MicOff className={cn(
                "w-24 h-24",
                isSomeoneElseSpeaking ? "text-emerald-950/40" : "text-emerald-950"
              )} />
            )}
          </button>
        </div>

        <p className="mt-12 text-center font-medium text-emerald-400/60 uppercase tracking-widest text-sm">
          {isSomeoneElseSpeaking ? "Aguarde sua vez" : "Segure para falar"}
        </p>
      </main>
    </div>
  );
}
