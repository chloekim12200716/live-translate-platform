import React, { useEffect, useState } from "react";
import { PlayCircle } from "lucide-react";
import { PlatformChannel } from "../../data/mockPlatformData";
import {
  loadStoredVideoBlob,
  loadStoredVideoMetadata
} from "../../data/platformVideoStorage";

interface VideoComponentProps {
  channel: PlatformChannel;
}

function getYouTubeEmbedUrl(url: string) {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.replace(/^www\./, "");
    let videoId = "";

    if (hostname === "youtu.be") {
      videoId = parsedUrl.pathname.split("/").filter(Boolean)[0] ?? "";
    }

    if (hostname === "youtube.com" || hostname === "m.youtube.com" || hostname === "music.youtube.com") {
      if (parsedUrl.pathname === "/watch") {
        videoId = parsedUrl.searchParams.get("v") ?? "";
      } else if (parsedUrl.pathname.startsWith("/embed/")) {
        videoId = parsedUrl.pathname.split("/")[2] ?? "";
      } else if (parsedUrl.pathname.startsWith("/live/") || parsedUrl.pathname.startsWith("/shorts/")) {
        videoId = parsedUrl.pathname.split("/")[2] ?? "";
      }
    }

    if (!videoId) return "";

    const start = parsedUrl.searchParams.get("t") ?? parsedUrl.searchParams.get("start");
    const embedUrl = new URL(`https://www.youtube.com/embed/${videoId}`);
    embedUrl.searchParams.set("rel", "0");
    embedUrl.searchParams.set("modestbranding", "1");
    if (start) {
      embedUrl.searchParams.set("start", start.replace(/\D/g, ""));
    }

    return embedUrl.toString();
  } catch {
    return "";
  }
}

export default function VideoComponent({ channel }: VideoComponentProps) {
  const [videoSrc, setVideoSrc] = useState(channel.videoUrl);
  const [videoLabel, setVideoLabel] = useState("Sample video");
  const [videoErrorMessage, setVideoErrorMessage] = useState("");
  const youtubeEmbedUrl = getYouTubeEmbedUrl(videoSrc);

  useEffect(() => {
    let objectUrl = "";
    let isActive = true;

    const loadVideoSource = async () => {
      const metadata = loadStoredVideoMetadata(channel.slug);

      if (!metadata) {
        if (!isActive) return;
        setVideoSrc(channel.videoUrl);
        setVideoLabel("Sample video");
        setVideoErrorMessage("");
        return;
      }

      if (metadata.sourceType === "url" && metadata.url) {
        if (!isActive) return;
        setVideoSrc(metadata.url);
        setVideoLabel("Custom URL");
        setVideoErrorMessage("");
        return;
      }

      if (metadata.sourceType === "file") {
        const blob = await loadStoredVideoBlob(channel.slug);
        if (!isActive) return;

        if (blob) {
          objectUrl = URL.createObjectURL(blob);
          setVideoSrc(objectUrl);
          setVideoLabel(metadata.fileName ?? "Uploaded video");
          setVideoErrorMessage("");
          return;
        }
      }

      setVideoSrc(channel.videoUrl);
      setVideoLabel("Sample video");
      setVideoErrorMessage("");
    };

    const handleVideoSourceUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ channelSlug?: string }>).detail;
      const updatedChannelSlug = detail?.channelSlug;
      if (updatedChannelSlug && updatedChannelSlug !== channel.slug) return;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = "";
      }
      void loadVideoSource();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== `videoSource:${channel.slug}`) return;
      handleVideoSourceUpdated(new CustomEvent("platform-video-source-updated", { detail: { channelSlug: channel.slug } }));
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
  }, [channel.slug, channel.videoUrl]);

  return (
    <div className="relative h-full min-h-0 overflow-hidden rounded-lg border border-white/15 bg-slate-950 shadow-2xl">
      {youtubeEmbedUrl ? (
        <iframe
          key={youtubeEmbedUrl}
          src={youtubeEmbedUrl}
          title={`${channel.title} YouTube test video`}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          onLoad={() => setVideoErrorMessage("")}
        />
      ) : (
        <video
          key={videoSrc}
          src={videoSrc}
          className="h-full w-full object-cover"
          controls
          muted
          loop
          playsInline
          preload="metadata"
          onLoadedMetadata={() => setVideoErrorMessage("")}
          onError={() => {
            setVideoErrorMessage("이 URL은 브라우저 video 태그에서 직접 재생할 수 없습니다. mp4/webm 파일 URL, YouTube URL 또는 로컬 영상 파일을 사용하세요.");
          }}
        />
      )}
      <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-md border border-white/10 bg-slate-950/75 px-3 py-1.5 text-white backdrop-blur">
        <span className="h-2 w-2 rounded-full bg-rose-500" />
        <span className="text-xs font-semibold uppercase tracking-wide">{channel.mode}</span>
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 flex max-w-[80%] items-center gap-2 rounded-md bg-slate-950/75 px-3 py-2 text-white backdrop-blur">
        <PlayCircle className="h-4 w-4 text-cyan-300" />
        <div className="truncate text-left">
          <p className="truncate text-xs font-bold">{channel.speakerName}</p>
          <p className="truncate text-[11px] text-slate-300">
            {[youtubeEmbedUrl ? "YouTube" : videoLabel, channel.notes].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>
      {videoErrorMessage && (
        <div className="pointer-events-none absolute inset-x-3 top-12 rounded-md border border-rose-300/30 bg-rose-950/85 px-3 py-2 text-xs font-semibold leading-relaxed text-rose-50 backdrop-blur">
          {videoErrorMessage}
        </div>
      )}
    </div>
  );
}
