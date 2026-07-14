import React, { ReactNode, useEffect, useRef, useState } from "react";
import {
  BrowserRouter,
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useParams
} from "react-router-dom";
import { BrainCircuit, Grid3X3, Layers, Settings, Trash2, Tv } from "lucide-react";
import AdminCMS from "./components/AdminCMS";
import DisplayRenderer from "./components/platform/DisplayRenderer";
import QAPanel from "./components/QAPanel";
import TranscriptSidebar from "./components/TranscriptSidebar";
import VideoPlayer from "./components/VideoPlayer";
import {
  mockDisplayUrls,
  mockPlatformData,
  mockPlatformLayout,
  mockPlatformSession,
  PlatformComponentType,
  PlatformLayout,
  PlatformLayoutComponent
} from "./data/mockPlatformData";
import {
  clearStoredLayout,
  loadStoredLayout,
  saveStoredLayout
} from "./data/platformLayoutStorage";
import { AppState, DictionaryItem } from "./types";

const componentTypeOptions: PlatformComponentType[] = ["video", "slide", "caption", "qa", "notice"];
const backgroundFitOptions: PlatformLayout["backgroundFit"][] = ["cover", "contain", "fill"];
const layoutUnitStep = 0.25;

interface AppDataContext {
  appState: AppState;
  dictionary: DictionaryItem[];
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
  updateServerState: (updates: Partial<AppState>) => Promise<void>;
  fetchState: () => Promise<void>;
  fetchDictionary: () => Promise<void>;
  handleAddQA: (text: string, user: string) => Promise<void>;
  handleAnswerQA: (id: string, answer: string) => Promise<void>;
  handleAddBookmark: (title: string) => Promise<void>;
  handleDeleteBookmark: (id: string) => Promise<void>;
  handleAddNote: (text: string) => Promise<void>;
  handleDeleteNote: (id: string) => Promise<void>;
}

function navClass({ isActive }: { isActive: boolean }) {
  return `px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
    isActive ? "bg-indigo-600 text-white shadow-md" : "text-slate-300 hover:text-white"
  }`;
}

