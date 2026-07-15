import React from "react";
import {
  Captions,
  Clapperboard,
  MessageSquareText,
  Plus,
  Presentation,
  StickyNote,
  Trash2
} from "lucide-react";
import {
  PlatformComponentType,
  PlatformLayoutComponent
} from "../../../data/mockPlatformData";
import {
  componentDisplayName,
  componentTypeOptions
} from "../../../utils/layoutEditor";

const componentDescriptions: Record<PlatformComponentType, string> = {
  video: "영상 플레이어",
  slide: "발표 자료",
  caption: "실시간 자막",
  qa: "질의응답",
  notice: "공지/배너"
};

const componentIcons: Record<PlatformComponentType, React.ComponentType<{ className?: string }>> = {
  video: Clapperboard,
  slide: Presentation,
  caption: Captions,
  qa: MessageSquareText,
  notice: StickyNote
};

interface ComponentListPanelProps {
  components: PlatformLayoutComponent[];
  selectedComponentId: string;
  onAddComponent: (type: PlatformComponentType) => void;
  onSelectComponent: (componentId: string) => void;
  onDeleteComponent: (componentId: string) => void;
}

export default function ComponentListPanel({
  components,
  selectedComponentId,
  onAddComponent,
  onSelectComponent,
  onDeleteComponent
}: ComponentListPanelProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-indigo-600">Component Library</p>
        <h3 className="mt-1 text-sm font-black text-slate-900">컴포넌트 추가</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          필요한 화면 영역을 추가한 뒤 캔버스에서 위치와 크기를 조정합니다.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
          {componentTypeOptions.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onAddComponent(type)}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm">
                {React.createElement(componentIcons[type], { className: "h-4 w-4" })}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-black text-slate-900">Add {componentDisplayName(type)}</span>
                <span className="mt-0.5 block text-[11px] font-semibold text-slate-500">{componentDescriptions[type]}</span>
              </span>
              <Plus className="h-4 w-4 shrink-0 text-indigo-500" />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 border-t border-slate-200 pt-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-black text-slate-900">컴포넌트 목록</h3>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500">
            {components.length}개
          </span>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        {components.length > 0 ? components.map((component) => (
          <div
            key={component.id}
            className={`rounded-xl border p-3 transition ${
              component.id === selectedComponentId
                ? "border-indigo-300 bg-indigo-50"
                : "border-slate-200 bg-slate-50 hover:border-slate-300"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <button
                type="button"
                onClick={() => onSelectComponent(component.id)}
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
                onClick={() => onDeleteComponent(component.id)}
                className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                title="컴포넌트 삭제"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs font-semibold text-slate-500">
            아직 배치된 컴포넌트가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
