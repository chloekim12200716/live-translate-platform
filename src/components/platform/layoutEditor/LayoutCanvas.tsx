import React from "react";
import { Trash2 } from "lucide-react";
import {
  defaultCaptionStyle,
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

const componentChromeByType: Record<PlatformLayoutComponent["type"], string> = {
  video: "border-violet-400 bg-violet-950/35 ring-violet-300/30",
  slide: "border-sky-400 bg-sky-950/35 ring-sky-300/30",
  caption: "border-emerald-400 bg-emerald-950/35 ring-emerald-300/30",
  qa: "border-orange-400 bg-orange-950/35 ring-orange-300/30",
  notice: "border-pink-400 bg-pink-950/35 ring-pink-300/30"
};

const componentBadgeByType: Record<PlatformLayoutComponent["type"], string> = {
  video: "bg-violet-500",
  slide: "bg-sky-500",
  caption: "bg-emerald-500",
  qa: "bg-orange-500",
  notice: "bg-pink-500"
};

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
      <div className="pointer-events-none absolute left-3 right-3 top-3 z-[20] flex items-center justify-between rounded-md border border-white/10 bg-slate-950/80 px-3 py-2 text-white backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="rounded bg-rose-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">Live</span>
          <span className="text-xs font-bold">제27회 세계지식포럼</span>
        </div>
        <span className="hidden text-[11px] font-semibold text-slate-300 sm:block">
          Global Innovation Lecture Series
        </span>
      </div>

      <div ref={gridRef} className="relative h-full">
        {layout.components.map((component, componentIndex) => {
          const isSelected = component.id === selectedComponentId;
          const componentChrome = componentChromeByType[component.type] ?? "border-white/40 bg-slate-950/55 ring-white/20";
          const componentBadge = componentBadgeByType[component.type] ?? "bg-slate-500";
          const captionStyle = {
            ...defaultCaptionStyle,
            ...component.captionStyle
          };

          return (
            <div
              key={component.id}
              role="button"
              tabIndex={0}
              onPointerDown={(event) => onStartDrag(event, component)}
              onClick={() => onSelectComponent(component.id)}
              onKeyDown={(event) => onComponentKeyDown(event, component)}
              className={`group relative min-h-0 cursor-move select-none rounded-md border-2 border-dashed p-2 text-left shadow-lg ring-1 transition ${
                isSelected
                  ? "border-yellow-300 bg-yellow-300/25 text-white ring-2 ring-yellow-200"
                  : `${componentChrome} text-slate-100 hover:border-white`
              }`}
              style={{
                ...getComponentFrameStyle(component, layout),
                position: "absolute",
                opacity: component.visible === false ? 0.42 : 1,
                transform: draggingComponentId === component.id || resizingComponentId === component.id ? "scale(1.01)" : undefined,
                zIndex: component.zIndex
              }}
            >
              <span className={`absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-md text-xs font-black text-white shadow ${componentBadge}`}>
                {componentIndex + 1}
              </span>
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
              {component.type === "caption" && (
                <div className="mt-2 line-clamp-2 rounded px-2 py-1 text-center font-bold leading-snug shadow-inner">
                  <span
                    className="box-decoration-clone rounded px-1.5 py-0.5"
                    style={{
                      backgroundColor: captionStyle.textBackgroundColor,
                      color: captionStyle.textColor,
                      fontFamily: captionStyle.fontFamily,
                      fontSize: `${Math.max(10, Math.min(18, captionStyle.fontSizePx * 0.5))}px`
                    }}
                  >
                    실시간 번역 자막 예시
                  </span>
                </div>
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
