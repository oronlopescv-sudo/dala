'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import { Mic, MicOff, Users, ArrowLeft, Send, Smile, Radio } from 'lucide-react';
import { cn } from '@/lib/cn';
import { REACTION_EMOJIS } from '@/lib/constants';
import { registerServiceWorker, requestNotificationPermission, notifySpeaker } from '@/lib/pwa';
import type { Identity } from '@/lib/identity';
import type { ChannelDTO } from '@/components/ChannelList';
import Avatar from '@/components/Avatar';

interface Member {
  socketId: string;
  userId: string | null;
  userName: string;
  photoUrl: string | null;
}

interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string | null; username: string; photoUrl: string | null };
}

interface FloatingReaction {
  id: string;
  emoji: string;
  userName: string;
}

type Tab = 'voice' | 'chat';

export default function ChannelRoom({
  channel,
  identity,
  onLeave,
}: {
  channel: ChannelDTO;
  identity: Identity;
  onLeave: () => void;
}) {
  const [tab, setTab] = useState<Tab>('voice');
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [currentSpeakers, setCurrentSpeakers] = useState<Map<string, string>>(new Map()); // userId -> userName
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [handsFree, setHandsFree] = useState(false);
  const [draft, setDraft] = useState('');
  const [showMembers, setShowMembers] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const isSpeakingRef = useRef(false);
  const handsFreeRef = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Carrega histórico de chat
  useEffect(() => {
    fetch(`/api/channels/${channel.id}/messages`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: ChatMessage[]) => setMessages(data))
      .catch(() => {});
  }, [channel.id]);

  const startRecording = useCallback(() => {
    if (!streamRef.current || !socketRef.current) return;
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(streamRef.current, { mimeType: 'audio/webm;codecs=opus' });
    } catch {
      recorder = new MediaRecorder(streamRef.current);
    }
    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = async (e) => {
      if (e.data.size > 0 && socketRef.current) {
        socketRef.current.emit('audio_data', await e.data.arrayBuffer());
      }
    };
    recorder.start(200);
  }, []);

  const playAudioBuffer = useCallback((audioBuffer: AudioBuffer) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    const now = ctx.currentTime;
    if (nextStartTimeRef.current < now) nextStartTimeRef.current = now;
    source.start(nextStartTimeRef.current);
    nextStartTimeRef.current += audioBuffer.duration;
  }, []);

  // Liga ao socket ao entrar na sala
  useEffect(() => {
    let cancelled = false;

    const connect = async () => {
      // PWA: service worker + permissão de notificações (para background)
      registerServiceWorker();
      requestNotificationPermission();

      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioContextRef.current = new AudioContextClass();
        if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
      }
      try {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        // Sem microfone ainda pode usar o chat de texto
      }
      if (cancelled) return;

      const socket = io();
      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('join_channel', {
          channelName: channel.name,
          userName: identity.username,
          userId: identity.id,
          photoUrl: identity.photoUrl,
        });
      });

      socket.on('channel_members', (list: Member[]) => setMembers(list));
      socket.on('user_joined', (m: Member) =>
        setMembers((prev) => (prev.find((x) => x.socketId === m.socketId) ? prev : [...prev, m]))
      );
      socket.on('user_left', ({ socketId }: { socketId: string }) =>
        setMembers((prev) => prev.filter((x) => x.socketId !== socketId))
      );

      socket.on('speaker_started', (s: { userId: string; userName: string }) => {
        setCurrentSpeakers((prev) => new Map(prev).set(s.userId, s.userName));
        // Notifica em background se não sou eu a falar
        if (s.userName !== identity.username) {
          notifySpeaker(s.userName, channel.name);
        }
      });
      socket.on('speaker_ended', ({ userId }: { userId: string }) =>
        setCurrentSpeakers((prev) => {
          const next = new Map(prev);
          next.delete(userId);
          return next;
        })
      );
      socket.on('speak_granted', () => {
        isSpeakingRef.current = true;
        setIsSpeaking(true);
        startRecording();
      });
      socket.on('speak_denied', () => {
        setIsSpeaking(false);
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
      });

      socket.on('audio_data', async ({ audioChunk }: { audioChunk: ArrayBuffer }) => {
        if (!audioContextRef.current) return;
        try {
          const buf = await audioContextRef.current.decodeAudioData(audioChunk.slice(0));
          playAudioBuffer(buf);
        } catch {
          /* chunk não decodificável isolado — ignora */
        }
      });

      socket.on('new_message', (msg: ChatMessage) => setMessages((prev) => [...prev, msg]));

      socket.on('new_reaction', (r: FloatingReaction) => {
        setReactions((prev) => [...prev, r]);
        setTimeout(() => setReactions((prev) => prev.filter((x) => x.id !== r.id)), 2500);
      });
    };

    connect();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      mediaRecorderRef.current?.state !== 'inactive' && mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioContextRef.current?.close().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel.id]);

  // Auto-scroll do chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, tab]);

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handlePttStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (handsFreeRef.current) return; // Em mãos livres o botão grande não faz PTT
    if (navigator.vibrate) navigator.vibrate(50);
    if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume();
    socketRef.current?.emit('request_speak');
  };

  const handlePttEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (handsFreeRef.current) return;
    if (isSpeakingRef.current) {
      if (navigator.vibrate) navigator.vibrate(30);
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      stopRecording();
      socketRef.current?.emit('release_speak');
    }
  };

  // Viva voz / mãos livres: toggle que mantém o mic aberto
  const toggleHandsFree = () => {
    if (navigator.vibrate) navigator.vibrate(50);
    if (handsFreeRef.current) {
      // Desligar
      handsFreeRef.current = false;
      setHandsFree(false);
      if (isSpeakingRef.current) {
        isSpeakingRef.current = false;
        setIsSpeaking(false);
        stopRecording();
        socketRef.current?.emit('release_speak');
      }
    } else {
      // Ligar
      handsFreeRef.current = true;
      setHandsFree(true);
      if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume();
      socketRef.current?.emit('request_speak');
    }
  };

  const sendMessage = () => {
    const content = draft.trim();
    if (!content) return;
    socketRef.current?.emit('send_message', { content });
    setDraft('');
  };

  const sendReaction = (emoji: string) => {
    socketRef.current?.emit('send_reaction', { emoji });
    setEmojiOpen(false);
  };

  const otherSpeakers = Array.from(currentSpeakers.entries())
    .filter(([, name]) => name !== identity.username)
    .map(([, name]) => name);
  const isSomeoneElseSpeaking = otherSpeakers.length > 0;
  const speakersLabel =
    otherSpeakers.length === 1
      ? `${otherSpeakers[0]} a falar…`
      : `${otherSpeakers.length} pessoas a falar…`;
  const memberCount = members.length || 1;

  useEffect(() => {
    const stop = (e: Event) => e.preventDefault();
    document.addEventListener('contextmenu', stop);
    return () => document.removeEventListener('contextmenu', stop);
  }, []);

  return (
    <div className="flex flex-col h-full w-full max-w-md mx-auto relative overflow-hidden">
      {/* Cabeçalho */}
      <header className="flex items-center gap-3 px-4 py-3 bg-emerald-900/30 backdrop-blur-md border-b border-emerald-800/50">
        <button onClick={onLeave} aria-label="Voltar" className="p-1">
          <ArrowLeft className="w-6 h-6 text-emerald-200" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-emerald-50 truncate">{channel.name}</h2>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-lime-500 shadow-[0_0_8px_rgba(132,204,22,0.8)]" />
            <span className="text-xs text-emerald-300">
              {isSomeoneElseSpeaking ? speakersLabel : 'Canal livre'}
            </span>
          </div>
        </div>
        <button
          onClick={() => setShowMembers(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-900/50 border border-emerald-800/50 text-emerald-300"
        >
          <Users className="w-4 h-4" />
          <span className="text-sm font-medium">{memberCount}</span>
        </button>
      </header>

      {/* Abas */}
      <div className="flex px-4 gap-2 py-2 border-b border-emerald-800/40">
        {(['voice', 'chat'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 py-2 rounded-xl text-sm font-semibold transition-colors',
              tab === t ? 'bg-amber-400 text-emerald-950' : 'bg-emerald-900/40 text-emerald-300'
            )}
          >
            {t === 'voice' ? '🎤 Voz' : '💬 Chat'}
          </button>
        ))}
      </div>

      {/* Reações flutuantes */}
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
        {reactions.map((r, i) => (
          <div
            key={r.id}
            className="absolute bottom-24 text-3xl animate-bounce"
            style={{ left: `${10 + ((i * 23) % 80)}%`, animationDuration: '1.5s' }}
          >
            {r.emoji}
          </div>
        ))}
      </div>

      {tab === 'voice' ? (
        <main className="flex-1 flex flex-col items-center justify-center p-6 relative">
          <div
            className={cn(
              'px-6 py-3 rounded-full text-sm font-bold uppercase tracking-wide border backdrop-blur-md mb-8',
              isSpeaking
                ? 'bg-lime-500/20 text-lime-400 border-lime-500/50'
                : isSomeoneElseSpeaking
                  ? 'bg-amber-400/20 text-amber-400 border-amber-400/50'
                  : 'bg-emerald-900/40 text-emerald-400 border-emerald-800/50'
            )}
          >
            {isSpeaking
              ? 'Estás a falar…'
              : isSomeoneElseSpeaking
                ? speakersLabel
                : 'Canal livre'}
          </div>

          <div className="relative">
            {isSpeaking && (
              <>
                <div className="absolute inset-0 rounded-full animate-ping bg-lime-500/30" />
                <div className="absolute inset-[-20px] rounded-full animate-pulse bg-lime-500/20" />
              </>
            )}
            <button
              onTouchStart={handlePttStart}
              onTouchEnd={handlePttEnd}
              onMouseDown={handlePttStart}
              onMouseUp={handlePttEnd}
              onMouseLeave={handlePttEnd}
              className={cn(
                'relative z-10 flex items-center justify-center w-60 h-60 rounded-full shadow-2xl transition-all duration-100 select-none',
                isSpeaking
                  ? 'bg-lime-500 scale-95'
                  : 'bg-amber-400 active:scale-95 shadow-[0_20px_40px_rgba(0,0,0,0.3)]',
                handsFree && 'ring-4 ring-lime-400/60'
              )}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {isSpeaking ? (
                <Mic className="w-24 h-24 text-emerald-950" />
              ) : (
                <MicOff className="w-24 h-24 text-emerald-950" />
              )}
            </button>
          </div>

          <p className="mt-10 text-emerald-400/60 uppercase tracking-widest text-sm">
            {handsFree ? 'Viva voz ligado — mic aberto' : 'Segura para falar'}
          </p>

          {/* Botão viva voz (mãos livres) */}
          <button
            onClick={toggleHandsFree}
            className={cn(
              'mt-4 flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold uppercase tracking-wide border transition-colors',
              handsFree
                ? 'bg-lime-500 text-emerald-950 border-lime-400 shadow-[0_0_20px_rgba(132,204,22,0.5)]'
                : 'bg-emerald-900/50 text-emerald-300 border-emerald-800/50'
            )}
          >
            <Radio className="w-4 h-4" />
            {handsFree ? 'Desligar viva voz' : 'Viva voz'}
          </button>

          {/* Reações rápidas */}
          <div className="flex gap-2 mt-8">
            {REACTION_EMOJIS.slice(0, 5).map((e) => (
              <button
                key={e}
                onClick={() => sendReaction(e)}
                className="text-2xl w-11 h-11 flex items-center justify-center rounded-full bg-emerald-900/50 border border-emerald-800/50 active:scale-90 transition-transform"
              >
                {e}
              </button>
            ))}
          </div>
        </main>
      ) : (
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center flex-1 text-emerald-600 gap-2">
                <Radio className="w-8 h-8" />
                <p className="text-sm">Ainda sem mensagens. Diz olá! 👋</p>
              </div>
            )}
            {messages.map((m) => {
              const mine = m.user.username === identity.username;
              return (
                <div key={m.id} className={cn('flex gap-2 max-w-[85%]', mine ? 'self-end flex-row-reverse' : 'self-start')}>
                  <Avatar name={m.user.username} photoUrl={m.user.photoUrl} size={30} />
                  <div
                    className={cn(
                      'px-3 py-2 rounded-2xl',
                      mine ? 'bg-amber-400 text-emerald-950' : 'bg-emerald-900/60 text-emerald-50'
                    )}
                  >
                    {!mine && <p className="text-xs font-bold text-lime-400 mb-0.5">{m.user.username}</p>}
                    <p className="text-sm break-words">{m.content}</p>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Barra de escrever */}
          <div className="relative border-t border-emerald-800/40 p-3">
            {emojiOpen && (
              <div className="absolute bottom-16 left-3 flex gap-1 p-2 bg-emerald-950 border border-emerald-800 rounded-2xl shadow-xl">
                {REACTION_EMOJIS.map((e) => (
                  <button key={e} onClick={() => sendReaction(e)} className="text-2xl p-1 active:scale-90">
                    {e}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEmojiOpen((v) => !v)}
                className="p-2 text-amber-400"
                aria-label="Emojis"
              >
                <Smile className="w-6 h-6" />
              </button>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Escreve uma mensagem…"
                maxLength={1000}
                className="flex-1 px-4 py-2.5 bg-emerald-900/50 border border-emerald-800/50 rounded-full text-emerald-50 placeholder:text-emerald-500 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm"
              />
              <button
                onClick={sendMessage}
                disabled={!draft.trim()}
                className="flex items-center justify-center w-11 h-11 bg-amber-400 rounded-full disabled:opacity-40 active:scale-95"
                aria-label="Enviar"
              >
                <Send className="w-5 h-5 text-emerald-950" />
              </button>
            </div>
          </div>
        </main>
      )}

      {/* Painel de membros */}
      {showMembers && (
        <div className="absolute inset-0 z-20 flex justify-end bg-black/50" onClick={() => setShowMembers(false)}>
          <div
            className="w-3/4 max-w-xs h-full bg-emerald-950 border-l border-emerald-800 p-5 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 mb-4">
              Membros ({memberCount})
            </h3>
            <div className="flex flex-col gap-3">
              {members.map((m) => {
                const speaking = Array.from(currentSpeakers.values()).includes(m.userName);
                return (
                  <div key={m.socketId} className="flex items-center gap-3">
                    <Avatar
                      name={m.userName}
                      photoUrl={m.photoUrl}
                      size={38}
                      speaking={speaking}
                    />
                    <div>
                      <p className="text-sm font-semibold text-emerald-50">
                        {m.userName}
                        {m.userName === identity.username && ' (tu)'}
                      </p>
                      {speaking && (
                        <p className="text-xs text-lime-400">a falar…</p>
                      )}
                    </div>
                  </div>
                );
              })}
              {members.length === 0 && (
                <div className="flex items-center gap-3">
                  <Avatar name={identity.username} photoUrl={identity.photoUrl} size={38} />
                  <p className="text-sm font-semibold text-emerald-50">{identity.username} (tu)</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
