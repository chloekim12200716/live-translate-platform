import React, { useRef, useState } from "react";
import { Mic, Radio, Square } from "lucide-react";

interface LiveSpeechCaptionTesterProps {
  channelSlug: string;
  defaultSourceLanguageCode: string;
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionResultListLike {
  readonly length: number;
  [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionEventLike {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string; message?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const speechLanguageOptions = [
  { code: "en", label: "English", speechLang: "en-US" },
  { code: "ko", label: "Korean", speechLang: "ko-KR" },
  { code: "fr", label: "French", speechLang: "fr-FR" },
  { code: "es", label: "Spanish", speechLang: "es-ES" },
  { code: "zh", label: "Chinese", speechLang: "zh-CN" },
  { code: "ar", label: "Arabic", speechLang: "ar-SA" },
  { code: "ru", label: "Russian", speechLang: "ru-RU" }
];

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  const candidateWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

  return candidateWindow.SpeechRecognition ?? candidateWindow.webkitSpeechRecognition ?? null;
}

function getSpeechLanguage(sourceLanguageCode: string) {
  return speechLanguageOptions.find((option) => option.code === sourceLanguageCode)?.speechLang ?? "en-US";
}

export default function LiveSpeechCaptionTester({
  channelSlug,
  defaultSourceLanguageCode
}: LiveSpeechCaptionTesterProps) {
  const [sourceLanguageCode, setSourceLanguageCode] = useState(defaultSourceLanguageCode);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [latestFinalText, setLatestFinalText] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [publishedCount, setPublishedCount] = useState(0);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const publishCaption = async (text: string) => {
    const trimmedText = text.trim();
    if (!trimmedText) return;

    const response = await fetch("/api/captions/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channelSlug,
        speaker: "Live STT",
        sourceLang: sourceLanguageCode,
        text: trimmedText,
        isFinal: true
      })
    });

    if (!response.ok) {
      throw new Error(`Caption publish failed (${response.status})`);
    }

    setLatestFinalText(trimmedText);
    setPublishedCount((currentCount) => currentCount + 1);
    setStatusMessage("caption queue로 전송됨");
  };

  const handleStart = () => {
    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) {
      setStatusMessage("이 브라우저는 Web Speech Recognition을 지원하지 않습니다. Chrome 계열 브라우저에서 테스트하세요.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = getSpeechLanguage(sourceLanguageCode);
    recognition.onresult = (event) => {
      let nextInterimText = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript ?? "";

        if (result.isFinal) {
          void publishCaption(transcript).catch((error: Error) => {
            setStatusMessage(error.message);
          });
        } else {
          nextInterimText += transcript;
        }
      }

      setInterimText(nextInterimText.trim());
    };
    recognition.onerror = (event) => {
      setStatusMessage(event.message || event.error || "음성 인식 오류가 발생했습니다.");
    };
    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setInterimText("");
    setStatusMessage("입력 오디오를 듣는 중");
    setIsListening(true);
  };

  const handleStop = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    setInterimText("");
    setStatusMessage("중지됨");
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-emerald-600" />
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Live STT Caption Test</p>
          </div>
          <h3 className="mt-1 text-lg font-bold text-slate-900">라이브 방송 무자막 테스트</h3>
          <p className="mt-1 text-sm text-slate-500">
            마이크 또는 가상 오디오 입력으로 들은 말을 실시간 caption queue에 넣어 번역 스트림을 테스트합니다.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
          published {publishedCount}
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)_auto]">
        <label className="text-xs font-bold text-slate-700">
          입력 언어
          <select
            value={sourceLanguageCode}
            onChange={(event) => setSourceLanguageCode(event.target.value)}
            disabled={isListening}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-400 disabled:opacity-60"
          >
            {speechLanguageOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Recognized Input</p>
          <p className="mt-2 min-h-10 text-sm font-semibold leading-relaxed text-slate-900">
            {interimText || latestFinalText || "입력 대기 중"}
          </p>
          {statusMessage && (
            <p className="mt-2 text-xs font-semibold text-slate-500">{statusMessage}</p>
          )}
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={isListening ? handleStop : handleStart}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-black text-white shadow-sm ${
              isListening ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {isListening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {isListening ? "중지" : "Live STT 시작"}
          </button>
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        브라우저는 YouTube iframe 오디오를 직접 캡처하지 못합니다. 실제 방송 테스트는 스피커 출력이 마이크로 들어오게 하거나
        시스템 오디오를 가상 마이크 입력으로 라우팅해서 진행하세요.
      </p>
    </div>
  );
}
