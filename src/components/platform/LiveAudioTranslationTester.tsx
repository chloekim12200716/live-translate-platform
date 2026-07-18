import React, { useRef, useState } from "react";
import { Radio, ScreenShare, Square } from "lucide-react";

interface LiveAudioTranslationTesterProps {
  sessionSlug: string;
  defaultSourceLanguageCode: string;
}

const sourceLanguageOptions = [
  { code: "en", label: "English" },
  { code: "ko", label: "Korean" },
  { code: "fr", label: "French" },
  { code: "es", label: "Spanish" },
  { code: "zh", label: "Chinese" },
  { code: "ar", label: "Arabic" },
  { code: "ru", label: "Russian" }
];

function float32ToPcm16Buffer(input: Float32Array) {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);

  for (let index = 0; index < input.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, input[index]));
    view.setInt16(index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }

  return buffer;
}

function createLiveAudioWebSocketUrl(sessionSlug: string, sourceLanguageCode: string) {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const params = new URLSearchParams({
    sessionSlug,
    sourceLang: sourceLanguageCode,
    mimeType: "audio/pcm;rate=16000"
  });

  return `${protocol}//${window.location.host}/api/audio/live?${params.toString()}`;
}

export default function LiveAudioTranslationTester({
  sessionSlug,
  defaultSourceLanguageCode
}: LiveAudioTranslationTesterProps) {
  const [sourceLanguageCode, setSourceLanguageCode] = useState(defaultSourceLanguageCode);
  const [isCapturing, setIsCapturing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [latestTranscript, setLatestTranscript] = useState("");
  const [publishedCount, setPublishedCount] = useState(0);
  const [sentFrames, setSentFrames] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const silenceGainRef = useRef<GainNode | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  const cleanupAudio = () => {
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    silenceGainRef.current?.disconnect();
    void audioContextRef.current?.close();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    processorRef.current = null;
    sourceRef.current = null;
    silenceGainRef.current = null;
    audioContextRef.current = null;
    streamRef.current = null;
  };

  const stopCapture = () => {
    socketRef.current?.send(JSON.stringify({ type: "end" }));
    socketRef.current?.close();
    socketRef.current = null;
    cleanupAudio();
    setIsCapturing(false);
    setStatusMessage("오디오 캡처 중지됨");
  };

  const startTabAudioCapture = async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setStatusMessage("이 브라우저는 탭/화면 오디오 캡처를 지원하지 않습니다.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        stream.getTracks().forEach((track) => track.stop());
        setStatusMessage("공유된 탭/화면에 오디오 트랙이 없습니다. Chrome에서 탭 공유와 Share tab audio를 켜세요.");
        return;
      }

      const socket = new WebSocket(createLiveAudioWebSocketUrl(sessionSlug, sourceLanguageCode));
      socket.binaryType = "arraybuffer";
      socket.onopen = () => {
        setStatusMessage("Live API WebSocket 연결 중");
      };
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data as string) as {
          type?: string;
          message?: string;
          transcript?: string;
          sequence?: number;
          code?: number;
          reason?: string;
          wasClean?: boolean;
        };

        if (data.type === "ready") {
          setStatusMessage("오디오 frame 전송 중");
        } else if (data.type === "caption" && data.transcript) {
          setLatestTranscript(data.transcript);
          setPublishedCount((currentCount) => currentCount + 1);
          setStatusMessage(`caption queue 전송됨 #${data.sequence ?? ""}`.trim());
        } else if (data.type === "error") {
          setStatusMessage(data.message || "Live API WebSocket 오류");
        } else if (data.type === "closed") {
          const closeDetail = [
            data.code ? `code ${data.code}` : "",
            data.reason ? data.reason : ""
          ].filter(Boolean).join(" · ");
          setStatusMessage(closeDetail ? `Live API 세션 종료됨: ${closeDetail}` : "Live API 세션 종료됨");
        }
      };
      socket.onerror = () => {
        setStatusMessage("Live API WebSocket 연결 오류");
      };
      socket.onclose = () => {
        cleanupAudio();
        setIsCapturing(false);
      };

      const audioStream = new MediaStream(audioTracks);
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const source = audioContext.createMediaStreamSource(audioStream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      const silenceGain = audioContext.createGain();
      silenceGain.gain.value = 0;

      processor.onaudioprocess = (event) => {
        if (socket.readyState !== WebSocket.OPEN) return;
        const input = event.inputBuffer.getChannelData(0);
        socket.send(float32ToPcm16Buffer(input));
        setSentFrames((currentFrames) => currentFrames + 1);
      };

      source.connect(processor);
      processor.connect(silenceGain);
      silenceGain.connect(audioContext.destination);
      stream.getTracks().forEach((track) => {
        track.onended = stopCapture;
      });

      streamRef.current = stream;
      audioContextRef.current = audioContext;
      sourceRef.current = source;
      processorRef.current = processor;
      silenceGainRef.current = silenceGain;
      socketRef.current = socket;
      setIsCapturing(true);
      setSentFrames(0);
      setLatestTranscript("");
      setStatusMessage("탭/시스템 오디오 캡처 준비 중");
    } catch (error) {
      cleanupAudio();
      socketRef.current?.close();
      socketRef.current = null;
      setIsCapturing(false);
      setStatusMessage(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-emerald-600" />
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">WebSocket Live Audio</p>
          </div>
          <h3 className="mt-1 text-lg font-bold text-slate-900">저지연 오디오 전사/번역 테스트</h3>
          <p className="mt-1 text-sm text-slate-500">
            사용자 화면의 영상 자체가 자동 번역을 시작하지는 않습니다. 이 버튼으로 YouTube 탭 또는 라이브 방송 탭의 오디오를 캡처해 Gemini Live API로 보냅니다.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
          published {publishedCount} / frames {sentFrames}
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[170px_minmax(0,1fr)_auto]">
        <label className="text-xs font-bold text-slate-700">
          입력 언어
          <select
            value={sourceLanguageCode}
            onChange={(event) => setSourceLanguageCode(event.target.value)}
            disabled={isCapturing}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-400 disabled:opacity-60"
          >
            {sourceLanguageOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Latest Live Transcript</p>
          <p className="mt-2 min-h-10 text-sm font-semibold leading-relaxed text-slate-900">
            {latestTranscript || "전사 결과 대기 중"}
          </p>
          {statusMessage && (
            <p className="mt-2 text-xs font-semibold text-slate-500">{statusMessage}</p>
          )}
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={isCapturing ? stopCapture : startTabAudioCapture}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-black text-white shadow-sm ${
              isCapturing ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {isCapturing ? <Square className="h-4 w-4" /> : <ScreenShare className="h-4 w-4" />}
            {isCapturing ? "캡처 중지" : "WebSocket 캡처 시작"}
          </button>
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        Chrome 공유 창에서 오디오가 재생 중인 탭을 선택하고 `Share tab audio`를 켜세요. `/live/...` 사용자 화면은 여기서 publish된 자막을 받는 표시용 화면입니다.
        이 경로는 HTTP chunk보다 지연이 낮지만,
        실제 응답 시간은 Gemini Live API 상태와 네트워크에 영향을 받습니다.
      </p>
    </div>
  );
}
