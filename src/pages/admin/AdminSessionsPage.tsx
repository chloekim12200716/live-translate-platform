import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Link2, Settings2, Upload, Video } from "lucide-react";
import {
  mockDisplayUrls,
  mockPlatformDisplays,
  mockPlatformData,
  mockPlatformLayouts,
  PlatformDisplayTarget
} from "../../data/mockPlatformData";
import {
  deleteStoredPlatformDisplay,
  loadStoredPlatformDisplays,
  saveStoredLayout,
  saveStoredPlatformDisplays
} from "../../data/platformLayoutStorage";
import {
  clearStoredVideoSource,
  loadStoredVideoMetadata,
  PlatformVideoSourceMetadata,
  saveStoredVideoFile,
  saveStoredVideoUrl
} from "../../data/platformVideoStorage";
import LiveAudioTranslationTester from "../../components/platform/LiveAudioTranslationTester";
import LiveSpeechCaptionTester from "../../components/platform/LiveSpeechCaptionTester";

const captionPlayerOptions = {
  languages: ["Arabic", "Chinese", "English", "French", "Korean", "Russian", "Spanish"],
  themes: ["High Contrast", "Terminal", "Notepad", "Default"],
  fontSizes: ["18", "24", "30", "36", "48", "60"],
  fontFamilies: ["Arial", "Courier New", "Helvetica", "Verdana"],
  controls: ["View Transcript", "Show/Hide Header", "Scroll", "Whole Words"]
};

const supportedLanguages = ["ar", "zh", "en", "fr", "ko", "ru", "es"];

interface TranslationErrorLog {
  id: string;
  createdAt: string;
  sourceLang: string;
  targetLang: string;
  model: string;
  message: string;
  sourceTextPreview: string;
}

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "") || "platform";
}

