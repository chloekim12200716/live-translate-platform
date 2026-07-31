import React, { useEffect, useState } from "react";
import { Play, Radio, Square } from "lucide-react";

interface CaptionStreamDemoControlsProps {
  channelSlug: string;
  sourceLanguageCode: string;
}

interface DemoProducerStatus {
  isRunning: boolean;
  subscribers: number;
  queuedCaptions: number;
  intervalMs: number | null;
}

export default function CaptionStreamDemoControls({ channelSlug, sourceLanguageCode }: CaptionStreamDemoControlsProps) {
  const [status, setStatus] = useState<DemoProducerStatus | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const loadStatus = () => {
    fetch(`/api/captions/demo/status?channelSlug=${encodeURIComponent(channelSlug)}`)
      .then((response) => response.json())
      .then((data: DemoProducerStatus) => setStatus(data))
      .catch(() => setStatus(null));
  };

  useEffect(() => {
    loadStatus();
    const timer = window.setInterval(loadStatus, 4000);
    return () => window.clearInterval(timer);
  }, [channelSlug]);

  const updateDemoStream = (action: "start" | "stop") => {
    setIsBusy(true);
    fetch(`/api/captions/demo/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channelSlug,
        sessionSlug: channelSlug,
        sourceLang: sourceLanguageCode,
        intervalMs: 3500
      })
    })
      .then((response) => response.json())
      .then((data: { producer?: DemoProducerStatus }) => {
        setStatus(data.producer ?? null);
      })
      .finally(() => setIsBusy(false));
  };

  const isRunning = Boolean(status?.isRunning);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-full border border-white/15 bg-white/10 px-2 py-1 text-xs font-bold backdrop-blur">
      <span className="flex items-center gap-1 px-1 text-cyan-100">
        <Radio className={`h-3.5 w-3.5 ${isRunning ? "text-emerald-300" : "text-slate-300"}`} />
        {isRunning ? "Demo stream" : "Queue idle"}
      </span>
      <span className="hidden text-[11px] text-slate-300 sm:inline">
        subs {status?.subscribers ?? 0} / queue {status?.queuedCaptions ?? 0}
      </span>
      <button
        type="button"
        onClick={() => updateDemoStream(isRunning ? "stop" : "start")}
        disabled={isBusy}
        className={`inline-flex h-7 items-center gap-1 rounded-full px-3 text-[11px] transition ${
          isRunning
            ? "bg-rose-500/90 text-white hover:bg-rose-500"
            : "bg-emerald-500/90 text-white hover:bg-emerald-500"
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {isRunning ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        {isRunning ? "Stop" : "Start"}
      </button>
    </div>
  );
}
