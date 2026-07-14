import React from "react";
import { Trash2 } from "lucide-react";
import {
  PlatformLayout,
  PlatformLayoutComponent
} from "../../../data/mockPlatformData";
import {
  getBackgroundSize,
  getComponentFrameStyle
} from "../../../utils/layoutEditor";

interface LayoutCanvasProps {
  layout: PlatformLayout;
  selectedComponentId: string;
  draggingComponentId: string | null;
  resizingComponentId: string | null;
  isBackgroundDragActive: boolean;
  gridRef: React.RefObject<HTMLDivElement | null>;
  onBackgroundDragActiveChange: (isActive: boolean) => void;
  onBackgroundDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  onSelectComponent: (componentId: string) => void;
  onStartDrag: (event: React.PointerEvent<HTMLDivElement>, component: PlatformLayoutComponent) => void;
  onStartResize: (event: React.PointerEvent<HTMLDivElement>, component: PlatformLayoutComponent) => void;
  onComponentKeyDown: (event: React.KeyboardEvent<HTMLDivElement>, component: PlatformLayoutComponent) => void;
  onDeleteComponent: (componentId: string) => void;
}

export default function LayoutCanvas({
  layout,
  selectedComponentId,
  draggingComponentId,
  resizingComponentId,
  isBackgroundDragActive,
  gridRef,
  onBackgroundDragActiveChange,
  onBackgroundDrop,
  onSelectComponent,
  onStartDrag,
  onStartResize,
  onComponentKeyDown,
  onDeleteComponent
}: LayoutCanvasProps) {
  return (
    <div
      onDragEnter={(event) => {
        event.preventDefault();
        onBackgroundDragActiveChange(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        onBackgroundDragActiveChange(true);
      }}
      onDragLeave={() => onBackgroundDragActiveChange(false)}
      onDrop={onBackgroundDrop}
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
      <div ref={gridRef} className="relative h-full">
        {layout.components.map((component) => {
          const isSelected = component.id === selectedComponentId;

          return (
            <div
              key={component.id}
              role="button"
              tabIndex={0}
              onPointerDown={(event) => onStartDrag(event, component)}
              onClick={() => onSelectComponent(component.id)}
              onKeyDown={(event) => onComponentKeyDown(event, component)}
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
                  onDeleteComponent(component.id);
                }}
                className="absolute right-1 top-1 rounded bg-rose-500/90 p-1 text-white opacity-0 transition hover:bg-rose-600 group-hover:opacity-100 focus:opacity-100"
                title="컴포넌트 삭제"
              >
                <Trash2 className="h-3 w-3" />
              </button>
              <div
                role="presentation"
                onPointerDown={(event) => onStartResize(event, component)}
                className="absolute bottom-1 right-1 h-4 w-4 cursor-se-resize rounded-sm border border-white/80 bg-indigo-500 shadow"
                title="크기 조정"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
