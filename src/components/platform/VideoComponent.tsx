import React from "react";
import { PlayCircle } from "lucide-react";
import { PlatformSession } from "../../data/mockPlatformData";

interface VideoComponentProps {
  session: PlatformSession;
}

export default function VideoComponent({ session }: VideoComponentProps) {
  return (
    <div className="relative h-full min-h-0 overflow-hidden rounded-lg border border-white/15 bg-slate-950 shadow-2xl">
      <video
        src={session.videoUrl}
        className="h-full w-full object-cover"
        controls
        muted
        loop
        playsInline
      />
      <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-md border border-white/10 bg-slate-950/75 px-3 py-1.5 text-white backdrop-blur">
        <span className="h-2 w-2 rounded-full bg-rose-500" />
        <span className="text-xs font-semibold uppercase tracking-wide">{session.mode}</span>
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 flex max-w-[80%] items-center gap-2 rounded-md bg-slate-950/75 px-3 py-2 text-white backdrop-blur">
        <PlayCircle className="h-4 w-4 text-cyan-300" />
        <div className="truncate text-left">
          <p className="truncate text-xs font-bold">{session.speakerName}</p>
          <p className="truncate text-[11px] text-slate-300">{session.speakerAffiliation}</p>
        </div>
      </div>
    </div>
  );
}
