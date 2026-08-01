import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Plus, Settings2, Trash2 } from "lucide-react";
import {
  defaultCaptionStyle,
  mockPlatformChannel,
  mockPlatformChannels,
  mockPlatformDisplays,
  mockPlatformLayout,
  mockPlatformLayouts,
  PlatformChannel,
  PlatformDisplayTarget,
  PlatformDisplayUrl,
  PlatformLayout
} from "../../data/mockPlatformData";
import {
  deleteStoredPlatformChannel,
  deleteStoredPlatformDisplay,
  loadStoredPlatformChannels,
  loadStoredPlatformDisplays,
  saveStoredLayout,
  saveStoredPlatformChannels,
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
  channelSlug?: string;
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
    .replace(/^-+|-+$/g, "") || "channel";
}

function buildDisplayUrls(display: PlatformDisplayTarget, channelSlug: string): PlatformDisplayUrl[] {
  return supportedLanguages.map((languageCode) => ({
    displayId: display.id,
    layoutId: display.layoutId,
    channelSlug,
    languageCode,
    label: `${display.name} · ${languageCode.toUpperCase()}`,
    path: `/live/${channelSlug}/${languageCode}?layoutId=${display.layoutId}`
  }));
}

function createDefaultChannelLayout(channel: PlatformChannel): PlatformLayout {
  return {
    ...mockPlatformLayout,
    id: `layout-${channel.slug}-caption`,
    channelId: channel.id,
    name: `${channel.title} Caption Stage`,
    components: [
      { id: "component-caption", type: "caption", label: "Caption", x: 3, y: 8, w: 18, h: 4, visible: true, zIndex: 3, captionStyle: { ...defaultCaptionStyle } },
      { id: "component-notice", type: "notice", label: "Notice", x: 4, y: 12, w: 16, h: 2, visible: true, zIndex: 2 }
    ]
  };
}

function createDefaultDisplay(channel: PlatformChannel, layoutId: string): PlatformDisplayTarget {
  return {
    id: `${channel.slug}-caption-display`,
    channelId: channel.id,
    name: `${channel.title} 자막 송출`,
    description: `${channel.title}의 기본 언어별 자막 오버레이 화면`,
    layoutId,
    defaultLanguageCode: "ko"
  };
}

function mergeStoredLayouts(channelSlug: string, displays: PlatformDisplayTarget[]) {
  const storedLayouts = displays
    .map((display) => {
      try {
        return JSON.parse(window.localStorage.getItem(`layout:${channelSlug}:${display.layoutId}`) ?? "null") as PlatformLayout | null;
      } catch {
        return null;
      }
    })
    .filter((layout): layout is PlatformLayout => Boolean(layout));

  return [
    ...mockPlatformLayouts,
    ...storedLayouts.filter((storedLayout) => !mockPlatformLayouts.some((layout) => layout.id === storedLayout.id))
  ];
}

