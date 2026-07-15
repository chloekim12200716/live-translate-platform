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

function getSupportedAudioMimeType() {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4"
  ];

  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? "";
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
  const [chunkSeconds, setChunkSeconds] = useState(5);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isPostingRef = useRef(false);

  const stopCapture = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    isPostingRef.current = false;
    setIsCapturing(false);
    setStatusMessage("오디오 캡처 중지됨");
  };

  const postAudioChunk = async (blob: Blob) => {
    if (!blob.size || isPostingRef.current) return;

    isPostingRef.current = true;
    setStatusMessage("오디오 전사 요청 중");

    try {
      const params = new URLSearchParams({
        sessionSlug,
        sourceLang: sourceLanguageCode
      });
      const response = await fetch(`/api/audio/transcribe-publish?${params.toString()}`, {
        method: "POST",
        headers: {
          "Content-Type": blob.type || "audio/webm"
        },
        body: blob
      });
      const data = await response.json() as { status?: string; transcript?: string; error?: string };

      if (!response.ok) {
        throw new Error(data.error || `Audio transcription failed (${response.status})`);
      }

      if (data.status === "published" && data.transcript) {
        setLatestTranscript(data.transcript);
        setPublishedCount((currentCount) => currentCount + 1);
        setStatusMessage("caption queue로 전송됨");
      } else {
        setStatusMessage("감지된 음성이 없습니다");
      }
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : String(error));
    } finally {
      isPostingRef.current = false;
    }
  };

  const startTabAudioCapture = async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setStatusMessage("이 브라우저는 탭/화면 오디오 캡처를 지원하지 않습니다.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        stream.getTracks().forEach((track) => track.stop());
        setStatusMessage("공유된 탭/화면에 오디오 트랙이 없습니다. Chrome에서 탭 공유와 Share tab audio를 켜세요.");
        return;
      }

      const audioOnlyStream = new MediaStream(audioTracks);
      const mimeType = getSupportedAudioMimeType();
      const recorder = new MediaRecorder(audioOnlyStream, mimeType ? { mimeType } : undefined);

      stream.getVideoTracks().forEach((track) => {
        track.onended = stopCapture;
      });
      audioTracks.forEach((track) => {
        track.onended = stopCapture;
      });
      recorder.ondataavailable = (event) => {
        void postAudioChunk(event.data);
      };
      recorder.onerror = () => {
        setStatusMessage("오디오 녹음 중 오류가 발생했습니다.");
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
      };

      streamRef.current = stream;
      recorderRef.current = recorder;
      recorder.start(chunkSeconds * 1000);
      setIsCapturing(true);
      setLatestTranscript("");
      setStatusMessage("탭/시스템 오디오 캡처 중");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-emerald-600" />
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Direct Audio Translation Test</p>
          </div>
          <h3 className="mt-1 text-lg font-bold text-slate-900">오디오 직접 전사/번역 테스트</h3>
          <p className="mt-1 text-sm text-slate-500">
            YouTube 탭 또는 라이브 방송 화면의 오디오를 캡처해 Gemini 전사 후 caption queue로 전송합니다.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
          published {publishedCount}
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[170px_150px_minmax(0,1fr)_auto]">
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

        <label className="text-xs font-bold text-slate-700">
          chunk
          <select
            value={chunkSeconds}
            onChange={(event) => setChunkSeconds(Number(event.target.value))}
            disabled={isCapturing}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-400 disabled:opacity-60"
          >
            <option value={3}>3초</option>
            <option value={5}>5초</option>
            <option value={8}>8초</option>
          </select>
        </label>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Latest Transcript</p>
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
            {isCapturing ? "캡처 중지" : "탭 오디오 캡처"}
          </button>
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        Chrome에서 YouTube 탭을 선택하고 `Share tab audio`를 켜야 합니다. 이 테스트는 실시간 파이프라인 검증용이며,
        chunk 길이만큼 전사 지연이 발생합니다.
      </p>
    </div>
  );
}
