import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Settings2 } from "lucide-react";
import {
  mockPlatformDisplays,
  mockPlatformData,
  mockPlatformLayouts,
  PlatformDisplayTarget,
  PlatformDisplayUrl
} from "../../data/mockPlatformData";
import {
  deleteStoredPlatformDisplay,
  loadStoredPlatformDisplays,
  saveStoredLayout,
  saveStoredPlatformDisplays
} from "../../data/platformLayoutStorage";
import LiveAudioTranslationTester from "../../components/platform/LiveAudioTranslationTester";

const captionPlayerOptions = {
  languages: ["Arabic", "Chinese", "English", "French", "Korean", "Russian", "Spanish"],
  themes: ["High Contrast", "Terminal", "Notepad", "Default"],
  fontSizes: ["18", "24", "30", "36", "48", "60"],
  fontFamilies: ["Arial", "Courier New", "Helvetica", "Verdana"],
  controls: ["View Transcript", "Show/Hide Header", "Scroll", "Whole Words"]
};

const supportedLanguages = ["ar", "zh", "en", "fr", "ko", "ru", "es"];

const livePreviewLanguages = [
  { code: "en", label: "English" },
  { code: "fr", label: "French" },
  { code: "ko", label: "Korean" }
];

interface TranslationErrorLog {
  id: string;
  createdAt: string;
  sourceLang: string;
  targetLang: string;
  model: string;
  message: string;
  sourceTextPreview: string;
}

interface TranscriptDocumentSummary {
  id: string;
  sessionSlug: string;
  targetLang: string;
  startedAt: string;
  endedAt?: string;
  entries: Array<{ id: string; sequence: number; text: string }>;
  filePath?: string;
}

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "") || "platform";
}

function buildDisplayUrls(display: PlatformDisplayTarget, sessionSlug: string): PlatformDisplayUrl[] {
  return supportedLanguages.map((languageCode) => ({
    displayId: display.id,
    layoutId: display.layoutId,
    sessionSlug,
    languageCode,
    label: `${display.name} · ${languageCode.toUpperCase()}`,
    path: `/live/${sessionSlug}/${languageCode}?layoutId=${display.layoutId}`
  }));
}