export default function AdminChannelsPage() {
  const [customChannels, setCustomChannels] = useState(() => loadStoredPlatformChannels());
  const allChannels = [...mockPlatformChannels, ...customChannels];
  const [selectedChannelId, setSelectedChannelId] = useState(mockPlatformChannel.id);
  const selectedChannel = allChannels.find((channel) => channel.id === selectedChannelId) ?? allChannels[0] ?? mockPlatformChannel;
  const [customDisplays, setCustomDisplays] = useState(() => loadStoredPlatformDisplays(selectedChannel.slug));
  const [selectedDisplayId, setSelectedDisplayId] = useState("");
  const [newChannelTitle, setNewChannelTitle] = useState("");
  const [newChannelSlug, setNewChannelSlug] = useState("");
  const [newSpeakerName, setNewSpeakerName] = useState("");
  const [newChannelNotes, setNewChannelNotes] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newDisplayDescription, setNewDisplayDescription] = useState("");
  const [newTemplateLayoutId, setNewTemplateLayoutId] = useState(mockPlatformLayout.id);
  const [newDefaultLanguageCode, setNewDefaultLanguageCode] = useState("ko");
  const [translationErrors, setTranslationErrors] = useState<TranslationErrorLog[]>([]);
  const [transcriptDocuments, setTranscriptDocuments] = useState<TranscriptDocumentSummary[]>([]);
  const mockDisplaysForChannel = mockPlatformDisplays.filter((display) => display.channelId === selectedChannel.id);
  const allPlatformDisplays = [...mockDisplaysForChannel, ...customDisplays];
  const selectedDisplay = allPlatformDisplays.find((display) => display.id === selectedDisplayId) ?? allPlatformDisplays[0];
  const selectedDisplayUrls = selectedDisplay ? buildDisplayUrls(selectedDisplay, selectedChannel.slug) : [];
  const selectedPreviewPath = selectedDisplay
    ? `/live/${selectedChannel.slug}/${selectedDisplay.defaultLanguageCode}?layoutId=${selectedDisplay.layoutId}`
    : `/live/${selectedChannel.slug}/ko`;
  const selectedFullPreviewPath = selectedDisplay
    ? `/live/${selectedChannel.slug}/${selectedDisplay.defaultLanguageCode}?layoutId=${selectedDisplay.layoutId}&view=full`
    : `/live/${selectedChannel.slug}/ko?view=full`;
  const availableTemplateLayouts = mergeStoredLayouts(selectedChannel.slug, allPlatformDisplays)
    .filter((layout) => layout.channelId === selectedChannel.id || layout.channelId === mockPlatformChannel.id);

  useEffect(() => {
    const nextDisplays = loadStoredPlatformDisplays(selectedChannel.slug);
    setCustomDisplays(nextDisplays);
    setSelectedDisplayId("");
  }, [selectedChannel.slug]);

  const loadTranslationErrors = () => {
    fetch("/api/translation-errors?limit=5")
      .then((response) => response.json())
      .then((data: { errors?: TranslationErrorLog[] }) => setTranslationErrors(data.errors ?? []))
      .catch(() => setTranslationErrors([]));
  };

  const loadTranscriptDocuments = () => {
    fetch(`/api/captions/transcripts?channelSlug=${encodeURIComponent(selectedChannel.slug)}&limit=5`)
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
  }, [selectedChannel.slug]);

  const handleAddChannel = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const title = newChannelTitle.trim();
    if (!title) return;

    const slug = toSlug(newChannelSlug || title);
    if (allChannels.some((channel) => channel.slug === slug || channel.id === slug)) return;

    const nextChannel: PlatformChannel = {
      id: slug,
      title,
      slug,
      speakerName: newSpeakerName.trim() || "Speaker",
      notes: newChannelNotes.trim(),
      sourceLanguageCode: "auto",
      videoUrl: mockPlatformChannel.videoUrl,
      sampleCaptionText: `${title}의 실시간 자막 테스트 문장입니다.`,
      mode: "live",
      slides: []
    };
    const defaultLayout = createDefaultChannelLayout(nextChannel);
    const defaultDisplay = createDefaultDisplay(nextChannel, defaultLayout.id);
    const nextChannels = [...customChannels, nextChannel];

    saveStoredPlatformChannels(nextChannels);
    saveStoredLayout(nextChannel.slug, defaultLayout, defaultLayout.id);
    saveStoredPlatformDisplays(nextChannel.slug, [defaultDisplay]);
    setCustomChannels(nextChannels);
    setSelectedChannelId(nextChannel.id);
    setNewChannelTitle("");
    setNewChannelSlug("");
    setNewSpeakerName("");
    setNewChannelNotes("");
  };

  const handleDeleteChannel = (channelId: string) => {
    const channel = customChannels.find((customChannel) => customChannel.id === channelId);
    if (!channel) return;

    deleteStoredPlatformChannel(channel.id);
    saveStoredPlatformDisplays(channel.slug, []);
    const nextChannels = loadStoredPlatformChannels();
    setCustomChannels(nextChannels);
    setSelectedChannelId(mockPlatformChannel.id);
  };

  const handleAddPlatformDisplay = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = newDisplayName.trim();
    if (!name) return;

    const templateLayout = availableTemplateLayouts.find((layout) => layout.id === newTemplateLayoutId) ?? mockPlatformLayout;
    const idSuffix = `${toSlug(name)}-${Date.now()}`;
    const layoutId = `layout-${selectedChannel.slug}-${idSuffix}`;
    const displayId = `display-${selectedChannel.slug}-${idSuffix}`;
    const nextLayout = {
      ...templateLayout,
      id: layoutId,
      name,
      channelId: selectedChannel.id,
      components: templateLayout.components.map((component) => ({ ...component }))
    };
    const nextDisplay: PlatformDisplayTarget = {
      id: displayId,
      channelId: selectedChannel.id,
      name,
      description: newDisplayDescription.trim() || `${name} 전용 송출 레이아웃`,
      layoutId,
      defaultLanguageCode: newDefaultLanguageCode
    };
    const nextDisplays = [...customDisplays, nextDisplay];

    saveStoredLayout(selectedChannel.slug, nextLayout, layoutId);
    saveStoredPlatformDisplays(selectedChannel.slug, nextDisplays);
    setCustomDisplays(nextDisplays);
    setSelectedDisplayId(nextDisplay.id);
    setNewDisplayName("");
    setNewDisplayDescription("");
    setNewTemplateLayoutId(mockPlatformLayout.id);
    setNewDefaultLanguageCode("ko");
  };

  const handleDeletePlatformDisplay = (displayId: string) => {
    deleteStoredPlatformDisplay(selectedChannel.slug, displayId);
    const nextDisplays = loadStoredPlatformDisplays(selectedChannel.slug);
    setCustomDisplays(nextDisplays);
    if (selectedDisplayId === displayId) {
      setSelectedDisplayId(mockDisplaysForChannel[0]?.id ?? nextDisplays[0]?.id ?? "");
    }
  };

  const handleClearTranslationErrors = () => {
    fetch("/api/translation-errors", { method: "DELETE" })
      .then(() => loadTranslationErrors())
      .catch(() => undefined);
  };

  const handleOpenAllLanguageUrls = () => {
    selectedDisplayUrls.forEach((displayUrl) => {
      window.open(displayUrl.path, "_blank", "noopener,noreferrer");
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Channels</p>
        <h2 className="text-2xl font-bold text-slate-900">동시 송출 채널 관리</h2>
        <p className="mt-1 text-sm text-slate-500">
          동시에 운영할 실시간 채널을 선택하고, 채널별 레이아웃·언어 URL·번역 테스트를 관리합니다.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Live Channels</p>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600">{allChannels.length}</span>
            </div>
            <div className="mt-3 space-y-2">
              {allChannels.map((channel) => {
                const isSelected = selectedChannel.id === channel.id;
                const isCustom = customChannels.some((customChannel) => customChannel.id === channel.id);

                return (
                  <div
                    key={channel.id}
                    className={`rounded-xl border p-3 transition ${
                      isSelected ? "border-indigo-300 bg-indigo-50 shadow-sm" : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedChannelId(channel.id)}
                      className="w-full text-left"
                    >
                      <span className="block text-sm font-black text-slate-900">{channel.title}</span>
                      <span className="mt-1 block text-xs font-semibold text-slate-500">
                        {channel.speakerName}
                      </span>
                      {channel.notes && (
                        <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-slate-500">{channel.notes}</span>
                      )}
                      <span className="mt-2 block font-mono text-[10px] text-indigo-600">/live/{channel.slug}/ko</span>
                    </button>
                    {isCustom && (
                      <button
                        type="button"
                        onClick={() => handleDeleteChannel(channel.id)}
                        className="mt-3 inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3 w-3" />
                        채널 삭제
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleAddChannel} className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-indigo-600" />
              <h3 className="text-sm font-black text-slate-900">새 실시간 채널 추가</h3>
            </div>
            <div className="mt-3 space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                채널명
                <input
                  value={newChannelTitle}
                  onChange={(event) => setNewChannelTitle(event.target.value)}
                  placeholder="예: 실시간 위성 심포지엄 채널"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-400"
                />
              </label>
              <label className="block text-xs font-bold text-slate-700">
                URL slug
                <input
                  value={newChannelSlug}
                  onChange={(event) => setNewChannelSlug(event.target.value)}
                  placeholder="비우면 채널명으로 자동 생성"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-400"
                />
              </label>
              <label className="block text-xs font-bold text-slate-700">
                발표자
                <input
                  value={newSpeakerName}
                  onChange={(event) => setNewSpeakerName(event.target.value)}
                  placeholder="예: Dr. Kim"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-400"
                />
              </label>
              <label className="block text-xs font-bold text-slate-700">
                비고
                <input
                  value={newChannelNotes}
                  onChange={(event) => setNewChannelNotes(event.target.value)}
                  placeholder="예: 2층 A홀, 기자단 전용, 내부 테스트"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-400"
                />
              </label>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-black text-white hover:bg-indigo-700"
              >
                <Plus className="h-3.5 w-3.5" />
                채널 추가
              </button>
            </div>
          </form>
        </aside>

        <main className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-indigo-600">Selected Channel</p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">{selectedChannel.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  {selectedChannel.speakerName}
                </p>
                {selectedChannel.notes && (
                  <p className="mt-1 text-sm leading-relaxed text-slate-500">{selectedChannel.notes}</p>
                )}
                <p className="mt-2 font-mono text-[11px] text-indigo-700">/live/{selectedChannel.slug}/:languageCode</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  to={selectedDisplay ? `/admin/channels/${selectedChannel.id}/layout?layoutId=${selectedDisplay.layoutId}` : `/admin/channels/${selectedChannel.id}/layout`}
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
                  자막 화면
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
                <Link
                  to={selectedFullPreviewPath}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-100"
                >
                  전체 화면
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Layouts</p>
                <h3 className="text-lg font-bold text-slate-900">선택 채널의 화면 구성</h3>
                <p className="mt-1 text-sm text-slate-500">
                  한 채널 안에서도 자막 전용, 전체 화면, 현장 스크린용 등 여러 레이아웃을 만들 수 있습니다.
                </p>
              </div>
            </div>

            <form onSubmit={handleAddPlatformDisplay} className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
              <div className="grid gap-3 lg:grid-cols-[minmax(180px,1fr)_minmax(220px,1.3fr)_180px_140px_auto]">
                <label className="text-xs font-bold text-slate-700">
                  레이아웃 이름
                  <input
                    value={newDisplayName}
                    onChange={(event) => setNewDisplayName(event.target.value)}
                    placeholder="예: 로비 자막 송출"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-400"
                  />
                </label>
                <label className="text-xs font-bold text-slate-700">
                  설명
                  <input
                    value={newDisplayDescription}
                    onChange={(event) => setNewDisplayDescription(event.target.value)}
                    placeholder="이 레이아웃을 어디에 쓰는지 입력"
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
                    {availableTemplateLayouts.map((layout) => (
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
                    레이아웃 추가
                  </button>
                </div>
              </div>
            </form>

            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                        to={`/admin/channels/${selectedChannel.id}/layout?layoutId=${display.layoutId}`}
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
                        to={`/live/${selectedChannel.slug}/${display.defaultLanguageCode}?layoutId=${display.layoutId}`}
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
          </section>

          {selectedDisplay && (
            <>
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Language URLs</p>
                    <p className="mt-1 text-sm text-slate-500">
                      아래 URL은 기본적으로 투명 자막 오버레이와 통역 음성 버튼을 함께 제공합니다. 전체 레이아웃 검토는 `view=full`, 버튼 없는 캡처는 `audio=0`을 붙여 확인합니다.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenAllLanguageUrls}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-4 py-2 text-xs font-black text-white hover:bg-slate-800"
                  >
                    모든 언어 열기
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {selectedDisplayUrls.map((displayUrl) => (
                    <Link
                      key={displayUrl.path}
                      to={displayUrl.path}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-bold text-slate-900">{displayUrl.languageCode.toUpperCase()} 라이브 URL</p>
                        <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                      </div>
                      <p className="mt-1 break-all font-mono text-[11px] text-indigo-600">{displayUrl.path}</p>
                      <p className="mt-2 text-[11px] font-semibold text-slate-500">자막 표시 + 통역 음성 버튼</p>
                    </Link>
                  ))}
                </div>
              </section>

              <LiveAudioTranslationTester
                channelSlug={selectedChannel.slug}
                displayName={`${selectedChannel.title} · ${selectedDisplay.name}`}
              />
            </>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Transcript Documents</p>
                <h3 className="text-lg font-bold text-slate-900">선택 채널 최종 번역 문서</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Live Audio 캡처가 종료될 때 최종 문장 단위 번역을 채널별 서버 문서로 저장합니다.
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
                        {document.channelSlug} · {document.targetLang.toUpperCase()} · {document.entries.length} sentences
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
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
              현재 구현: `/live/:channelSlug/:languageCode`는 투명 자막 오버레이로 열리고, 전체 레이아웃 검토용 `?view=full`에서 `View Transcript`, `Show/Hide Header`, demo stream Start/Stop을 사용할 수 있습니다.
              다음 단계에서 이 설정들을 DB 저장 가능한 player preset으로 분리할 수 있습니다.
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
