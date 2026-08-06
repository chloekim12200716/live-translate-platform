import React, { useRef, useState } from "react";
import { Radio, ScreenShare, Square } from "lucide-react";
import { appendAdminTokenToUrl } from "../../utils/adminAuth";

interface LiveAudioTranslationTesterProps {
  channelSlug: string;
  displayName?: string;
  targetLanguageCodes: string[];
}

function float32ToPcm16Buffer(input: Float32Array) {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);

  for (let index = 0; index < input.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, input[index]));
    view.setInt16(index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }

  return buffer;
}

function createLiveAudioWebSocketUrl(channelSlug: string, translationMode: "realtime" | "sentence", targetLanguageCodes: string[]) {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const params = new URLSearchParams({
    channelSlug,
    sourceLang: "auto",
    targetLangs: targetLanguageCodes.join(","),
    mode: translationMode,
    mimeType: "audio/pcm;rate=16000"
  });

  return appendAdminTokenToUrl(`${protocol}//${window.location.host}/api/audio/live?${params.toString()}`);
}

export default function LiveAudioTranslationTester({
  channelSlug,
  displayName = "선택된 플랫폼",
  targetLanguageCodes
}: LiveAudioTranslationTesterProps) {
  const [translationMode, setTranslationMode] = useState<"realtime" | "sentence">("sentence");
  const [isCapturing, setIsCapturing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [latestTranscript, setLatestTranscript] = useState("");
  const [publishedCount, setPublishedCount] = useState(0);
  const [sentFrames, setSentFrames] = useState(0);
  const [diagnosticEvents, setDiagnosticEvents] = useState<string[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const silenceGainRef = useRef<GainNode | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  const pushDiagnosticEvent = (message: string) => {
    const timestamp = new Date().toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    setDiagnosticEvents((currentEvents) => [`${timestamp} ${message}`, ...currentEvents].slice(0, 10));
  };

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
    pushDiagnosticEvent("capture stopped");
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
        pushDiagnosticEvent("no audio track in selected share source");
        return;
      }
      pushDiagnosticEvent(`audio track selected: ${audioTracks[0]?.label || "unknown"}`);

      const socket = new WebSocket(createLiveAudioWebSocketUrl(channelSlug, translationMode, targetLanguageCodes));
      socket.binaryType = "arraybuffer";
      socket.onopen = () => {
        setStatusMessage("Live API WebSocket 연결 중");
        pushDiagnosticEvent("browser websocket opened");
      };
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data as string) as {
          type?: string;
          message?: string;
          transcript?: string;
          sequence?: number;
          targetLang?: string;
          targetLangs?: string[];
          activeTargetLangs?: string[];
          delayMs?: number;
          bufferedFrames?: number;
          code?: number;
          reason?: string;
          wasClean?: boolean;
          audio?: string;
          mimeType?: string;
          sampleRate?: number;
        };

        if (data.type === "ready") {
          setStatusMessage("오디오 frame 전송 중");
          pushDiagnosticEvent(`server ready (${data.activeTargetLangs?.join(",") || data.targetLangs?.join(",") || "targets"}), sending audio frames`);
        } else if (data.type === "open") {
          pushDiagnosticEvent(`Gemini Live connection opened${data.targetLang ? ` [${data.targetLang}]` : ""}`);
        } else if (data.type === "connecting") {
          pushDiagnosticEvent(data.message || "connecting to Gemini Live");
        } else if (data.type === "reconnecting") {
          pushDiagnosticEvent(`reconnecting${data.targetLang ? ` [${data.targetLang}]` : ""} in ${Math.round(data.delayMs ?? 0)}ms (${data.bufferedFrames ?? 0} buffered)`);
        } else if (data.type === "debug") {
          pushDiagnosticEvent(data.message || "debug event");
        } else if (data.type === "caption" && data.transcript) {
          setLatestTranscript(data.transcript);
          setPublishedCount((currentCount) => currentCount + 1);
          setStatusMessage(`caption queue 전송됨 #${data.sequence ?? ""}`.trim());
          pushDiagnosticEvent(`caption queued ${data.targetLang ? `[${data.targetLang}] ` : ""}#${data.sequence ?? ""}`.trim());
        } else if (data.type === "error") {
          setStatusMessage(data.message || "Live API WebSocket 오류");
          pushDiagnosticEvent(`error: ${data.message || "Live API WebSocket 오류"}`);
        } else if (data.type === "closed") {
          const closeDetail = [
            data.code ? `code ${data.code}` : "",
            data.reason ? data.reason : ""
          ].filter(Boolean).join(" · ");
          setStatusMessage(closeDetail ? `Live API 연결 종료됨: ${closeDetail}` : "Live API 연결 종료됨");
          pushDiagnosticEvent(closeDetail ? `closed: ${closeDetail}` : "closed");
        }
      };
      socket.onerror = () => {
        setStatusMessage("Live API WebSocket 연결 오류");
        pushDiagnosticEvent("browser websocket error");
      };
      socket.onclose = () => {
        cleanupAudio();
        setIsCapturing(false);
        pushDiagnosticEvent("browser websocket closed");
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
      setDiagnosticEvents([]);
      setStatusMessage("탭/시스템 오디오 캡처 준비 중");
      pushDiagnosticEvent(`capture initialized (${translationMode}, ${targetLanguageCodes.join(",")})`);
    } catch (error) {
      cleanupAudio();
      socketRef.current?.close();
      socketRef.current = null;
      setIsCapturing(false);
      const message = error instanceof Error ? error.message : String(error);
      setStatusMessage(message);
      pushDiagnosticEvent(`capture error: ${message}`);
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
            {displayName} 레이아웃으로 테스트합니다. 입력 언어는 Gemini Live API가 자동 인식하고, 열린 언어별 URL이 같은 채널 자막 queue와 언어별 통역 오디오 stream을 구독합니다.
          </p>
          <p className="mt-2 text-xs font-semibold text-emerald-700">
            대상 언어: {targetLanguageCodes.map((languageCode) => languageCode.toUpperCase()).join(", ")}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
          published {publishedCount} / frames {sentFrames}
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[230px_minmax(0,1fr)_auto]">
        <label className="text-xs font-bold text-slate-700">
          반영 방식
          <select
            value={translationMode}
            onChange={(event) => setTranslationMode(event.target.value as "realtime" | "sentence")}
            disabled={isCapturing}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-400 disabled:opacity-60"
          >
            <option value="sentence">실시간 문장 단위 별 번역 반영</option>
            <option value="realtime">실시간 번역 반영</option>
          </select>
        </label>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Latest Queue Caption</p>
          <p className="mt-2 min-h-10 text-sm font-semibold leading-relaxed text-slate-900">
            {latestTranscript || "전사 결과 대기 중"}
          </p>
          {statusMessage && (
            <p className="mt-2 text-xs font-semibold text-slate-500">{statusMessage}</p>
          )}
        </div>

        <div className="flex flex-col justify-end gap-2">
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm">
            통역 음성은 언어 URL에서 재생
            <span className="block text-[11px] font-semibold text-slate-400">URL 안의 음성 버튼으로 제어</span>
          </div>
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

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-950 p-3 text-xs text-slate-200">
        <p className="font-black uppercase tracking-widest text-emerald-300">Live Diagnostics</p>
        <div className="mt-2 max-h-40 space-y-1 overflow-auto font-mono">
          {diagnosticEvents.length === 0 ? (
            <p className="text-slate-500">진단 이벤트 대기 중</p>
          ) : (
            diagnosticEvents.map((event) => (
              <p key={event}>{event}</p>
            ))
          )}
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        Chrome 공유 창에서 오디오가 재생 중인 탭을 선택하고 `Share tab audio`를 켜세요. `/live/...` 자막 오버레이 화면은 여기서 publish된 자막을 받아 표시합니다.
        캡처는 채널당 한 번만 시작하면 되고, 열려 있는 모든 언어 URL은 같은 stream을 동시에 구독합니다.
        문장 단위 모드는 최종 transcript 저장에 적합하고, 실시간 반영 모드는 draft 자막을 더 빨리 보여줍니다.
        실제 응답 시간은 Gemini Live API 상태와 네트워크에 영향을 받습니다.
        통역 음성은 언어별 URL 화면의 음성 시작 버튼을 눌러 확인합니다.
      </p>
    </div>
  );
}
