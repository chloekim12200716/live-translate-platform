import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Languages } from "lucide-react";
import {
  defaultCaptionStyle,
  PlatformCaptionStyle
} from "../../data/mockPlatformData";

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
  style?: PlatformCaptionStyle;
  isOverlay?: boolean;
  transparentBackground?: boolean;
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

export default function CaptionComponent({
  languageCode,
  sessionSlug,
  sourceLanguageCode,
  sourceText,
  style,
  isOverlay = false,
  transparentBackground = false
}: CaptionComponentProps) {
  const normalizedLanguage = languageCode.toLowerCase();
  const normalizedSourceLanguage = sourceLanguageCode.toLowerCase();
  const captionStyle = { ...defaultCaptionStyle, ...style };
  const fallbackCaption = normalizedLanguage === normalizedSourceLanguage
    ? sourceText
    : captionByLanguage[normalizedLanguage] ?? captionByLanguage.en;
  const [captionLines, setCaptionLines] = useState<CaptionLine[]>(fallbackCaption ? [createCaptionLine(fallbackCaption, "fallback")] : []);
  const [engine, setEngine] = useState(normalizedLanguage === normalizedSourceLanguage ? "Source Caption" : "Local Mock Caption");
  const [isLoading, setIsLoading] = useState(false);
  const [sequence, setSequence] = useState(0);
  const latestCaptionMeasureRef = useRef<HTMLParagraphElement>(null);
  const latestCaptionText = captionLines[captionLines.length - 1]?.text ?? "";
  const [shouldShowOnlyLatestCaption, setShouldShowOnlyLatestCaption] = useState(false);

  useLayoutEffect(() => {
    const measureLatestCaption = () => {
      const measureElement = latestCaptionMeasureRef.current;
      if (!measureElement || !latestCaptionText) {
        setShouldShowOnlyLatestCaption(false);
        return;
      }

      const lineHeight = Number.parseFloat(window.getComputedStyle(measureElement).lineHeight);
      if (!Number.isFinite(lineHeight) || lineHeight <= 0) {
        setShouldShowOnlyLatestCaption(false);
        return;
      }

      setShouldShowOnlyLatestCaption(measureElement.scrollHeight > lineHeight * 1.45);
    };

    measureLatestCaption();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measureLatestCaption);
      return () => window.removeEventListener("resize", measureLatestCaption);
    }

    const resizeObserver = new ResizeObserver(measureLatestCaption);
    if (latestCaptionMeasureRef.current?.parentElement) {
      resizeObserver.observe(latestCaptionMeasureRef.current.parentElement);
    }
    return () => resizeObserver.disconnect();
  }, [latestCaptionText]);

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

  const visibleCaptionLines = shouldShowOnlyLatestCaption && captionLines.length > 0
    ? captionLines.slice(-1)
    : captionLines.slice(-2);
  const shouldUseTransparentTextBackground = transparentBackground || captionStyle.textBackgroundTransparent;

  return (
    <div
      className={`flex h-full min-h-0 items-center justify-center overflow-hidden text-center text-white ${
        transparentBackground
          ? "bg-transparent px-2 py-1"
          : "rounded-lg border border-yellow-200/20 bg-slate-950/90 px-5 py-3 shadow-2xl backdrop-blur md:px-6"
      }`}
    >
      <div className="flex h-full min-h-0 w-full max-w-5xl flex-col justify-center">
        {!isOverlay && (
          <div className="flex shrink-0 items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-yellow-200 md:text-[11px]">
            <Languages className="h-4 w-4" />
            {normalizedLanguage} captions · {engine}{sequence > 0 ? ` · #${sequence}` : ""}
          </div>
        )}
        <div
          className={`relative min-h-0 flex-1 overflow-hidden font-semibold leading-snug ${isOverlay ? "" : "mt-2"}`}
          style={{
            color: captionStyle.textColor,
            fontFamily: captionStyle.fontFamily,
            fontSize: `${captionStyle.fontSizePx}px`
          }}
        >
          <p
            ref={latestCaptionMeasureRef}
            aria-hidden="true"
            className="invisible pointer-events-none absolute inset-x-0 top-0 whitespace-normal break-words"
          >
            {latestCaptionText}
          </p>
          {isLoading || captionLines.length === 0 ? (
            <p>&nbsp;</p>
          ) : (
            <div className="flex h-full min-h-0 flex-col justify-end gap-1 overflow-hidden">
              {visibleCaptionLines.map((line, index) => (
                <p
                  key={line.key}
                  className={`${shouldShowOnlyLatestCaption ? "line-clamp-2" : "line-clamp-1"} whitespace-normal break-words`}
                  style={{
                    color: index === visibleCaptionLines.length - 1 ? captionStyle.textColor : `${captionStyle.textColor}cc`,
                    textShadow: "0 1px 2px rgba(0, 0, 0, 0.45)"
                  }}
                >
                  <span
                    className="box-decoration-clone rounded px-2 py-0.5"
                    style={{ backgroundColor: shouldUseTransparentTextBackground ? "transparent" : captionStyle.textBackgroundColor }}
                  >
                    {line.text}
                  </span>
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
