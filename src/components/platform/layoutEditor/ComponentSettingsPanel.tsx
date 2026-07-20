import React from "react";
import {
  defaultCaptionStyle,
  PlatformComponentType,
  PlatformLayout,
  PlatformLayoutComponent
} from "../../../data/mockPlatformData";
import {
  componentTypeOptions,
  layoutUnitStep
} from "../../../utils/layoutEditor";

interface ComponentSettingsPanelProps {
  layout: PlatformLayout;
  selectedComponent?: PlatformLayoutComponent;
  onUpdateSelectedComponent: (updates: Partial<PlatformLayoutComponent>) => void;
  onNumberChange: (field: "x" | "y" | "w" | "h", value: string) => void;
  onDeleteSelectedComponent: () => void;
}

function normalizeCaptionFontSize(value: number) {
  if (!Number.isFinite(value)) return defaultCaptionStyle.fontSizePx;
  return Math.min(96, Math.max(12, Math.round(value)));
}

export default function ComponentSettingsPanel({
  layout,
  selectedComponent,
  onUpdateSelectedComponent,
  onNumberChange,
  onDeleteSelectedComponent
}: ComponentSettingsPanelProps) {
  const captionStyle = {
    ...defaultCaptionStyle,
    ...selectedComponent?.captionStyle
  };

  const updateCaptionStyle = (updates: Partial<typeof defaultCaptionStyle>) => {
    onUpdateSelectedComponent({
      captionStyle: {
        ...captionStyle,
        ...updates
      }
    });
  };

  return (
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
              onChange={(event) => onUpdateSelectedComponent({ label: event.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-bold text-slate-500">Type</span>
            <select
              value={selectedComponent.type}
              onChange={(event) => onUpdateSelectedComponent({ type: event.target.value as PlatformComponentType })}
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
                  onChange={(event) => onNumberChange(field, event.target.value)}
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
                onChange={(event) => onUpdateSelectedComponent({ visible: event.target.checked })}
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
                onChange={(event) => onUpdateSelectedComponent({ zIndex: Number(event.target.value) })}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </label>
          </div>

          {selectedComponent.type === "caption" && (
            <div className="space-y-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-emerald-700">Caption Style</p>
                <p className="mt-1 text-xs leading-relaxed text-emerald-900/70">
                  라이브 화면의 자막 글자 스타일을 설정합니다.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-slate-600">Font Size</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={12}
                      max={96}
                      step={1}
                      value={captionStyle.fontSizePx}
                      onChange={(event) => updateCaptionStyle({ fontSizePx: normalizeCaptionFontSize(Number(event.target.value)) })}
                      className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-bold text-slate-500">px</span>
                  </div>
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-bold text-slate-600">Font Family</span>
                  <select
                    value={captionStyle.fontFamily}
                    onChange={(event) => updateCaptionStyle({ fontFamily: event.target.value })}
                    className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Pretendard, Inter, system-ui, sans-serif">Pretendard</option>
                    <option value="Inter, system-ui, sans-serif">Inter</option>
                    <option value="Arial, Helvetica, sans-serif">Arial</option>
                    <option value="Georgia, serif">Georgia</option>
                    <option value="'Times New Roman', Times, serif">Times New Roman</option>
                    <option value="'Courier New', Courier, monospace">Courier New</option>
                    <option value="system-ui, sans-serif">System UI</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-slate-600">글자 색상</span>
                  <input
                    type="color"
                    value={captionStyle.textColor}
                    onChange={(event) => updateCaptionStyle({ textColor: event.target.value })}
                    className="h-10 w-full rounded-lg border border-emerald-200 bg-white p-1"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-bold text-slate-600">글자 배경색</span>
                  <input
                    type="color"
                    value={captionStyle.textBackgroundColor}
                    onChange={(event) => updateCaptionStyle({ textBackgroundColor: event.target.value })}
                    className="h-10 w-full rounded-lg border border-emerald-200 bg-white p-1"
                  />
                </label>
              </div>

              <div
                className="rounded-lg px-4 py-3 text-center font-bold leading-snug shadow-inner"
                style={{
                  backgroundColor: captionStyle.textBackgroundColor,
                  color: captionStyle.textColor,
                  fontFamily: captionStyle.fontFamily,
                  fontSize: `${Math.min(captionStyle.fontSizePx, 32)}px`
                }}
              >
                실시간 번역 자막 예시
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onDeleteSelectedComponent}
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
  );
}
