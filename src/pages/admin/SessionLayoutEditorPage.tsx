import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
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

        <ComponentSettingsPanel
          layout={layout}
          selectedComponent={selectedComponent}
          onUpdateSelectedComponent={updateSelectedComponent}
          onNumberChange={handleNumberChange}
          onDeleteSelectedComponent={handleDeleteSelectedComponent}
        />
      </div>

      <ComponentListPanel
        components={layout.components}
        selectedComponentId={selectedComponentId}
        onAddComponent={handleAddComponent}
        onSelectComponent={setSelectedComponentId}
        onDeleteComponent={handleDeleteComponent}
      />
    </div>
  );
}
