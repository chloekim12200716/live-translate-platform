import React, { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

interface InterpretationAudioPlayerProps {
  channelSlug: string;
  languageCode: string;
  isOverlay?: boolean;
}

function base64ToArrayBuffer(base64Audio: string) {
  const binary = window.atob(base64Audio);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return buffer;
}

function pcm16ToAudioBuffer(audioContext: AudioContext, pcmBuffer: ArrayBuffer, sampleRate: number) {
  const view = new DataView(pcmBuffer);
  const sampleCount = Math.floor(pcmBuffer.byteLength / 2);
  const audioBuffer = audioContext.createBuffer(1, sampleCount, sampleRate);
  const output = audioBuffer.getChannelData(0);

  for (let index = 0; index < sampleCount; index += 1) {
    output[index] = view.getInt16(index * 2, true) / 0x8000;
  }

  return audioBuffer;
}

function getAudioSampleRate(mimeType: string | undefined, fallbackSampleRate: number | undefined) {
  const matchedRate = mimeType?.match(/rate=(\d+)/i)?.[1];
  return matchedRate ? Number(matchedRate) : fallbackSampleRate ?? 24000;
}

function createInterpretationAudioWebSocketUrl(channelSlug: string, languageCode: string) {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const params = new URLSearchParams({
    channelSlug,
    targetLang: languageCode.toLowerCase()
  });

  return `${protocol}//${window.location.host}/api/audio/interpretation?${params.toString()}`;
}

export default function InterpretationAudioPlayer({
  channelSlug,
  languageCode,
  isOverlay = false
}: InterpretationAudioPlayerProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [statusMessage, setStatusMessage] = useState("통역 음성 대기");
  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextPlaybackTimeRef = useRef(0);

  const cleanup = () => {
    socketRef.current?.close();
    socketRef.current = null;
    const audioContext = audioContextRef.current;
    if (audioContext && audioContext.state !== "closed") {
      void audioContext.close().catch(() => undefined);
    }
    audioContextRef.current = null;
    nextPlaybackTimeRef.current = 0;
    setIsConnected(false);
  };

  useEffect(() => cleanup, []);

  const playAudioChunk = async (base64Audio: string, sampleRate: number) => {
    const audioContext = audioContextRef.current ?? new AudioContext({ sampleRate });
    audioContextRef.current = audioContext;

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    const audioBuffer = pcm16ToAudioBuffer(audioContext, base64ToArrayBuffer(base64Audio), sampleRate);
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);

    const startAt = Math.max(audioContext.currentTime + 0.03, nextPlaybackTimeRef.current);
    source.start(startAt);
    nextPlaybackTimeRef.current = startAt + audioBuffer.duration;
  };

  const connect = async () => {
    if (socketRef.current) {
      cleanup();
      setStatusMessage("통역 음성 중지됨");
      return;
    }

    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;
    await audioContext.resume();

    const socket = new WebSocket(createInterpretationAudioWebSocketUrl(channelSlug, languageCode));
    socketRef.current = socket;
    socket.onopen = () => {
      setIsConnected(true);
      setStatusMessage("통역 음성 연결 중");
    };
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data as string) as {
        type?: string;
        audio?: string;
        mimeType?: string;
        sampleRate?: number;
      };

      if (data.type === "ready") {
        setStatusMessage("통역 음성 대기 중");
        return;
      }

      if (data.type === "translation-audio" && data.audio) {
        setStatusMessage("통역 음성 재생 중");
        void playAudioChunk(data.audio, getAudioSampleRate(data.mimeType, data.sampleRate));
      }
    };
    socket.onerror = () => {
      setStatusMessage("통역 음성 연결 오류");
    };
    socket.onclose = () => {
      socketRef.current = null;
      setIsConnected(false);
    };
  };

  return (
    <div className={`fixed right-3 top-3 z-[95] ${isOverlay ? "text-white" : "text-slate-900"}`}>
      <button
        type="button"
        onClick={() => void connect()}
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-black shadow-lg backdrop-blur ${
          isOverlay
            ? "border-white/20 bg-slate-950/70 text-white hover:bg-slate-900/80"
            : "border-slate-200 bg-white/95 text-slate-900 hover:bg-slate-50"
        }`}
      >
        {isConnected ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        {isConnected ? "통역 음성 중지" : `${languageCode.toUpperCase()} 통역 음성 시작`}
      </button>
      <p className={`mt-1 text-right text-[10px] font-bold ${isOverlay ? "text-white/70" : "text-slate-500"}`}>
        {statusMessage}
      </p>
    </div>
  );
}
