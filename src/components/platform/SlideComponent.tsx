import React from "react";
import { FileText } from "lucide-react";
import { PlatformSession } from "../../data/mockPlatformData";

interface SlideComponentProps {
  session: PlatformSession;
}

export default function SlideComponent({ session }: SlideComponentProps) {
  const slide = session.slides[0];

  return (
    <div className="flex h-full min-h-0 flex-col justify-between overflow-hidden rounded-lg border border-white/15 bg-slate-950/90 p-5 text-left text-white shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 rounded-md border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-cyan-200">
          <FileText className="h-3.5 w-3.5" />
          Slide
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          {slide.startsAtSeconds}s - {slide.endsAtSeconds ?? "Live"}s
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold leading-tight text-slate-50">{slide.title}</h2>
          <p className="mt-1 text-sm font-medium text-cyan-200">{slide.subtitle}</p>
        </div>
        <div className="space-y-2 border-l-2 border-indigo-400/40 pl-4">
          {slide.points.map((point) => (
            <p key={point} className="text-sm leading-relaxed text-slate-200">
              {point}
            </p>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 pt-3 text-[11px] text-slate-400">
        <span>{session.title}</span>
        <span className="font-mono">1 / {session.slides.length}</span>
      </div>
    </div>
  );
}
