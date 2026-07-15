import React, { useEffect, useState } from "react";
import { PlayCircle } from "lucide-react";
import { PlatformSession } from "../../data/mockPlatformData";
import {
  loadStoredVideoBlob,
  loadStoredVideoMetadata
} from "../../data/platformVideoStorage";

interface VideoComponentProps {
  session: PlatformSession;
}

export default function VideoComponent({ session }: VideoComponentProps) {
  const [videoSrc, setVideoSrc] = useState(session.videoUrl);
  const [videoLabel, setVideoLabel] = useState("Sample video");

  useEffect(() => {
    let objectUrl = "";
    let isActive = true;

    const loadVideoSource = async () => {
      const metadata = loadStoredVideoMetadata(session.slug);

      if (!metadata) {
        if (!isActive) return;
        setVideoSrc(session.videoUrl);
        setVideoLabel("Sample video");
        return;
      }

      if (metadata.sourceType === "url" && metadata.url) {
        if (!isActive) return;
        setVideoSrc(metadata.url);
        setVideoLabel("Custom URL");
        return;
      }

      if (metadata.sourceType === "file") {
        const blob = await loadStoredVideoBlob(session.slug);
        if (!isActive) return;

        if (blob) {
          objectUrl = URL.createObjectURL(blob);
          setVideoSrc(objectUrl);
          setVideoLabel(metadata.fileName ?? "Uploaded video");
          return;
        }
      }

      setVideoSrc(session.videoUrl);
      setVideoLabel("Sample video");
    };

    const handleVideoSourceUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ sessionSlug?: string }>).detail;
      if (detail?.sessionSlug && detail.sessionSlug !== session.slug) return;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = "";
      }
      void loadVideoSource();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== `videoSource:${session.slug}`) return;
      handleVideoSourceUpdated(new CustomEvent("platform-video-source-updated", { detail: { sessionSlug: session.slug } }));
    };

    void loadVideoSource();
    window.addEventListener("platform-video-source-updated", handleVideoSourceUpdated);
    window.addEventListener("storage", handleStorage);

    return () => {
      isActive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      window.removeEventListener("platform-video-source-updated", handleVideoSourceUpdated);
      window.removeEventListener("storage", handleStorage);
    };
  }, [session.slug, session.videoUrl]);

  return (
    <div className="relative h-full min-h-0 overflow-hidden rounded-lg border border-white/15 bg-slate-950 shadow-2xl">
      <video
        src={videoSrc}
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
          <p className="truncate text-[11px] text-slate-300">{videoLabel} · {session.speakerAffiliation}</p>
        </div>
      </div>
    </div>
  );
}