function formatFileSize(size: number | undefined) {
  if (!size) return "";
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminSessionsPage() {
  const [customDisplays, setCustomDisplays] = useState(() => loadStoredPlatformDisplays(mockPlatformData.session.slug));
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newDisplayDescription, setNewDisplayDescription] = useState("");
  const [newTemplateLayoutId, setNewTemplateLayoutId] = useState(mockPlatformData.layout.id);
  const [newDefaultLanguageCode, setNewDefaultLanguageCode] = useState("en");
  const [translationErrors, setTranslationErrors] = useState<TranslationErrorLog[]>([]);
  const [videoMetadata, setVideoMetadata] = useState<PlatformVideoSourceMetadata | null>(() => loadStoredVideoMetadata(mockPlatformData.session.slug));
  const [videoUrlInput, setVideoUrlInput] = useState(() => {
    const metadata = loadStoredVideoMetadata(mockPlatformData.session.slug);
    return metadata?.sourceType === "url" ? metadata.url ?? "" : mockPlatformData.session.videoUrl;
  });
  const [isVideoSaving, setIsVideoSaving] = useState(false);
  const [videoStatusMessage, setVideoStatusMessage] = useState("");
  const allPlatformDisplays = [...mockPlatformDisplays, ...customDisplays];
  const displayUrls = [
    ...mockDisplayUrls,
    ...customDisplays.flatMap((display) =>
      supportedLanguages.map((languageCode) => ({
        displayId: display.id,
        layoutId: display.layoutId,
        sessionSlug: mockPlatformData.session.slug,
        languageCode,
        label: `${display.name} · ${languageCode.toUpperCase()}`,
        path: `/live/${mockPlatformData.session.slug}/${languageCode}?layoutId=${display.layoutId}`
      }))
    )
  ];

  const handleAddPlatformDisplay = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = newDisplayName.trim();
    if (!name) return;

    const templateLayout = mockPlatformLayouts.find((layout) => layout.id === newTemplateLayoutId) ?? mockPlatformData.layout;
    const idSuffix = `${toSlug(name)}-${Date.now()}`;
    const layoutId = `layout-${idSuffix}`;
    const displayId = `display-${idSuffix}`;
    const nextLayout = {
      ...templateLayout,
      id: layoutId,
      name,
      components: templateLayout.components.map((component) => ({ ...component }))
    };
    const nextDisplay: PlatformDisplayTarget = {
      id: displayId,
      sessionId: mockPlatformData.session.id,
      name,
      description: newDisplayDescription.trim() || `${name} 전용 송출 레이아웃`,
      layoutId,
      defaultLanguageCode: newDefaultLanguageCode
    };
    const nextDisplays = [...customDisplays, nextDisplay];

    saveStoredLayout(mockPlatformData.session.slug, nextLayout, layoutId);
    saveStoredPlatformDisplays(mockPlatformData.session.slug, nextDisplays);
    setCustomDisplays(nextDisplays);
    setNewDisplayName("");
    setNewDisplayDescription("");
    setNewTemplateLayoutId(mockPlatformData.layout.id);
    setNewDefaultLanguageCode("en");
  };

  const handleDeletePlatformDisplay = (displayId: string) => {
    deleteStoredPlatformDisplay(mockPlatformData.session.slug, displayId);
    setCustomDisplays(loadStoredPlatformDisplays(mockPlatformData.session.slug));
  };

  const loadTranslationErrors = () => {
    fetch("/api/translation-errors?limit=5")
      .then((response) => response.json())
      .then((data: { errors?: TranslationErrorLog[] }) => setTranslationErrors(data.errors ?? []))
      .catch(() => setTranslationErrors([]));
  };

  useEffect(() => {
    loadTranslationErrors();
    const timer = window.setInterval(loadTranslationErrors, 10000);
    return () => window.clearInterval(timer);
  }, []);

  const handleClearTranslationErrors = () => {
    fetch("/api/translation-errors", { method: "DELETE" })
      .then(() => loadTranslationErrors())
      .catch(() => undefined);
  };

  const handleSaveVideoUrl = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const url = videoUrlInput.trim();
    if (!url) return;

    setIsVideoSaving(true);
    saveStoredVideoUrl(mockPlatformData.session.slug, url)
      .then((metadata) => {
        setVideoMetadata(metadata);
        setVideoStatusMessage("영상 URL이 저장되었습니다.");
      })
      .catch((error: Error) => {
        setVideoStatusMessage(`영상 URL 저장 실패: ${error.message}`);
      })
      .finally(() => setIsVideoSaving(false));
  };

  const handleVideoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsVideoSaving(true);
    saveStoredVideoFile(mockPlatformData.session.slug, file)
      .then((metadata) => {
        setVideoMetadata(metadata);
        setVideoStatusMessage("테스트 영상 파일이 저장되었습니다.");
      })
      .catch((error: Error) => {
        setVideoStatusMessage(`영상 파일 저장 실패: ${error.message}`);
      })
      .finally(() => setIsVideoSaving(false));
  };

  const handleResetVideoSource = () => {
    setIsVideoSaving(true);
    clearStoredVideoSource(mockPlatformData.session.slug)
      .then(() => {
        setVideoMetadata(null);
        setVideoUrlInput(mockPlatformData.session.videoUrl);
        setVideoStatusMessage("기본 샘플 영상으로 복원되었습니다.");
      })
      .catch((error: Error) => {
        setVideoStatusMessage(`영상 소스 초기화 실패: ${error.message}`);
      })
      .finally(() => setIsVideoSaving(false));
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Sessions</p>
        <h2 className="text-2xl font-bold text-slate-900">세션 관리</h2>
        <p className="mt-1 text-sm text-slate-500">{mockPlatformData.event.name}의 기본 세션과 언어별 공개 URL입니다.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-1 gap-4 border-b border-slate-200 p-5 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
            <p className="text-[11px] font-bold uppercase text-slate-400">Event</p>
            <p className="text-sm font-semibold text-slate-900">{mockPlatformData.event.name}</p>
            </div>
            <div>
            <p className="text-[11px] font-bold uppercase text-slate-400">Session</p>
            <p className="text-sm font-semibold text-slate-900">{mockPlatformData.session.title}</p>
            </div>
            <div>
            <p className="text-[11px] font-bold uppercase text-slate-400">Slug</p>
            <p className="font-mono text-sm text-slate-700">{mockPlatformData.session.slug}</p>
            </div>
          </div>
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3">
            <p className="text-[11px] font-black uppercase tracking-wider text-indigo-600">Primary Action</p>
            <p className="mt-1 text-sm font-bold text-slate-900">시청자 화면 레이아웃 편집</p>
            <Link
              to={`/admin/sessions/${mockPlatformData.session.id}/layout`}
              className="mt-3 flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-indigo-700"
            >
              레이아웃 편집 시작
            </Link>
          </div>
        </div>

        <div className="grid gap-2 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {displayUrls.map((displayUrl) => (
            <Link
              key={displayUrl.path}
              to={displayUrl.path}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-indigo-200 hover:bg-indigo-50"
            >
              <p className="text-xs font-bold text-slate-900">{displayUrl.label}</p>
              <p className="mt-1 break-all font-mono text-[11px] text-indigo-600">{displayUrl.path}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-indigo-600" />
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Live Video Test Source</p>
            </div>
            <h3 className="mt-1 text-lg font-bold text-slate-900">테스트 영상 지정</h3>
            <p className="mt-1 text-sm text-slate-500">
              YouTube URL, 직접 재생 가능한 mp4/webm URL, 로컬 영상 파일을 지정하면 `/live` 화면의 Video 컴포넌트에서 재생합니다.
            </p>
          </div>
          <Link
            to={`/live/${mockPlatformData.session.slug}/en`}
            className="rounded-lg bg-slate-950 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
          >
            라이브에서 확인
          </Link>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="space-y-3">
            <form onSubmit={handleSaveVideoUrl} className="flex flex-col gap-2 sm:flex-row">
              <label className="min-w-0 flex-1">
                <span className="sr-only">영상 URL</span>
                <input
                  value={videoUrlInput}
                  onChange={(event) => setVideoUrlInput(event.target.value)}
                  placeholder="https://youtu.be/... 또는 https://.../sample.mp4"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400"
                />
              </label>
              <button
                type="submit"
                disabled={isVideoSaving}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Link2 className="h-3.5 w-3.5" />
                URL 저장
              </button>
            </form>

            <div className="flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">
                <Upload className="h-3.5 w-3.5" />
                로컬 영상 파일 선택
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoFileChange}
                  className="sr-only"
                  disabled={isVideoSaving}
                />
              </label>
              <button
                type="button"
                onClick={handleResetVideoSource}
                disabled={isVideoSaving}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                기본 영상 복원
              </button>
            </div>
            {videoStatusMessage && (
              <p className="text-xs font-semibold text-indigo-700">{videoStatusMessage}</p>
            )}
            <p className="text-xs leading-relaxed text-slate-500">
              YouTube는 iframe embed로 재생합니다. Google Drive 공유 페이지처럼 직접 재생 URL이 아닌 주소는 재생되지 않을 수 있습니다.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Current Source</p>
            <p className="mt-2 text-sm font-bold text-slate-900">
              {videoMetadata?.sourceType === "file"
                ? videoMetadata.fileName
                : videoMetadata?.sourceType === "url"
                  ? "Custom URL"
                  : "Default sample video"}
            </p>
            <p className="mt-1 break-all text-xs text-slate-500">
              {videoMetadata?.sourceType === "file"
                ? `${videoMetadata.fileType || "video"} · ${formatFileSize(videoMetadata.fileSize)}`
                : videoMetadata?.url ?? mockPlatformData.session.videoUrl}
            </p>
          </div>
        </div>
      </div>

      <LiveSpeechCaptionTester
        sessionSlug={mockPlatformData.session.slug}
        defaultSourceLanguageCode={mockPlatformData.session.sourceLanguageCode}
      />

      <LiveAudioTranslationTester
        sessionSlug={mockPlatformData.session.slug}
        defaultSourceLanguageCode={mockPlatformData.session.sourceLanguageCode}
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Output Platforms</p>
            <h3 className="text-lg font-bold text-slate-900">플랫폼별 레이아웃</h3>
            <p className="mt-1 text-sm text-slate-500">
              같은 세션이라도 메인 송출, PPT 중심, 자막 전용, Q&A 포함 화면을 서로 다른 레이아웃으로 관리합니다.
            </p>
          </div>
        </div>

        <form onSubmit={handleAddPlatformDisplay} className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(180px,1fr)_minmax(220px,1.3fr)_180px_140px_auto]">
            <label className="text-xs font-bold text-slate-700">
              플랫폼 이름
              <input
                value={newDisplayName}
                onChange={(event) => setNewDisplayName(event.target.value)}
                placeholder="예: VIP 룸 송출"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-400"
              />
            </label>
            <label className="text-xs font-bold text-slate-700">
              설명
              <input
                value={newDisplayDescription}
                onChange={(event) => setNewDisplayDescription(event.target.value)}
                placeholder="이 화면을 어디에 쓰는지 입력"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-400"
              />
            </label>
            <label className="text-xs font-bold text-slate-700">
              시작 템플릿
              <select
                value={newTemplateLayoutId}
                onChange={(event) => setNewTemplateLayoutId(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-400"
              >
                {mockPlatformLayouts.map((layout) => (
                  <option key={layout.id} value={layout.id}>{layout.name}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-700">
              기본 언어
              <select
                value={newDefaultLanguageCode}
                onChange={(event) => setNewDefaultLanguageCode(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-400"
              >
                {supportedLanguages.map((languageCode) => (
                  <option key={languageCode} value={languageCode}>{languageCode.toUpperCase()}</option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
              >
                플랫폼 추가
              </button>
            </div>
          </div>
        </form>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {allPlatformDisplays.map((display) => {
            const isCustomDisplay = customDisplays.some((customDisplay) => customDisplay.id === display.id);

            return (
            <div key={display.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">{display.name}</p>
                  <p className="mt-1 min-h-10 text-xs leading-relaxed text-slate-500">{display.description}</p>
                </div>
                <Link
                  to={`/admin/sessions/${mockPlatformData.session.id}/layout?layoutId=${display.layoutId}`}
                  className="shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-[11px] font-black text-white shadow-sm hover:bg-indigo-700"
                >
                  편집
                </Link>
              </div>
              <p className="mt-3 font-mono text-[11px] text-indigo-600">{display.layoutId}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  to={`/admin/sessions/${mockPlatformData.session.id}/layout?layoutId=${display.layoutId}`}
                  className="flex-1 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-center text-[11px] font-bold text-indigo-700 hover:bg-indigo-50"
                >
                  전체 편집 화면
                </Link>
                <Link
                  to={`/live/${mockPlatformData.session.slug}/${display.defaultLanguageCode}?layoutId=${display.layoutId}`}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                >
                  미리보기
                </Link>
                {isCustomDisplay && (
                  <button
                    type="button"
                    onClick={() => handleDeletePlatformDisplay(display.id)}
                    className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-[11px] font-bold text-rose-700 hover:bg-rose-50"
                  >
                    삭제
                  </button>
                )}
              </div>
            </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-rose-600">Translation API Logs</p>
            <h3 className="text-lg font-bold text-slate-900">번역 API 통신 오류</h3>
            <p className="mt-1 text-sm text-slate-500">
              Gemini 호출 실패나 timeout이 발생하면 fallback으로 전환하고 여기에 최근 오류를 기록합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClearTranslationErrors}
            disabled={translationErrors.length === 0}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            로그 비우기
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {translationErrors.length === 0 ? (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
              최근 번역 API 통신 오류가 없습니다.
            </div>
          ) : (
            translationErrors.map((error) => (
              <article key={error.id} className="rounded-xl border border-rose-100 bg-rose-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-black text-rose-900">
                    {error.sourceLang.toUpperCase()} → {error.targetLang.toUpperCase()} · {error.model}
                  </p>
                  <time className="text-[11px] font-bold text-rose-700">
                    {new Date(error.createdAt).toLocaleString("ko-KR")}
                  </time>
                </div>
                <p className="mt-2 text-xs font-semibold text-rose-800">{error.message}</p>
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600">{error.sourceTextPreview}</p>
              </article>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Caption Player Configuration</h3>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              StreamText player demo를 참고한 시청자 자막 플레이어 설정 초안입니다.
            </p>
          </div>
          <a
            href="https://www.streamtext.net/player/?event=ihaveadream"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            Reference Demo
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Object.entries(captionPlayerOptions).map(([groupName, values]) => (
            <div key={groupName} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{groupName}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {values.map((value) => (
                  <span
                    key={value}
                    className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700"
                  >
                    {value}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-cyan-100 bg-cyan-50 p-4 text-xs leading-relaxed text-cyan-900">
          현재 구현: `/live/:sessionSlug/:languageCode` 우측 상단 `View Transcript`, 우하단 `Show/Hide Header`, 실시간 demo stream Start/Stop.
          다음 단계에서 이 설정들을 DB 저장 가능한 player preset으로 분리할 수 있습니다.
        </div>
      </div>
    </div>
  );
}
