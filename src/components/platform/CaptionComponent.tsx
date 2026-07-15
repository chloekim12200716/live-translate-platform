import React, { useEffect, useState } from "react";
import { Languages } from "lucide-react";

const captionByLanguage: Record<string, string> = {
  ar: "سنراجع اليوم النتائج السريرية للعلاجات مزدوجة الهدف وتأثيرها على حماية القلب والكلى.",
  zh: "今天我们将回顾双靶向治疗的临床试验，以及其对心血管和肾脏保护的意义。",
  en: "Today we will review the clinical trials of dual-targeting therapies and their cardiometabolic impact.",
  fr: "Aujourd'hui, nous allons examiner les essais cliniques des thérapies à double cible et leur impact cardiométabolique.",
  ru: "Сегодня мы рассмотрим клинические исследования препаратов двойного действия и их кардиометаболическое значение.",
  es: "Hoy revisaremos los ensayos clínicos de las terapias de doble objetivo y su impacto cardiometabólico."
};

interface CaptionComponentProps {
  languageCode: string;
  sessionSlug: string;
  sourceLanguageCode: string;
  sourceText: string;
}

interface StreamCaptionPayload {
  id?: string;
  sourceText?: string;
  translatedText?: string;
  engine?: string;
  sequence?: number;
  isFinal?: boolean;
}

interface StreamReadyPayload {
  queuedCaptions?: number;
}

export default function CaptionComponent({ languageCode, sessionSlug, sourceLanguageCode, sourceText }: CaptionComponentProps) {
  const normalizedLanguage = languageCode.toLowerCase();
  const normalizedSourceLanguage = sourceLanguageCode.toLowerCase();
  const fallbackCaption = normalizedLanguage === normalizedSourceLanguage
    ? sourceText
    : captionByLanguage[normalizedLanguage] ?? captionByLanguage.en;
  const [caption, setCaption] = useState(fallbackCaption);
  const [engine, setEngine] = useState(normalizedLanguage === normalizedSourceLanguage ? "Source Caption" : "Local Mock Caption");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [sequence, setSequence] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let eventSource: EventSource | null = null;
    let didFallbackToTranslateApi = false;

    setCaption(fallbackCaption);
    setErrorMessage("");
    setIsLoading(true);
    setSequence(0);

    const requestSingleTranslation = () => {
      setEngine("Translation API Fallback");
      fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: sourceText,
          sourceLang: normalizedSourceLanguage,
          targetLang: normalizedLanguage
        }),
        signal: controller.signal
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`Translation request failed (${response.status})`);
          }
          return response.json();
        })
        .then((data: { translatedText?: string; engine?: string }) => {
          setCaption(data.translatedText?.trim() || fallbackCaption);
          setEngine(data.engine || "Translation API Fallback");
        })
        .catch((error: Error) => {
          if (controller.signal.aborted) return;
          setCaption(fallbackCaption);
          setEngine("Local Mock Caption");
          setErrorMessage(error.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsLoading(false);
          }
        });
    };

    if (typeof EventSource === "undefined") {
      requestSingleTranslation();
      return () => controller.abort();
    }

    const streamParams = new URLSearchParams({
      sessionSlug,
      sourceLang: normalizedSourceLanguage,
      targetLang: normalizedLanguage,
      replayLatest: "true"
    });

    setEngine("Live Translation Stream");
    eventSource = new EventSource(`/api/captions/stream?${streamParams.toString()}`);
    eventSource.addEventListener("stream-ready", (event) => {
      const data = JSON.parse((event as MessageEvent).data) as StreamReadyPayload;
      setEngine("Caption Queue Connected");
      setIsLoading(false);
      setCaption(data.queuedCaptions ? fallbackCaption : "Waiting for live captions...");
    });
    eventSource.addEventListener("caption", (event) => {
      const data = JSON.parse((event as MessageEvent).data) as StreamCaptionPayload;
      setCaption(data.translatedText?.trim() || data.sourceText || fallbackCaption);
      setEngine(data.engine || "Live Translation Stream");
      setSequence(data.sequence || 0);
      setIsLoading(false);
      setErrorMessage("");
      window.dispatchEvent(new CustomEvent("platform-caption", {
        detail: {
          id: data.id,
          languageCode: normalizedLanguage,
          sourceText: data.sourceText,
          translatedText: data.translatedText,
          engine: data.engine,
          sequence: data.sequence,
          isFinal: data.isFinal
        }
      }));
    });
    eventSource.addEventListener("caption-error", (event) => {
      const data = JSON.parse((event as MessageEvent).data) as { message?: string };
      setErrorMessage(data.message || "Live caption translation failed.");
    });
    eventSource.onerror = () => {
      if (didFallbackToTranslateApi) return;
      didFallbackToTranslateApi = true;
      eventSource?.close();
      setErrorMessage("Live caption stream disconnected. Falling back to one-shot translation.");
      requestSingleTranslation();
    };

    return () => {
      controller.abort();
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [fallbackCaption, normalizedLanguage, normalizedSourceLanguage, sessionSlug, sourceText]);

  return (
    <div className="flex h-full min-h-0 items-center justify-center rounded-lg border border-yellow-200/20 bg-slate-950/90 px-6 py-4 text-center text-white shadow-2xl backdrop-blur">
      <div className="max-w-5xl space-y-2">
        <div className="flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-widest text-yellow-200">
          <Languages className="h-4 w-4" />
          {normalizedLanguage} captions · {engine}{sequence > 0 ? ` · #${sequence}` : ""}
        </div>
        <p className="text-lg font-semibold leading-relaxed text-yellow-50 md:text-2xl">
          {isLoading ? "Connecting live caption stream..." : caption}
        </p>
        {errorMessage && (
          <p className="text-xs font-medium text-rose-200">
            API fallback: {errorMessage}
          </p>
        )}
      </div>
    </div>
  );
}
