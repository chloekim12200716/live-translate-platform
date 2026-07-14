import React from "react";
import { Trash2 } from "lucide-react";
import {
  PlatformComponentType,
  PlatformLayoutComponent
} from "../../../data/mockPlatformData";
import {
  componentDisplayName,
  componentTypeOptions
} from "../../../utils/layoutEditor";

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-900">컴포넌트 목록</h3>
        <div className="flex flex-wrap gap-2">
          {componentTypeOptions.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onAddComponent(type)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
            >
              Add {componentDisplayName(type)}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {components.map((component) => (
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
        ))}
      </div>
    </div>
  );
}