function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col antialiased">
      <header className="bg-slate-900 text-white shadow-md border-b border-slate-800 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 flex-shrink-0 z-20">
        <Link to="/" className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-600/30">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div className="text-left">
            <h1 className="text-md font-extrabold tracking-tight flex items-center gap-2">
              MediCast CC <span className="text-[10px] bg-indigo-500/30 text-indigo-300 font-semibold px-2 py-0.5 rounded-full uppercase">AI-Powered</span>
            </h1>
            <p className="text-xs text-slate-400">의학행사 실시간 자막·통역 하이브리드 미디어 플랫폼</p>
          </div>
        </Link>

        <nav className="flex bg-slate-800 p-1 rounded-xl border border-slate-700/50">
          <NavLink to="/demo" className={navClass}>
            <Layers className="w-3.5 h-3.5" />
            통합 데모
          </NavLink>
          <NavLink to="/admin" end className={navClass}>
            <Settings className="w-3.5 h-3.5" />
            관리자
          </NavLink>
          <NavLink to="/admin/sessions" className={navClass}>
            <Grid3X3 className="w-3.5 h-3.5" />
            세션
          </NavLink>
          <NavLink to={`/live/${mockPlatformSession.slug}/en`} className={navClass}>
            <Tv className="w-3.5 h-3.5" />
            Live
          </NavLink>
        </nav>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 space-y-6">{children}</main>

      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-6 text-center text-xs mt-auto flex-shrink-0">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>MediCast Core System - AI 실시간 의학행사 자막·통역 플랫폼 v2.4</span>
          </div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-slate-200 transition">서비스 이용 약관</a>
            <span className="text-slate-700">|</span>
            <a href="#" className="hover:text-slate-200 transition">개인정보 처리방침</a>
            <span className="text-slate-700">|</span>
            <span className="font-mono text-slate-500">Powered by Gemini 3.5 Flash & Antigravity</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function DemoPage({
  appState,
  dictionary,
  playbackSpeed,
  setPlaybackSpeed,
  updateServerState,
  handleAddQA,
  handleAnswerQA,
  handleAddBookmark,
  handleDeleteBookmark,
  handleAddNote,
  handleDeleteNote,
  fetchDictionary
}: AppDataContext) {
  return (
    <div className="space-y-6">
      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-start gap-3.5 text-left text-xs text-indigo-950 shadow-sm">
        <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600 flex-shrink-0">
          <Layers className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold">심포지엄 통합 듀얼 데모 안내</h3>
          <p className="text-indigo-900/90 leading-relaxed">
            기존 AI Studio 데모를 유지한 화면입니다. 운영 플랫폼용 공개 시청자 화면은 <Link className="font-bold text-indigo-700 underline" to={`/live/${mockPlatformSession.slug}/en`}>/live/{mockPlatformSession.slug}/en</Link> 경로에서 확인할 수 있습니다.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <VideoPlayer
            currentVideoTime={appState.currentVideoTime}
            setCurrentVideoTime={(time) => updateServerState({ currentVideoTime: time })}
            playbackSpeed={playbackSpeed}
            setPlaybackSpeed={setPlaybackSpeed}
            subtitles={appState.subtitles}
            dictionary={dictionary}
            layout={appState.layout}
            setLayout={(layout) => updateServerState({ layout })}
            sessionMode={appState.sessionMode}
          />

          <QAPanel
            qaList={appState.qaList}
            onAddQA={handleAddQA}
            onAnswerQA={handleAnswerQA}
            isAdmin={true}
          />
        </div>

        <div className="lg:col-span-5 space-y-6">
          <TranscriptSidebar
            subtitles={appState.subtitles}
            bookmarks={appState.bookmarks}
            notes={appState.notes}
            currentVideoTime={appState.currentVideoTime}
            setCurrentVideoTime={(time) => updateServerState({ currentVideoTime: time })}
            onAddBookmark={handleAddBookmark}
            onDeleteBookmark={handleDeleteBookmark}
            onAddNote={handleAddNote}
            onDeleteNote={handleDeleteNote}
          />

          <AdminCMS
            appState={appState}
            dictionary={dictionary}
            onUpdateState={updateServerState}
            onRefreshDictionary={fetchDictionary}
            currentVideoTime={appState.currentVideoTime}
          />
        </div>
      </div>
    </div>
  );
}

function AdminPage({
  appState,
  dictionary,
  updateServerState,
  fetchDictionary,
  handleAddQA,
  handleAnswerQA
}: AppDataContext) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Admin</p>
          <h2 className="text-2xl font-bold text-slate-900">관리자 콘솔</h2>
        </div>
        <Link
          to="/admin/sessions"
          className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
        >
          세션 관리로 이동
        </Link>
      </div>

      <AdminCMS
        appState={appState}
        dictionary={dictionary}
        onUpdateState={updateServerState}
        onRefreshDictionary={fetchDictionary}
        currentVideoTime={appState.currentVideoTime}
      />

      <QAPanel
        qaList={appState.qaList}
        onAddQA={handleAddQA}
        onAnswerQA={handleAnswerQA}
        isAdmin={true}
      />
    </div>
  );
}

function AdminSessionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Sessions</p>
        <h2 className="text-2xl font-bold text-slate-900">세션 관리</h2>
        <p className="mt-1 text-sm text-slate-500">{mockPlatformData.event.name}의 기본 세션과 언어별 공개 URL입니다.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-1 gap-4 border-b border-slate-200 p-5 md:grid-cols-4">
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
          <div className="flex items-end">
            <Link
              to={`/admin/sessions/${mockPlatformData.session.id}/layout`}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
            >
              레이아웃 편집
            </Link>
          </div>
        </div>

        <div className="grid gap-2 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {mockDisplayUrls.map((displayUrl) => (
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
    </div>
  );
}

function clampGridValue(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Number(Math.min(Math.max(value, min), max).toFixed(2));
}

function snapLayoutUnit(value: number) {
  return Number((Math.round(value / layoutUnitStep) * layoutUnitStep).toFixed(2));
}

