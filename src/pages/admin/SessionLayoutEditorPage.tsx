import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  BadgeInfo,
  Captions,
  Clapperboard,
  Grid3X3,
  Image,
  Layers3,
  MessageSquareText,
  MonitorPlay,
  Presentation,
  Radio,
  Settings2,
  Sparkles
} from "lucide-react";
import {
  mockPlatformLayout,
  mockPlatformSession,
  PlatformComponentType,
  PlatformLayoutComponent
} from "../../data/mockPlatformData";
import {
  clearStoredLayout,
  loadStoredLayout,
  saveStoredLayout
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

const builderMenuItems = ["화면 구성", "세션 관리", "자막 설정", "Q&A 관리", "공지/배너 관리", "설정"];
const componentGuideItems = [
  { type: "video", title: "영상 (Video)", description: "연사/발표자 영상을 보여주는 영역", icon: MonitorPlay, color: "text-violet-600 bg-violet-50" },
  { type: "slide", title: "PPT/자료 (Slides)", description: "발표 자료와 이미지 슬라이드 영역", icon: Presentation, color: "text-sky-600 bg-sky-50" },
  { type: "caption", title: "실시간 자막", description: "AI가 번역한 자막을 표시하는 영역", icon: Captions, color: "text-emerald-600 bg-emerald-50" },
  { type: "qa", title: "Q&A / 채팅", description: "청중 질문과 답변을 보여주는 영역", icon: MessageSquareText, color: "text-orange-600 bg-orange-50" },
  { type: "notice", title: "세션 정보/공지", description: "행사 정보와 안내 문구 영역", icon: BadgeInfo, color: "text-pink-600 bg-pink-50" }
] as const;

export default function SessionLayoutEditorPage() {
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
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-600">
              <Sparkles className="h-4 w-4" />
              Component Layout Builder
            </div>
            <h2 className="mt-2 text-2xl font-black text-slate-950">컴포넌트 방식 화면 구성</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              영상, 자료, 실시간 자막, Q&A, 공지 컴포넌트를 배경 위에 배치하고 세션별 공개 화면을 구성합니다.
              선택한 컴포넌트는 grid 좌표와 드래그로 위치/크기를 조정할 수 있습니다.
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
              className="rounded-lg bg-slate-950 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
            >
              미리보기
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {[
            { label: "행사/세션 생성", icon: Clapperboard },
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

      <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)_360px]">
        <aside className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-white shadow-sm">
          <div className="border-b border-white/10 p-5">
            <div className="flex items-center gap-2">
              <Layers3 className="h-4 w-4 text-cyan-300" />
              <h3 className="text-sm font-black">대시보드</h3>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">화면 구성과 실시간 송출 요소를 관리합니다.</p>
          </div>

          <nav className="space-y-1 border-b border-white/10 p-3">
            {builderMenuItems.map((item, index) => (
              <button
                key={item}
                type="button"
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-bold transition ${
                  index === 0 ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-white/10"
                }`}
              >
                {item}
                {index === 0 && <span className="h-1.5 w-1.5 rounded-full bg-cyan-200" />}
              </button>
            ))}
          </nav>

          <div className="space-y-2 p-4">
            <p className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-500">주요 컴포넌트</p>
            {componentGuideItems.map(({ title, description, icon: Icon, color }) => (
              <div key={title} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <div className="flex items-start gap-3">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${color}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-white">{title}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
                    accept="image/*"
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
          </div>
        </main>

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
      </div>

      <ComponentListPanel
        components={layout.components}
        selectedComponentId={selectedComponentId}
        onAddComponent={handleAddComponent}
        onSelectComponent={setSelectedComponentId}
        onDeleteComponent={handleDeleteComponent}
      />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-black text-slate-900">한눈에 보는 흐름</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            {["행사/세션 생성", "템플릿 선택", "컴포넌트 배치", "저장 및 미리보기", "실시간 송출"].map((item, index) => (
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
            한 행사에서 여러 세션을 동시에 운영할 때, 세션마다 다른 레이아웃과 자막 스트림을 적용하고
            각 언어 URL을 독립적으로 송출할 수 있습니다.
          </p>
        </div>
      </section>
    </div>
  );
}
