import React, { useEffect, useState } from "react";
import { Languages } from "lucide-react";

const captionByLanguage: Record<string, string> = {
  ar: "سنراجع اليوم النتائج السريرية للعلاجات مزدوجة الهدف وتأثيرها على حماية القلب والكلى.",
  zh: "今天我们将回顾双靶向治疗的临床试验，以及其对心血管和肾脏保护的意义。",
  en: "Today we will review the clinical trials of dual-targeting therapies and their cardiometabolic impact.",
  fr: "Aujourd'hui, nous allons examiner les essais cliniques des thérapies à double cible et leur impact cardiométabolique.",
  ko: "오늘 우리는 이중 표적 치료제의 임상 시험과 심혈관 대사 영향에 대해 검토하겠습니다.",
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

interface CaptionLine {
  key: string;
  text: string;
  comparisonKey: string;
}

function createCaptionLine(text: string, key = `caption-${Date.now()}`): CaptionLine {
  return { key, text, comparisonKey: getCaptionComparisonKey(text) };
}

function getCaptionComparisonKey(text: string) {
  return text
    .replace(/\s+/g, " ")
    .replace(/[.!?。！？]+$/g, "")
    .trim()
    .toLowerCase();
}

function getCaptionDisplayText({
  translatedText,
  sourceText,
  fallbackCaption,
  isFinal,
  shouldShowSourceText
}: {
  translatedText: string;
  sourceText?: string;
  fallbackCaption: string;
  isFinal?: boolean;
  shouldShowSourceText: boolean;
}) {
  if (translatedText) return translatedText;
  if (isFinal && shouldShowSourceText) return sourceText || fallbackCaption;
  return "";
}

export default function CaptionComponent({ languageCode, sessionSlug, sourceLanguageCode, sourceText }: CaptionComponentProps) {
  const normalizedLanguage = languageCode.toLowerCase();
  const normalizedSourceLanguage = sourceLanguageCode.toLowerCase();
  const fallbackCaption = normalizedLanguage === normalizedSourceLanguage
    ? sourceText
    : captionByLanguage[normalizedLanguage] ?? captionByLanguage.en;
  const [captionLines, setCaptionLines] = useState<CaptionLine[]>(fallbackCaption ? [createCaptionLine(fallbackCaption, "fallback")] : []);
  const [engine, setEngine] = useState(normalizedLanguage === normalizedSourceLanguage ? "Source Caption" : "Local Mock Caption");
  const [isLoading, setIsLoading] = useState(false);
  const [sequence, setSequence] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let eventSource: EventSource | null = null;
    let didFallbackToTranslateApi = false;

    setCaptionLines(fallbackCaption ? [createCaptionLine(fallbackCaption, "fallback")] : []);
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
          const nextCaption = data.translatedText?.trim() || fallbackCaption;
          setCaptionLines(nextCaption ? [createCaptionLine(nextCaption, "single-translation")] : []);
          setEngine(data.engine || "Translation API Fallback");
        })
        .catch((error: Error) => {
          if (controller.signal.aborted) return;
          setCaptionLines(fallbackCaption ? [createCaptionLine(fallbackCaption, "fallback")] : []);
          setEngine("Local Mock Caption");
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
      replayLatest: "true",
      replayLimit: "50"
    });

    setEngine("Live Translation Stream");
    eventSource = new EventSource(`/api/captions/stream?${streamParams.toString()}`);
    eventSource.addEventListener("stream-ready", (event) => {
      const data = JSON.parse((event as MessageEvent).data) as StreamReadyPayload;
      setEngine("Caption Queue Connected");
      setIsLoading(false);
      setCaptionLines(data.queuedCaptions ? [] : []);
    });
    eventSource.addEventListener("caption", (event) => {
      const data = JSON.parse((event as MessageEvent).data) as StreamCaptionPayload;
      const translatedText = data.translatedText?.trim() || "";
      const shouldShowSourceText = normalizedLanguage === normalizedSourceLanguage;
      const nextCaption = getCaptionDisplayText({
        translatedText,
        sourceText: data.sourceText,
        fallbackCaption,
        isFinal: data.isFinal,
        shouldShowSourceText
      });
      if (nextCaption) {
        const nextKey = data.id || `sequence-${data.sequence ?? Date.now()}`;
        const nextLine = createCaptionLine(nextCaption, nextKey);
        setCaptionLines((currentLines) => {
          const lastLine = currentLines[currentLines.length - 1];
          if (lastLine?.key === nextKey || lastLine?.comparisonKey === nextLine.comparisonKey) {
            return [...currentLines.slice(0, -1), nextLine].slice(-2);
          }

          const existingIndex = currentLines.findIndex((line) => (
            line.key === nextKey || line.comparisonKey === nextLine.comparisonKey
          ));
          if (existingIndex !== -1) {
            const updatedLines = [...currentLines];
            updatedLines[existingIndex] = nextLine;
            return updatedLines.slice(-2);
          }

          return [...currentLines, nextLine].slice(-2);
        });
      }
      setEngine(data.isFinal ? data.engine || "Live Caption Stream" : "Caption Queue");
      setSequence(data.sequence || 0);
      setIsLoading(false);
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
    eventSource.addEventListener("caption-error", () => {
      setEngine("Caption Queue");
    });
    eventSource.onerror = () => {
      if (didFallbackToTranslateApi) return;
      didFallbackToTranslateApi = true;
      eventSource?.close();
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
        <div className="relative h-[4.6rem] overflow-hidden text-lg font-semibold leading-snug text-yellow-50 md:h-[5rem] md:text-2xl">
          {isLoading || captionLines.length === 0 ? (
            <p>&nbsp;</p>
          ) : (
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1">
              {captionLines.map((line, index) => (
                <p
                  key={line.key}
                  className={index === captionLines.length - 1 ? "text-yellow-50" : "text-yellow-100/80"}
                >
                  {line.text}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
