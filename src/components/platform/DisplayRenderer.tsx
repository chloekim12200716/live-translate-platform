import React, { useEffect, useState } from "react";
import { Eye, EyeOff, FileText, X } from "lucide-react";
import {
  PlatformLayout,
  PlatformLayoutComponent,
  PlatformSession
} from "../../data/mockPlatformData";
import {
  getBackgroundSize,
  getComponentFrameStyle
} from "../../utils/layoutEditor";
import CaptionStreamDemoControls from "./CaptionStreamDemoControls";
import CaptionComponent from "./CaptionComponent";
import NoticeComponent from "./NoticeComponent";
import QAComponent from "./QAComponent";
import SlideComponent from "./SlideComponent";
import VideoComponent from "./VideoComponent";

interface DisplayRendererProps {
  layout: PlatformLayout;
  session: PlatformSession;
  languageCode: string;
}

interface TranscriptEntry {
  id: string;
  languageCode: string;
  sourceText: string;
  translatedText: string;
  engine: string;
  sequence: number;
  isFinal: boolean;
}

function getTranscriptComparisonKey(text: string) {
  return text
    .replace(/\s+/g, " ")
    .replace(/[.!?。！？]+$/g, "")
    .trim()
    .toLowerCase();
}

function renderComponent(component: PlatformLayoutComponent, session: PlatformSession, languageCode: string) {
  switch (component.type) {
    case "video":
      return <VideoComponent session={session} />;
    case "slide":
      return <SlideComponent session={session} />;
    case "caption":
      return (
        <CaptionComponent
          languageCode={languageCode}
          sessionSlug={session.slug}
          sourceLanguageCode={session.sourceLanguageCode}
          sourceText={session.sampleCaptionText}
          style={component.captionStyle}
        />
      );
    case "qa":
      return <QAComponent />;
    case "notice":
      return <NoticeComponent />;
    default:
      return null;
  }
}

export default function DisplayRenderer({ layout, session, languageCode }: DisplayRendererProps) {
  const canvasRatio = layout.canvasWidth / layout.canvasHeight;
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [transcriptEntries, setTranscriptEntries] = useState<TranscriptEntry[]>([]);

  useEffect(() => {
    const handleCaptionEvent = (event: Event) => {
      const captionEvent = event as CustomEvent<Partial<TranscriptEntry>>;
      const detail = captionEvent.detail;
      if (!detail?.id || detail.languageCode !== languageCode) return;
      if (detail.isFinal === false && !detail.translatedText?.trim()) return;

      setTranscriptEntries((currentEntries) => {
        const nextEntry: TranscriptEntry = {
          id: detail.id ?? `caption-${Date.now()}`,
          languageCode,
          sourceText: detail.sourceText ?? "",
          translatedText: detail.translatedText ?? "",
          engine: detail.engine ?? "",
          sequence: detail.sequence ?? currentEntries.length + 1,
          isFinal: Boolean(detail.isFinal)
        };
        const nextComparisonKey = getTranscriptComparisonKey(nextEntry.translatedText);
        const existingIndex = currentEntries.findIndex((entry) => (
          entry.id === nextEntry.id
          || getTranscriptComparisonKey(entry.translatedText) === nextComparisonKey
        ));

        if (existingIndex === -1) {
          return [...currentEntries, nextEntry]
            .sort((firstEntry, secondEntry) => firstEntry.sequence - secondEntry.sequence)
            .slice(-100);
        }

        const updatedEntries = [...currentEntries];
        updatedEntries[existingIndex] = nextEntry;
        return updatedEntries.sort((firstEntry, secondEntry) => firstEntry.sequence - secondEntry.sequence);
      });
    };

    window.addEventListener("platform-caption", handleCaptionEvent);
    return () => window.removeEventListener("platform-caption", handleCaptionEvent);
  }, [languageCode]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 p-4 md:p-6">
      {isHeaderVisible && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-white">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-cyan-200">{session.mode} Session</p>
            <h1 className="text-xl font-bold md:text-2xl">{session.title}</h1>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsTranscriptOpen(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 text-xs font-bold text-white backdrop-blur transition hover:bg-white/15"
            >
              <FileText className="h-3.5 w-3.5" />
              View Transcript
            </button>
            <CaptionStreamDemoControls
              sessionSlug={session.slug}
              sourceLanguageCode={session.sourceLanguageCode}
            />
            <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide backdrop-blur">
              /live/{session.slug}/{languageCode}
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-center">
        <div
          className="relative w-full overflow-hidden rounded-xl"
          style={{
            aspectRatio: `${layout.canvasWidth} / ${layout.canvasHeight}`,
            backgroundImage: `linear-gradient(rgba(2, 6, 23, 0.78), rgba(2, 6, 23, 0.82)), url(${layout.backgroundImageUrl})`,
            backgroundColor: layout.backgroundColor,
            backgroundPosition: `${layout.backgroundPositionX}% ${layout.backgroundPositionY}%`,
            backgroundRepeat: "no-repeat",
            backgroundSize: getBackgroundSize(layout.backgroundFit),
            maxHeight: "calc(100vh - 8rem)",
            maxWidth: `calc((100vh - 8rem) * ${canvasRatio})`
          }}
        >
          {layout.components.filter((component) => component.visible !== false).map((component) => (
            <section
              key={component.id}
              aria-label={component.label}
              className="absolute min-h-0"
              style={{
                ...getComponentFrameStyle(component, layout),
                zIndex: component.zIndex
              }}
            >
              {renderComponent(component, session, languageCode)}
            </section>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setIsHeaderVisible((currentValue) => !currentValue)}
        className="fixed bottom-4 right-4 z-[80] inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-slate-950/85 px-4 py-2 text-xs font-bold text-white shadow-2xl backdrop-blur transition hover:bg-slate-900"
      >
        {isHeaderVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        {isHeaderVisible ? "Hide Header" : "Show Header"}
      </button>

      {isTranscriptOpen && (
        <div className="fixed inset-y-0 right-0 z-[90] flex w-full max-w-md flex-col border-l border-white/10 bg-slate-950/95 text-white shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-cyan-200">Transcript</p>
              <h2 className="text-lg font-bold">{session.title}</h2>
            </div>
            <button
              type="button"
              onClick={() => setIsTranscriptOpen(false)}
              className="rounded-full p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
              aria-label="Close transcript"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {transcriptEntries.length === 0 ? (
              <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                아직 수신된 자막이 없습니다. Demo stream을 시작하거나 caption queue에 자막을 publish하면 여기에 누적됩니다.
              </div>
            ) : (
              <div className="space-y-3">
                {transcriptEntries.map((entry) => (
                  <article key={entry.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <div className="mb-2 flex items-center justify-between gap-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      <span>#{entry.sequence} · {entry.languageCode}</span>
                      <span>{entry.engine}</span>
                    </div>
                    <p className="text-sm font-semibold leading-relaxed text-yellow-50">
                      {entry.translatedText}
                    </p>
                    {entry.sourceText && entry.sourceText !== entry.translatedText && (
                      <p className="mt-2 text-xs leading-relaxed text-slate-400">
                        {entry.sourceText}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
