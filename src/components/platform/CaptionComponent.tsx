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
  sourceLanguageCode: string;
  sourceText: string;
}

export default function CaptionComponent({ languageCode, sourceLanguageCode, sourceText }: CaptionComponentProps) {
  const normalizedLanguage = languageCode.toLowerCase();
  const normalizedSourceLanguage = sourceLanguageCode.toLowerCase();
  const fallbackCaption = normalizedLanguage === normalizedSourceLanguage
    ? sourceText
    : captionByLanguage[normalizedLanguage] ?? captionByLanguage.en;
  const [caption, setCaption] = useState(fallbackCaption);
  const [engine, setEngine] = useState(normalizedLanguage === normalizedSourceLanguage ? "Source Caption" : "Local Mock Caption");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    setCaption(fallbackCaption);
    setErrorMessage("");

    if (normalizedLanguage === normalizedSourceLanguage) {
      setEngine("Source Caption");
      setIsLoading(false);
      return () => controller.abort();
    }

    setIsLoading(true);
    setEngine("Translation API");

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
        setEngine(data.engine || "Translation API");
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

    return () => controller.abort();
  }, [fallbackCaption, normalizedLanguage, normalizedSourceLanguage, sourceText]);

  return (
    <div className="flex h-full min-h-0 items-center justify-center rounded-lg border border-yellow-200/20 bg-slate-950/90 px-6 py-4 text-center text-white shadow-2xl backdrop-blur">
      <div className="max-w-5xl space-y-2">
        <div className="flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-widest text-yellow-200">
          <Languages className="h-4 w-4" />
          {normalizedLanguage} captions · {engine}
        </div>
        <p className="text-lg font-semibold leading-relaxed text-yellow-50 md:text-2xl">
          {isLoading ? "Translating sample caption..." : caption}
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
