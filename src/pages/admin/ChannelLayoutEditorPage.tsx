import React, { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  Clapperboard,
  Grid3X3,
  Image,
  Radio,
  Settings2,
  Sparkles
} from "lucide-react";
import {
  defaultCaptionStyle,
  findPlatformChannelById,
  mockPlatformLayout,
  mockPlatformLayouts,
  mockPlatformDisplays,
  mockPlatformChannel,
  PlatformComponentType,
  PlatformDisplayTarget,
  PlatformLayout,
  PlatformLayoutComponent
} from "../../data/mockPlatformData";
import {
  clearStoredLayout,
  loadStoredPlatformChannels,
  loadStoredLayoutById,
  loadStoredPlatformDisplays,
  loadStoredLayout,
  saveStoredLayout,
  saveStoredPlatformDisplays
} from "../../data/platformLayoutStorage";
import BackgroundSettingsPanel from "../../components/platform/layoutEditor/BackgroundSettingsPanel";
import ComponentListPanel from "../../components/platform/layoutEditor/ComponentListPanel";
import ComponentSettingsPanel from "../../components/platform/layoutEditor/ComponentSettingsPanel";
import LayoutCanvas from "../../components/platform/layoutEditor/LayoutCanvas";
import {
  clampGridValue,
  componentDisplayName,
  getDefaultComponentSize,
  layoutUnitStep,
  snapLayoutUnit
} from "../../utils/layoutEditor";

const supportedLanguages = ["ar", "zh", "en", "fr", "ko", "ru", "es"];
const MAX_BACKGROUND_IMAGE_BYTES = 2 * 1024 * 1024;
const supportedBackgroundImageTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "") || "platform";
}