export default function AdminSessionsPage() {
  const [customDisplays, setCustomDisplays] = useState(() => loadStoredPlatformDisplays(mockPlatformData.session.slug));
  const [selectedDisplayId, setSelectedDisplayId] = useState(mockPlatformDisplays[0]?.id ?? "");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newDisplayDescription, setNewDisplayDescription] = useState("");
  const [newTemplateLayoutId, setNewTemplateLayoutId] = useState(mockPlatformData.layout.id);
  const [newDefaultLanguageCode, setNewDefaultLanguageCode] = useState("en");
  const [translationErrors, setTranslationErrors] = useState<TranslationErrorLog[]>([]);
  const [transcriptDocuments, setTranscriptDocuments] = useState<TranscriptDocumentSummary[]>([]);
  const allPlatformDisplays = [...mockPlatformDisplays, ...customDisplays];
  const sessionDisplays = allPlatformDisplays.filter((display) => display.sessionId === mockPlatformData.session.id);
  const selectedDisplay = sessionDisplays.find((display) => display.id === selectedDisplayId) ?? sessionDisplays[0];
  const selectedDisplayUrls = selectedDisplay ? buildDisplayUrls(selectedDisplay, mockPlatformData.session.slug) : [];
  const selectedPreviewPath = selectedDisplay
    ? `/live/${mockPlatformData.session.slug}/${selectedDisplay.defaultLanguageCode}?layoutId=${selectedDisplay.layoutId}`
    : `/live/${mockPlatformData.session.slug}/en`;
  const selectedOverlayPath = selectedDisplay
    ? `/live/${mockPlatformData.session.slug}/${selectedDisplay.defaultLanguageCode}?layoutId=${selectedDisplay.layoutId}&overlay=caption`
    : `/live/${mockPlatformData.session.slug}/en?overlay=caption`;

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
    setSelectedDisplayId(nextDisplay.id);
    setNewDisplayName("");
    setNewDisplayDescription("");
    setNewTemplateLayoutId(mockPlatformData.layout.id);
    setNewDefaultLanguageCode("en");
  };

  const handleDeletePlatformDisplay = (displayId: string) => {
    deleteStoredPlatformDisplay(mockPlatformData.session.slug, displayId);
    const nextDisplays = loadStoredPlatformDisplays(mockPlatformData.session.slug);
    setCustomDisplays(nextDisplays);
    if (selectedDisplayId === displayId) {
      setSelectedDisplayId(mockPlatformDisplays[0]?.id ?? nextDisplays[0]?.id ?? "");
    }
  };

  const loadTranslationErrors = () => {
    fetch("/api/translation-errors?limit=5")
      .then((response) => response.json())
      .then((data: { errors?: TranslationErrorLog[] }) => setTranslationErrors(data.errors ?? []))
      .catch(() => setTranslationErrors([]));
  };

  const loadTranscriptDocuments = () => {
    fetch(`/api/captions/transcripts?sessionSlug=${encodeURIComponent(mockPlatformData.session.slug)}&limit=5`)
      .then((response) => response.json())
      .then((data: { documents?: TranscriptDocumentSummary[] }) => setTranscriptDocuments(data.documents ?? []))
      .catch(() => setTranscriptDocuments([]));
  };

  useEffect(() => {
    loadTranslationErrors();
    loadTranscriptDocuments();
    const timer = window.setInterval(loadTranslationErrors, 10000);
    const transcriptTimer = window.setInterval(loadTranscriptDocuments, 10000);
    return () => {
      window.clearInterval(timer);
      window.clearInterval(transcriptTimer);
    };
  }, []);

  const handleClearTranslationErrors = () => {
    fetch("/api/translation-errors", { method: "DELETE" })
      .then(() => loadTranslationErrors())
      .catch(() => undefined);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Channels</p>
        <h2 className="text-2xl font-bold text-slate-900">채널 관리</h2>
        <p className="mt-1 text-sm text-slate-500">{mockPlatformData.event.name}의 송출 채널과 언어별 공개 URL입니다.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Channel Workspace</p>
              <h3 className="mt-1 text-lg font-bold text-slate-900">행사 / 송출 채널</h3>
              <p className="mt-1 text-sm text-slate-500">
                테스트할 송출 채널을 선택하면 URL·레이아웃 편집·실시간 번역 테스트가 해당 채널 기준으로 바뀝니다.
              </p>
            </div>
            <Link
              to={selectedDisplay ? `/admin/channels/${mockPlatformData.session.id}/layout?layoutId=${selectedDisplay.layoutId}` : `/admin/channels/${mockPlatformData.session.id}/layout`}
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-indigo-700"
            >
              선택 채널 레이아웃 편집
            </Link>
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="border-b border-slate-200 bg-slate-50 p-5 lg:border-b-0 lg:border-r">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-bold uppercase text-slate-400">Event</p>
              <p className="mt-1 text-sm font-bold text-slate-900">{mockPlatformData.event.name}</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">{mockPlatformData.event.description}</p>
            </div>

            <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-bold uppercase text-slate-400">Channel</p>
              <p className="mt-1 text-sm font-bold text-slate-900">{mockPlatformData.session.title}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {mockPlatformData.session.speakerName} · {mockPlatformData.session.speakerAffiliation}
              </p>
              <p className="mt-2 font-mono text-[11px] text-indigo-600">{mockPlatformData.session.slug}</p>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Channels</p>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-black text-slate-600">
                  {sessionDisplays.length}
                </span>
              </div>
              <div className="mt-2 space-y-2">
                {sessionDisplays.map((display) => {
                  const isSelected = selectedDisplay?.id === display.id;

                  return (
                    <button
                      key={display.id}
                      type="button"
                      onClick={() => setSelectedDisplayId(display.id)}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        isSelected
                          ? "border-indigo-300 bg-indigo-50 shadow-sm"
                          : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50"
                      }`}
                    >
                      <span className="block text-sm font-bold text-slate-900">{display.name}</span>
                      <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-slate-500">{display.description}</span>
                      <span className="mt-2 block font-mono text-[10px] text-indigo-600">{display.layoutId}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          <section className="p-5">
            {selectedDisplay ? (
              <div className="space-y-5">
                <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wider text-indigo-600">Selected Channel</p>
                      <h3 className="mt-1 text-xl font-bold text-slate-900">{selectedDisplay.name}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">{selectedDisplay.description}</p>
                      <p className="mt-2 font-mono text-[11px] text-indigo-700">{selectedDisplay.layoutId}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={`/admin/channels/${mockPlatformData.session.id}/layout?layoutId=${selectedDisplay.layoutId}`}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-indigo-700"
                      >
                        레이아웃 편집
                      </Link>
                      <Link
                        to={selectedPreviewPath}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-100"
                      >
                        사용자 화면
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                      <Link
                        to={selectedOverlayPath}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-4 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-50"
                      >
                        자막 오버레이
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Language URLs</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {selectedDisplayUrls.map((displayUrl) => (
                      <Link
                        key={displayUrl.path}
                        to={displayUrl.path}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50"
                      >
                        <p className="text-xs font-bold text-slate-900">{displayUrl.languageCode.toUpperCase()} 화면</p>
                        <p className="mt-1 break-all font-mono text-[11px] text-indigo-600">{displayUrl.path}</p>
                      </Link>
                    ))}
                  </div>
                </div>

                <LiveAudioTranslationTester
                  sessionSlug={mockPlatformData.session.slug}
                  layoutId={selectedDisplay.layoutId}
                  displayName={selectedDisplay.name}
                  defaultTargetLanguageCode={selectedDisplay.defaultLanguageCode}
                />
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm font-semibold text-slate-600">
                이 행사에 연결된 송출 채널이 없습니다. 아래에서 채널을 추가하세요.
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Transcript Documents</p>
            <h3 className="text-lg font-bold text-slate-900">채널별 최종 번역 문서</h3>
            <p className="mt-1 text-sm text-slate-500">
              Live Audio 캡처가 종료될 때 최종 문장 단위 번역을 서버 문서로 저장합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={loadTranscriptDocuments}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            새로고침
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {transcriptDocuments.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
              아직 저장된 transcript 문서가 없습니다. Live Audio 캡처를 종료하면 최종 번역 문서가 생성됩니다.
            </div>
          ) : (
            transcriptDocuments.map((document) => (
              <article key={document.id} className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-black text-emerald-900">
                    {document.sessionSlug} · {document.targetLang.toUpperCase()} · {document.entries.length} sentences
                  </p>
                  <time className="text-[11px] font-bold text-emerald-700">
                    {new Date(document.endedAt ?? document.startedAt).toLocaleString("ko-KR")}
                  </time>
                </div>
                {document.filePath && (
                  <p className="mt-2 break-all font-mono text-[11px] text-emerald-800">{document.filePath}</p>
                )}
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-700">
                  {document.entries.at(-1)?.text ?? "저장된 문장이 없습니다."}
                </p>
              </article>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Viewer Verification</p>
            <h3 className="text-lg font-bold text-slate-900">언어별 사용자 화면 확인</h3>
            <p className="mt-1 text-sm text-slate-500">
              선택한 채널의 레이아웃으로 WebSocket Live Audio 테스트에서 publish된 자막이 실제 사용자 URL에 표시되는지 확인합니다.
            </p>
          </div>
          <Link
            to={selectedPreviewPath}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
          >
            기본 사용자 탭 열기
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          {livePreviewLanguages.map((language) => {
            const livePath = selectedDisplay
              ? `/live/${mockPlatformData.session.slug}/${language.code}?layoutId=${selectedDisplay.layoutId}`
              : `/live/${mockPlatformData.session.slug}/${language.code}`;

            return (
              <article key={language.code} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{language.label}</p>
                    <p className="font-mono text-[11px] text-indigo-600">{livePath}</p>
                  </div>
                  <Link
                    to={livePath}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                  >
                    사용자 탭
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
                <div className="aspect-video bg-slate-950">
                  <iframe
                    src={livePath}
                    title={`${language.label} viewer preview`}
                    className="h-full w-full border-0"
                  />
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Output Channels</p>
            <h3 className="text-lg font-bold text-slate-900">채널별 레이아웃</h3>
            <p className="mt-1 text-sm text-slate-500">
              메인 송출, PPT 중심, 자막 전용, Q&A 포함 화면을 서로 다른 채널과 레이아웃으로 관리합니다.
            </p>
          </div>
        </div>

        <form onSubmit={handleAddPlatformDisplay} className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(180px,1fr)_minmax(220px,1.3fr)_180px_140px_auto]">
            <label className="text-xs font-bold text-slate-700">
              채널 이름
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
                채널 추가
              </button>
            </div>
          </div>
        </form>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {allPlatformDisplays.map((display) => {
            const isCustomDisplay = customDisplays.some((customDisplay) => customDisplay.id === display.id);
            const isSelected = selectedDisplay?.id === display.id;

            return (
            <div
              key={display.id}
              className={`rounded-xl border p-4 ${
                isSelected ? "border-indigo-300 bg-indigo-50 shadow-sm" : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">{display.name}</p>
                  <p className="mt-1 min-h-10 text-xs leading-relaxed text-slate-500">{display.description}</p>
                </div>
                <Link
                  to={`/admin/channels/${mockPlatformData.session.id}/layout?layoutId=${display.layoutId}`}
                  className="shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-[11px] font-black text-white shadow-sm hover:bg-indigo-700"
                >
                  편집
                </Link>
              </div>
              <p className="mt-3 font-mono text-[11px] text-indigo-600">{display.layoutId}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDisplayId(display.id)}
                  className={`flex-1 rounded-lg px-3 py-2 text-center text-[11px] font-bold ${
                    isSelected
                      ? "bg-indigo-600 text-white"
                      : "border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50"
                  }`}
                >
                  {isSelected ? "테스트 중" : "테스트 선택"}
                </button>
                <Link
                  to={`/admin/channels/${mockPlatformData.session.id}/layout?layoutId=${display.layoutId}`}
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
          현재 구현: `/live/:channelSlug/:languageCode` 우측 상단 `View Transcript`, 우하단 `Show/Hide Header`, 실시간 demo stream Start/Stop.
          다음 단계에서 이 설정들을 DB 저장 가능한 player preset으로 분리할 수 있습니다.
        </div>
      </div>
    </div>
  );
}