function getComponentFrameStyle(component: PlatformLayoutComponent, layout: PlatformLayout) {
  return {
    left: `${((component.x - 1) / layout.columns) * 100}%`,
    top: `${((component.y - 1) / layout.rows) * 100}%`,
    width: `${(component.w / layout.columns) * 100}%`,
    height: `${(component.h / layout.rows) * 100}%`
  };
}

function componentDisplayName(type: PlatformComponentType) {
  switch (type) {
    case "video":
      return "Video";
    case "slide":
      return "Slide";
    case "caption":
      return "Caption";
    case "qa":
      return "Q&A";
    case "notice":
      return "Notice";
    default:
      return type;
  }
}

function getDefaultComponentSize(type: PlatformComponentType) {
  switch (type) {
    case "video":
      return { w: 8, h: 5 };
    case "slide":
      return { w: 8, h: 5 };
    case "caption":
      return { w: 12, h: 2 };
    case "qa":
      return { w: 5, h: 4 };
    case "notice":
      return { w: 10, h: 2 };
    default:
      return { w: 6, h: 3 };
  }
}

function getBackgroundSize(fit: PlatformLayout["backgroundFit"]) {
  if (fit === "fill") return "100% 100%";
  return fit;
}

function SessionLayoutEditorPage() {
  const { sessionId } = useParams();
  const isKnownSession = sessionId === mockPlatformSession.id;
  const [layout, setLayout] = useState(() => loadStoredLayout(mockPlatformSession.slug, mockPlatformLayout));
  const [selectedComponentId, setSelectedComponentId] = useState(layout.components[0]?.id ?? "");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [isBackgroundDragActive, setIsBackgroundDragActive] = useState(false);
  const [draggingComponentId, setDraggingComponentId] = useState<string | null>(null);
  const [resizingComponentId, setResizingComponentId] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    componentId: string;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    cellWidth: number;
    cellHeight: number;
  } | null>(null);
  const resizeStateRef = useRef<{
    componentId: string;
    startClientX: number;
    startClientY: number;
    startW: number;
    startH: number;
    componentX: number;
    componentY: number;
    cellWidth: number;
    cellHeight: number;
  } | null>(null);
  const selectedComponent = layout.components.find((component) => component.id === selectedComponentId) ?? layout.components[0];

  const updateComponent = (componentId: string, updates: Partial<PlatformLayoutComponent>) => {
    setLayout((currentLayout) => {
      const updatedComponents = currentLayout.components.map((component) => {
        if (component.id !== componentId) return component;

        const nextComponent = { ...component, ...updates };
        const nextX = snapLayoutUnit(clampGridValue(nextComponent.x, 1, currentLayout.columns));
        const nextY = snapLayoutUnit(clampGridValue(nextComponent.y, 1, currentLayout.rows));
        const nextW = snapLayoutUnit(clampGridValue(nextComponent.w, layoutUnitStep, currentLayout.columns - nextX + 1));
        const nextH = snapLayoutUnit(clampGridValue(nextComponent.h, layoutUnitStep, currentLayout.rows - nextY + 1));

        return {
          ...nextComponent,
          x: nextX,
          y: nextY,
          w: nextW,
          h: nextH,
          label: updates.type ? componentDisplayName(updates.type) : nextComponent.label
        };
      });

      return { ...currentLayout, components: updatedComponents };
    });
  };

  const updateSelectedComponent = (updates: Partial<PlatformLayoutComponent>) => {
    if (!selectedComponent) return;
    updateComponent(selectedComponent.id, updates);
  };

  useEffect(() => {
    if (!draggingComponentId) return;

    const handlePointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState) return;

      const deltaX = snapLayoutUnit((event.clientX - dragState.startClientX) / dragState.cellWidth);
      const deltaY = snapLayoutUnit((event.clientY - dragState.startClientY) / dragState.cellHeight);

      setLayout((currentLayout) => ({
        ...currentLayout,
        components: currentLayout.components.map((component) => {
          if (component.id !== dragState.componentId) return component;

          return {
            ...component,
            x: snapLayoutUnit(clampGridValue(dragState.startX + deltaX, 1, currentLayout.columns - component.w + 1)),
            y: snapLayoutUnit(clampGridValue(dragState.startY + deltaY, 1, currentLayout.rows - component.h + 1))
          };
        })
      }));
    };

    const handlePointerUp = () => {
      dragStateRef.current = null;
      setDraggingComponentId(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [draggingComponentId]);

  useEffect(() => {
    if (!resizingComponentId) return;

    const handlePointerMove = (event: PointerEvent) => {
      const resizeState = resizeStateRef.current;
      if (!resizeState) return;

      const deltaW = snapLayoutUnit((event.clientX - resizeState.startClientX) / resizeState.cellWidth);
      const deltaH = snapLayoutUnit((event.clientY - resizeState.startClientY) / resizeState.cellHeight);

      setLayout((currentLayout) => ({
        ...currentLayout,
        components: currentLayout.components.map((component) => {
          if (component.id !== resizeState.componentId) return component;

          return {
            ...component,
            w: snapLayoutUnit(clampGridValue(resizeState.startW + deltaW, layoutUnitStep, currentLayout.columns - resizeState.componentX + 1)),
            h: snapLayoutUnit(clampGridValue(resizeState.startH + deltaH, layoutUnitStep, currentLayout.rows - resizeState.componentY + 1))
          };
        })
      }));
    };

    const handlePointerUp = () => {
      resizeStateRef.current = null;
      setResizingComponentId(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [resizingComponentId]);

  const handleStartDrag = (event: React.PointerEvent<HTMLDivElement>, component: PlatformLayoutComponent) => {
    if (event.button !== 0) return;

    const gridRect = gridRef.current?.getBoundingClientRect();
    if (!gridRect) return;

    const cellWidth = gridRect.width / layout.columns;
    const cellHeight = gridRect.height / layout.rows;
    if (!cellWidth || !cellHeight) return;

    event.currentTarget.focus({ preventScroll: true });
    event.preventDefault();
    setSelectedComponentId(component.id);
    dragStateRef.current = {
      componentId: component.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: component.x,
      startY: component.y,
      cellWidth,
      cellHeight
    };
    setDraggingComponentId(component.id);
  };

  const handleStartResize = (event: React.PointerEvent<HTMLDivElement>, component: PlatformLayoutComponent) => {
    if (event.button !== 0) return;

    const gridRect = gridRef.current?.getBoundingClientRect();
    if (!gridRect) return;

    const cellWidth = gridRect.width / layout.columns;
    const cellHeight = gridRect.height / layout.rows;
    if (!cellWidth || !cellHeight) return;

    event.preventDefault();
    event.stopPropagation();
    setSelectedComponentId(component.id);
    resizeStateRef.current = {
      componentId: component.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startW: component.w,
      startH: component.h,
      componentX: component.x,
      componentY: component.y,
      cellWidth,
      cellHeight
    };
    setResizingComponentId(component.id);
  };

  const handleNumberChange = (field: "x" | "y" | "w" | "h", value: string) => {
    updateSelectedComponent({ [field]: Number(value) });
  };

  const applyBackgroundFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      setLayout((currentLayout) => ({
        ...currentLayout,
        backgroundImageUrl: reader.result
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleBackgroundFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) applyBackgroundFile(file);
    event.target.value = "";
  };

  const handleBackgroundDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsBackgroundDragActive(false);

    const file = event.dataTransfer.files?.[0];
    if (file) applyBackgroundFile(file);
  };

  const handleSaveLayout = () => {
    saveStoredLayout(mockPlatformSession.slug, layout);
    setSavedAt(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
  };

  const handleResetLayout = () => {
    clearStoredLayout(mockPlatformSession.slug);
    setLayout(mockPlatformLayout);
    setSelectedComponentId(mockPlatformLayout.components[0]?.id ?? "");
    setSavedAt(null);
  };

  const handleAddComponent = (type: PlatformComponentType) => {
    const defaultSize = getDefaultComponentSize(type);
    const countForType = layout.components.filter((component) => component.type === type).length + 1;
    const componentId = `component-${type}-${Date.now()}`;
    const nextComponent: PlatformLayoutComponent = {
      id: componentId,
      type,
      label: `${componentDisplayName(type)} ${countForType}`,
      x: 2,
      y: 2,
      w: defaultSize.w,
      h: defaultSize.h,
      visible: true,
      zIndex: 3
    };

    setLayout((currentLayout) => ({
      ...currentLayout,
      components: [...currentLayout.components, nextComponent]
    }));
    setSelectedComponentId(componentId);
  };

  const handleDeleteSelectedComponent = () => {
    if (!selectedComponent) return;
    handleDeleteComponent(selectedComponent.id);
  };

  const handleDeleteComponent = (componentId: string) => {
    const componentToDelete = layout.components.find((component) => component.id === componentId);
    if (!componentToDelete) return;

    setLayout((currentLayout) => {
      const nextComponents = currentLayout.components.filter((component) => component.id !== componentId);
      setSelectedComponentId(nextComponents[0]?.id ?? "");
      return { ...currentLayout, components: nextComponents };
    });
  };

  const handleComponentKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, component: PlatformLayoutComponent) => {
    const movementByKey: Record<string, { dx: number; dy: number }> = {
      ArrowUp: { dx: 0, dy: -layoutUnitStep },
      ArrowDown: { dx: 0, dy: layoutUnitStep },
      ArrowLeft: { dx: -layoutUnitStep, dy: 0 },
      ArrowRight: { dx: layoutUnitStep, dy: 0 }
    };

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelectedComponentId(component.id);
      return;
    }

    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      handleDeleteComponent(component.id);
      return;
    }

    const movement = movementByKey[event.key];
    if (!movement) return;

    event.preventDefault();
    setSelectedComponentId(component.id);

    if (event.shiftKey) {
      updateComponent(component.id, {
        w: component.w + movement.dx,
        h: component.h + movement.dy
      });
      return;
    }

    updateComponent(component.id, {
      x: component.x + movement.dx,
      y: component.y + movement.dy
    });
  };

  if (!isKnownSession) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        알 수 없는 세션입니다. 현재 mock 세션 ID는 <span className="font-mono">{mockPlatformSession.id}</span>입니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Layout Editor</p>
          <h2 className="text-2xl font-bold text-slate-900">세션 레이아웃 편집기 초안</h2>
          <p className="mt-1 text-sm text-slate-500">
            배경 이미지 위의 컴포넌트 박스를 선택하고 grid 좌표와 크기를 숫자로 조정합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleResetLayout}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            기본값 복원
          </button>
          <button
            type="button"
            onClick={handleSaveLayout}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
          >
            저장
          </button>
          <Link
            to={`/live/${mockPlatformSession.slug}/en`}
            onClick={handleSaveLayout}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
          >
            미리보기
          </Link>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">{layout.name}</h3>
              <p className="text-xs text-slate-500">Grid {layout.columns} x {layout.rows}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {savedAt && <span className="text-xs font-semibold text-emerald-600">저장됨 {savedAt}</span>}
              <label className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">
                배경 이미지 선택
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBackgroundFileChange}
                  className="sr-only"
                />
              </label>
            </div>
          </div>

          <div
            onDragEnter={(event) => {
              event.preventDefault();
              setIsBackgroundDragActive(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setIsBackgroundDragActive(true);
            }}
            onDragLeave={() => setIsBackgroundDragActive(false)}
            onDrop={handleBackgroundDrop}
            className={`relative overflow-hidden rounded-xl border bg-slate-950 shadow-inner transition ${
              isBackgroundDragActive ? "border-indigo-300 ring-4 ring-indigo-200" : "border-slate-300"
            }`}
            style={{
              aspectRatio: `${layout.canvasWidth} / ${layout.canvasHeight}`,
              backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.45), rgba(15, 23, 42, 0.55)), url(${layout.backgroundImageUrl})`,
              backgroundColor: layout.backgroundColor,
              backgroundPosition: `${layout.backgroundPositionX}% ${layout.backgroundPositionY}%`,
              backgroundRepeat: "no-repeat",
              backgroundSize: getBackgroundSize(layout.backgroundFit)
            }}
          >
            {isBackgroundDragActive && (
              <div className="pointer-events-none absolute inset-0 z-[200] flex items-center justify-center bg-indigo-950/55 text-sm font-bold text-white backdrop-blur-sm">
                배경 이미지 파일을 여기에 놓으세요
              </div>
            )}
            <div
              ref={gridRef}
              className="relative h-full"
            >
              {layout.components.map((component) => {
                const isSelected = component.id === selectedComponent?.id;

                return (
                  <div
                    key={component.id}
                    role="button"
                    tabIndex={0}
                    onPointerDown={(event) => handleStartDrag(event, component)}
                    onClick={() => setSelectedComponentId(component.id)}
                    onKeyDown={(event) => handleComponentKeyDown(event, component)}
		                    className={`group relative min-h-0 cursor-move select-none rounded-lg border-2 p-2 text-left shadow-lg transition ${
		                      isSelected
		                        ? "border-yellow-300 bg-yellow-300/30 text-white ring-2 ring-yellow-200"
		                        : "border-white/40 bg-slate-950/55 text-slate-100 hover:border-cyan-200"
		                    }`}
		                    style={{
                          ...getComponentFrameStyle(component, layout),
                          position: "absolute",
		                      opacity: component.visible === false ? 0.42 : 1,
		                      transform: draggingComponentId === component.id || resizingComponentId === component.id ? "scale(1.01)" : undefined,
		                      zIndex: component.zIndex
		                    }}
		                  >
	                    <span className="block truncate text-xs font-black uppercase tracking-wider">
	                      {component.label}
	                    </span>
	                    <span className="mt-1 block truncate font-mono text-[11px] opacity-80">
	                      {component.type.toUpperCase()} / x:{component.x} y:{component.y} w:{component.w} h:{component.h}
	                    </span>
		                    {component.visible === false && (
		                      <span className="mt-1 inline-flex rounded bg-slate-950/70 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-300">
		                        hidden
		                      </span>
		                    )}
                    <button
                      type="button"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteComponent(component.id);
                      }}
                      className="absolute right-1 top-1 rounded bg-rose-500/90 p-1 text-white opacity-0 transition hover:bg-rose-600 group-hover:opacity-100 focus:opacity-100"
                      title="컴포넌트 삭제"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                    <div
                      role="presentation"
                      onPointerDown={(event) => handleStartResize(event, component)}
                      className="absolute bottom-1 right-1 h-4 w-4 cursor-se-resize rounded-sm border border-white/80 bg-indigo-500 shadow"
                      title="크기 조정"
                    />
		                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">배경 이미지 표시</h4>
              <span className="font-mono text-[11px] text-slate-500">
                {layout.backgroundFit} / {layout.backgroundPositionX}, {layout.backgroundPositionY}
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-6">
              <label className="block space-y-1">
                <span className="text-[11px] font-bold text-slate-500">Canvas W</span>
                <input
                  type="number"
                  min={320}
                  value={layout.canvasWidth}
                  onChange={(event) =>
                    setLayout((currentLayout) => ({
                      ...currentLayout,
                      canvasWidth: Math.max(320, Number(event.target.value) || 1920)
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[11px] font-bold text-slate-500">Canvas H</span>
                <input
                  type="number"
                  min={180}
                  value={layout.canvasHeight}
                  onChange={(event) =>
                    setLayout((currentLayout) => ({
                      ...currentLayout,
                      canvasHeight: Math.max(180, Number(event.target.value) || 1080)
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[11px] font-bold text-slate-500">Fit</span>
                <select
                  value={layout.backgroundFit}
                  onChange={(event) =>
                    setLayout((currentLayout) => ({
                      ...currentLayout,
                      backgroundFit: event.target.value as PlatformLayout["backgroundFit"]
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {backgroundFitOptions.map((fit) => (
                    <option key={fit} value={fit}>
                      {fit.toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-[11px] font-bold text-slate-500">Position X</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={layout.backgroundPositionX}
                  onChange={(event) =>
                    setLayout((currentLayout) => ({
                      ...currentLayout,
                      backgroundPositionX: Number(event.target.value)
                    }))
                  }
                  className="w-full accent-indigo-600"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[11px] font-bold text-slate-500">Position Y</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={layout.backgroundPositionY}
                  onChange={(event) =>
                    setLayout((currentLayout) => ({
                      ...currentLayout,
                      backgroundPositionY: Number(event.target.value)
                    }))
                  }
                  className="w-full accent-indigo-600"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[11px] font-bold text-slate-500">Background Color</span>
                <input
                  type="color"
                  value={layout.backgroundColor}
                  onChange={(event) =>
                    setLayout((currentLayout) => ({
                      ...currentLayout,
                      backgroundColor: event.target.value
                    }))
                  }
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 py-1"
                />
              </label>
            </div>
          </div>
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {selectedComponent ? (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Selected Component</p>
                <h3 className="mt-1 text-lg font-bold text-slate-900">{selectedComponent.label}</h3>
                <p className="font-mono text-xs text-slate-500">{selectedComponent.id}</p>
              </div>

              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-500">Label / Name</span>
                <input
                  type="text"
                  value={selectedComponent.label}
                  onChange={(event) => updateSelectedComponent({ label: event.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-500">Type</span>
                <select
                  value={selectedComponent.type}
                  onChange={(event) => updateSelectedComponent({ type: event.target.value as PlatformComponentType })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {componentTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {type.toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                {(["x", "y", "w", "h"] as const).map((field) => (
                  <label key={field} className="block space-y-1">
                    <span className="text-xs font-bold uppercase text-slate-500">
                      {field === "w" ? "Width" : field === "h" ? "Height" : field}
                    </span>
                    <input
	                      type="number"
	                      min={1}
                        step={layoutUnitStep}
	                      max={field === "x" || field === "w" ? layout.columns : layout.rows}
                      value={selectedComponent[field]}
                      onChange={(event) => handleNumberChange(field, event.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </label>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <span className="text-xs font-bold text-slate-600">Visible</span>
                  <input
                    type="checkbox"
                    checked={selectedComponent.visible !== false}
                    onChange={(event) => updateSelectedComponent({ visible: event.target.checked })}
                    className="h-4 w-4 accent-indigo-600"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-bold text-slate-500">zIndex</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={selectedComponent.zIndex}
                    onChange={(event) => updateSelectedComponent({ zIndex: Number(event.target.value) })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={handleDeleteSelectedComponent}
                className="w-full rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
              >
                선택 컴포넌트 삭제
              </button>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                <p className="font-bold text-slate-800">저장 방식</p>
                <p className="mt-1 leading-relaxed">
                  현재 단계에서는 DB 대신 브라우저 localStorage에 저장합니다. 저장 후 미리보기를 누르면 live 화면에서 같은 레이아웃을 읽습니다.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">선택 가능한 컴포넌트가 없습니다.</p>
          )}
        </aside>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-900">컴포넌트 목록</h3>
          <div className="flex flex-wrap gap-2">
            {componentTypeOptions.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleAddComponent(type)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
              >
                Add {componentDisplayName(type)}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {layout.components.map((component) => (
            <div
              key={component.id}
              className={`rounded-xl border p-3 transition ${
                component.id === selectedComponent?.id
                  ? "border-indigo-300 bg-indigo-50"
                  : "border-slate-200 bg-slate-50 hover:border-slate-300"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedComponentId(component.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-center gap-2">
                    <p className="truncate text-xs font-bold text-slate-900">{component.label}</p>
                    {component.visible === false && (
                      <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-500">
                        hidden
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-slate-500">
                    {component.type.toUpperCase()} / {component.x},{component.y},{component.w},{component.h} / z:{component.zIndex}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteComponent(component.id)}
                  className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  title="컴포넌트 삭제"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LiveSessionPage() {
  const { sessionSlug, languageCode } = useParams();
  const resolvedLanguage = languageCode ?? mockPlatformData.event.defaultLanguageCode;
  const [layout] = useState(() => loadStoredLayout(mockPlatformSession.slug, mockPlatformLayout));

  if (sessionSlug !== mockPlatformSession.slug) {
    return <Navigate to={`/live/${mockPlatformSession.slug}/${resolvedLanguage}`} replace />;
  }

  return (
    <DisplayRenderer
      layout={layout}
      session={mockPlatformSession}
      languageCode={resolvedLanguage}
    />
  );
}

function RoutedApp(appData: AppDataContext) {
  return (
    <Routes>
      <Route path="/live/:sessionSlug/:languageCode" element={<LiveSessionPage />} />
      <Route
        path="/*"
        element={
          <AppShell>
            <Routes>
              <Route path="/" element={<DemoPage {...appData} />} />
              <Route path="/demo" element={<DemoPage {...appData} />} />
              <Route path="/admin" element={<AdminPage {...appData} />} />
              <Route path="/admin/sessions" element={<AdminSessionsPage />} />
              <Route path="/admin/sessions/:sessionId/layout" element={<SessionLayoutEditorPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppShell>
        }
      />
    </Routes>
  );
}

export default function App() {
  const [appState, setAppState] = useState<AppState>({
    sessionMode: "live",
    speakerLang: "en",
    outputLang: "ko",
    isCapturing: false,
    layout: "split",
    currentVideoTime: 0,
    subtitles: [],
    qaList: [],
    bookmarks: [],
    notes: []
  });

  const [dictionary, setDictionary] = useState<DictionaryItem[]>([]);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

  const fetchState = async () => {
    try {
      const res = await fetch("/api/state");
      if (res.ok) {
        const data = await res.json();
        setAppState(data);
      }
    } catch (error) {
      console.error("Error polling server state:", error);
    }
  };

  const fetchDictionary = async () => {
    try {
      const res = await fetch("/api/dictionary");
      if (res.ok) {
        const data = await res.json();
        setDictionary(data);
      }
    } catch (error) {
      console.error("Error fetching medical dictionary:", error);
    }
  };

  useEffect(() => {
    fetchState();
    fetchDictionary();

    const stateInterval = setInterval(() => {
      fetchState();
    }, 1500);

    return () => clearInterval(stateInterval);
  }, []);

  const updateServerState = async (updates: Partial<AppState>) => {
    try {
      setAppState((prev) => ({ ...prev, ...updates } as AppState));

      await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
    } catch (error) {
      console.error("Error updating server state:", error);
    }
  };

  const handleAddQA = async (text: string, user: string) => {
    try {
      const res = await fetch("/api/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, user })
      });
      if (res.ok) fetchState();
    } catch (error) {
      console.error(error);
    }
  };

  const handleAnswerQA = async (id: string, answer: string) => {
    try {
      const res = await fetch("/api/qa/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, answer })
      });
      if (res.ok) fetchState();
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddBookmark = async (title: string) => {
    try {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timestamp: appState.currentVideoTime, title })
      });
      if (res.ok) fetchState();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteBookmark = async (id: string) => {
    try {
      const res = await fetch("/api/bookmarks/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (res.ok) fetchState();
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddNote = async (text: string) => {
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timestamp: appState.currentVideoTime, text })
      });
      if (res.ok) fetchState();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      const res = await fetch("/api/notes/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (res.ok) fetchState();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <BrowserRouter>
      <RoutedApp
        appState={appState}
        dictionary={dictionary}
        playbackSpeed={playbackSpeed}
        setPlaybackSpeed={setPlaybackSpeed}
        updateServerState={updateServerState}
        fetchState={fetchState}
        fetchDictionary={fetchDictionary}
        handleAddQA={handleAddQA}
        handleAnswerQA={handleAnswerQA}
        handleAddBookmark={handleAddBookmark}
        handleDeleteBookmark={handleDeleteBookmark}
        handleAddNote={handleAddNote}
        handleDeleteNote={handleDeleteNote}
      />
    </BrowserRouter>
  );
}