export default function ChannelLayoutEditorPage() {
  const { channelId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const storedChannels = loadStoredPlatformChannels();
  const selectedChannel = findPlatformChannelById(channelId)
    ?? storedChannels.find((channel) => channel.id === channelId);
  const isKnownChannel = Boolean(selectedChannel);
  const channel = selectedChannel ?? mockPlatformChannel;
  const [customDisplays, setCustomDisplays] = useState(() => loadStoredPlatformDisplays(channel.slug));
  const selectedLayoutId = searchParams.get("layoutId") ?? mockPlatformLayout.id;
  const customLayouts = customDisplays
    .map((display) => loadStoredLayoutById(channel.slug, display.layoutId))
    .filter((customLayout): customLayout is PlatformLayout => Boolean(customLayout));
  const mockDisplaysForChannel = mockPlatformDisplays.filter((display) => display.channelId === channel.id);
  const mockLayoutsForChannel = mockPlatformLayouts.filter((layout) => layout.channelId === channel.id);
  const allPlatformDisplays = [...mockDisplaysForChannel, ...customDisplays];
  const allBaseLayouts = [...mockLayoutsForChannel, ...customLayouts];
  const selectedBaseLayout = allBaseLayouts.find((layout) => layout.id === selectedLayoutId)
    ?? allBaseLayouts[0]
    ?? {
      ...mockPlatformLayout,
      id: `layout-${channel.slug}-caption`,
      channelId: channel.id,
      name: `${channel.title} Caption Stage`
    };
  const selectedDisplay = allPlatformDisplays.find((display) => display.layoutId === selectedBaseLayout.id);
  const previewLanguageCode = selectedDisplay?.defaultLanguageCode ?? channel.sourceLanguageCode;
  const [layout, setLayout] = useState(() => loadStoredLayout(channel.slug, selectedBaseLayout, selectedBaseLayout.id));
  const [selectedComponentId, setSelectedComponentId] = useState(layout.components[0]?.id ?? "");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [editorErrorMessage, setEditorErrorMessage] = useState("");
  const [isBackgroundDragActive, setIsBackgroundDragActive] = useState(false);
  const [draggingComponentId, setDraggingComponentId] = useState<string | null>(null);
  const [resizingComponentId, setResizingComponentId] = useState<string | null>(null);
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newDisplayDescription, setNewDisplayDescription] = useState("");
  const [newDefaultLanguageCode, setNewDefaultLanguageCode] = useState("en");
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

  useEffect(() => {
    setCustomDisplays(loadStoredPlatformDisplays(channel.slug));
  }, [channel.slug]);

  useEffect(() => {
    const nextLayout = loadStoredLayout(channel.slug, selectedBaseLayout, selectedBaseLayout.id);
    setLayout(nextLayout);
    setSelectedComponentId(nextLayout.components[0]?.id ?? "");
    setSavedAt(null);
  }, [channel.slug, selectedBaseLayout.id]);

  const handleLayoutSelect = (layoutId: string) => {
    setSearchParams({ layoutId });
  };

  const handleAddPlatformLayout = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = newDisplayName.trim();
    if (!name) return;

    const idSuffix = `${toSlug(name)}-${Date.now()}`;
    const layoutId = `layout-${channel.slug}-${idSuffix}`;
    const displayId = `display-${channel.slug}-${idSuffix}`;
    const nextLayout: PlatformLayout = {
      ...layout,
      id: layoutId,
      name,
      channelId: channel.id,
      components: layout.components.map((component) => ({ ...component }))
    };
    const nextDisplay: PlatformDisplayTarget = {
      id: displayId,
      channelId: channel.id,
      name,
      description: newDisplayDescription.trim() || `${name} 전용 송출 레이아웃`,
      layoutId,
      defaultLanguageCode: newDefaultLanguageCode
    };
    const nextDisplays = [...customDisplays, nextDisplay];

    try {
      saveStoredLayout(channel.slug, nextLayout, layoutId);
      saveStoredPlatformDisplays(channel.slug, nextDisplays);
      setCustomDisplays(nextDisplays);
      setNewDisplayName("");
      setNewDisplayDescription("");
      setNewDefaultLanguageCode("en");
      setEditorErrorMessage("");
      setSearchParams({ layoutId });
    } catch (error) {
      setEditorErrorMessage(error instanceof Error ? error.message : "레이아웃 저장에 실패했습니다.");
    }
  };

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
          label: updates.type ? componentDisplayName(updates.type) : nextComponent.label,
          captionStyle: nextComponent.type === "caption"
            ? { ...defaultCaptionStyle, ...nextComponent.captionStyle }
            : undefined
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
    const nextValue = Number(value);
    if (!Number.isFinite(nextValue)) return;
    updateSelectedComponent({ [field]: nextValue });
  };

  const applyBackgroundFile = (file: File) => {
    if (!supportedBackgroundImageTypes.has(file.type)) {
      setEditorErrorMessage("PNG, JPG, WEBP, GIF 이미지만 배경으로 사용할 수 있습니다.");
      return;
    }
    if (file.size > MAX_BACKGROUND_IMAGE_BYTES) {
      setEditorErrorMessage("배경 이미지는 2MB 이하 파일만 사용할 수 있습니다.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      setLayout((currentLayout) => ({
        ...currentLayout,
        backgroundImageUrl: reader.result
      }));
      setEditorErrorMessage("");
    };
    reader.onerror = () => setEditorErrorMessage("배경 이미지 파일을 읽지 못했습니다.");
    reader.onabort = () => setEditorErrorMessage("배경 이미지 파일 읽기가 취소되었습니다.");
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
    try {
      saveStoredLayout(channel.slug, layout, selectedBaseLayout.id);
      setSavedAt(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      setEditorErrorMessage("");
    } catch (error) {
      setEditorErrorMessage(error instanceof Error ? error.message : "레이아웃 저장에 실패했습니다.");
    }
  };

  const handleResetLayout = () => {
    try {
      const isMockLayout = mockLayoutsForChannel.some((baseLayout) => baseLayout.id === selectedBaseLayout.id);
      if (isMockLayout) {
        clearStoredLayout(channel.slug, selectedBaseLayout.id);
      } else {
        saveStoredLayout(channel.slug, selectedBaseLayout, selectedBaseLayout.id);
      }

      setLayout(selectedBaseLayout);
      setSelectedComponentId(selectedBaseLayout.components[0]?.id ?? "");
      setSavedAt(null);
      setEditorErrorMessage("");
    } catch (error) {
      setEditorErrorMessage(error instanceof Error ? error.message : "레이아웃 복원에 실패했습니다.");
    }
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
      zIndex: 3,
      captionStyle: type === "caption" ? { ...defaultCaptionStyle } : undefined
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

  if (!isKnownChannel) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        알 수 없는 채널입니다. 채널 관리 화면에서 생성된 채널을 선택하세요.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-3 z-30 rounded-2xl border border-indigo-200 bg-white/95 p-3 shadow-lg shadow-slate-200/70 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-widest text-indigo-600">Layout Editor</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="text-base font-black text-slate-950">{selectedDisplay?.name ?? selectedBaseLayout.name}</h2>
              <span className="rounded-full bg-slate-100 px-2 py-1 font-mono text-[10px] font-bold text-slate-500">
                {selectedBaseLayout.id}
              </span>
              {savedAt && (
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">
                  저장됨 {savedAt}
                </span>
              )}
            </div>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <button
              type="button"
              onClick={handleResetLayout}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 sm:flex-none"
            >
              기본값 복원
            </button>
            <button
              type="button"
              onClick={handleSaveLayout}
              className="flex-1 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-black text-white shadow-sm hover:bg-indigo-700 sm:flex-none"
            >
              저장
            </button>
            <Link
              to={`/live/${channel.slug}/${previewLanguageCode}?layoutId=${selectedBaseLayout.id}`}
              onClick={handleSaveLayout}
              className="flex-1 rounded-lg bg-slate-950 px-5 py-2.5 text-center text-sm font-black text-white shadow-sm hover:bg-slate-800 sm:flex-none"
            >
              저장 후 자막 화면 보기
            </Link>
            <Link
              to={`/live/${channel.slug}/${previewLanguageCode}?layoutId=${selectedBaseLayout.id}&view=full`}
              onClick={handleSaveLayout}
              className="flex-1 rounded-lg bg-emerald-600 px-5 py-2.5 text-center text-sm font-black text-white shadow-sm hover:bg-emerald-700 sm:flex-none"
            >
              저장 후 전체 화면 보기
            </Link>
          </div>
        </div>
      </div>

      {editorErrorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">
          {editorErrorMessage}
        </div>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-600">
              <Sparkles className="h-4 w-4" />
              Component Layout Builder
            </div>
            <h2 className="mt-2 text-2xl font-black text-slate-950">컴포넌트 방식 화면 구성</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              영상, 자료, 실시간 자막, Q&A, 공지 컴포넌트를 배경 위에 배치하고 채널별 공개 화면을 구성합니다.
              선택한 컴포넌트는 grid 좌표와 드래그로 위치/크기를 조정할 수 있습니다.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">출력 채널 / 레이아웃 선택</p>
              <h3 className="mt-1 text-sm font-black text-slate-900">
                {selectedDisplay?.name ?? selectedBaseLayout.name}
              </h3>
            </div>
            <p className="font-mono text-[11px] text-slate-500">{selectedBaseLayout.id}</p>
          </div>
          <form onSubmit={handleAddPlatformLayout} className="mt-4 rounded-xl border border-indigo-100 bg-white p-3">
            <div className="grid gap-3 lg:grid-cols-[minmax(160px,1fr)_minmax(220px,1.4fr)_120px_auto]">
              <label className="text-xs font-bold text-slate-700">
                새 레이아웃 이름
                <input
                  value={newDisplayName}
                  onChange={(event) => setNewDisplayName(event.target.value)}
                  placeholder="예: 로비 전광판 자막"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-400"
                />
              </label>
              <label className="text-xs font-bold text-slate-700">
                설명
                <input
                  value={newDisplayDescription}
                  onChange={(event) => setNewDisplayDescription(event.target.value)}
                  placeholder="현재 레이아웃을 복제해서 새 레이아웃으로 저장"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-400"
                />
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
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {allPlatformDisplays.map((display) => {
              const isSelected = display.layoutId === selectedBaseLayout.id;

              return (
                <button
                  key={display.id}
                  type="button"
                  onClick={() => handleLayoutSelect(display.layoutId)}
                  className={`rounded-xl border p-4 text-left transition ${
                    isSelected
                      ? "border-indigo-300 bg-white shadow-sm ring-2 ring-indigo-100"
                      : "border-slate-200 bg-white/70 hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  <p className="text-xs font-black text-slate-900">{display.name}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-500">{display.description}</p>
                  <p className="mt-3 font-mono text-[10px] text-indigo-600">{display.layoutId}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {[
            { label: "채널 생성", icon: Clapperboard },
            { label: "화면 템플릿 선택", icon: Image },
            { label: "컴포넌트 배치", icon: Grid3X3 },
            { label: "실시간 송출 시작", icon: Radio }
          ].map(({ label, icon: Icon }, index) => (
            <div key={label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Step {index + 1}</p>
                <p className="text-xs font-bold text-slate-900">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900">1. 화면 구성 예시</h3>
            <p className="text-xs text-slate-500">{layout.name} · Grid {layout.columns} x {layout.rows}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {savedAt && <span className="text-xs font-semibold text-emerald-600">저장됨 {savedAt}</span>}
            <label className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">
              배경 이미지 선택
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleBackgroundFileChange}
                className="sr-only"
              />
            </label>
          </div>
        </div>

        <LayoutCanvas
          layout={layout}
          selectedComponentId={selectedComponentId}
          draggingComponentId={draggingComponentId}
          resizingComponentId={resizingComponentId}
          isBackgroundDragActive={isBackgroundDragActive}
          gridRef={gridRef}
          onBackgroundDragActiveChange={setIsBackgroundDragActive}
          onBackgroundDrop={handleBackgroundDrop}
          onSelectComponent={setSelectedComponentId}
          onStartDrag={handleStartDrag}
          onStartResize={handleStartResize}
          onComponentKeyDown={handleComponentKeyDown}
          onDeleteComponent={handleDeleteComponent}
        />

        <BackgroundSettingsPanel
          layout={layout}
          onLayoutChange={setLayout}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
        <div className="space-y-4">
          <ComponentListPanel
            components={layout.components}
            selectedComponentId={selectedComponentId}
            onAddComponent={handleAddComponent}
            onSelectComponent={setSelectedComponentId}
            onDeleteComponent={handleDeleteComponent}
          />
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-indigo-600" />
              <h3 className="text-sm font-black text-slate-900">3. 컴포넌트 설정</h3>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              선택한 영역의 타입, 좌표, 크기, 노출 여부를 조정합니다.
            </p>
          </div>
          <ComponentSettingsPanel
            layout={layout}
            selectedComponent={selectedComponent}
            onUpdateSelectedComponent={updateSelectedComponent}
            onNumberChange={handleNumberChange}
            onDeleteSelectedComponent={handleDeleteSelectedComponent}
          />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-black text-slate-900">한눈에 보는 흐름</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            {["채널 생성", "템플릿 선택", "컴포넌트 배치", "저장 및 미리보기", "실시간 송출"].map((item, index) => (
              <div key={item} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-sm font-black text-indigo-700">
                  {index + 1}
                </div>
                <p className="mt-2 text-xs font-bold text-slate-800">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-sm leading-relaxed text-emerald-950 shadow-sm">
          <h3 className="text-sm font-black">실제 운영 예시</h3>
          <p className="mt-2">
            여러 채널을 동시에 운영할 때, 채널마다 다른 레이아웃과 자막 스트림을 적용하고
            각 언어 URL을 독립적으로 송출할 수 있습니다.
          </p>
        </div>
      </section>
    </div>
  );
}
