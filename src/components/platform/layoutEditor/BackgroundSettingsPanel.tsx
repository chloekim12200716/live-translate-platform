import React from "react";
import { PlatformLayout } from "../../../data/mockPlatformData";
import { backgroundFitOptions } from "../../../utils/layoutEditor";

interface BackgroundSettingsPanelProps {
  layout: PlatformLayout;
  onLayoutChange: React.Dispatch<React.SetStateAction<PlatformLayout>>;
}

export default function BackgroundSettingsPanel({ layout, onLayoutChange }: BackgroundSettingsPanelProps) {
  return (
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
              onLayoutChange((currentLayout) => ({
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
              onLayoutChange((currentLayout) => ({
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
              onLayoutChange((currentLayout) => ({
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
              onLayoutChange((currentLayout) => ({
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
              onLayoutChange((currentLayout) => ({
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
              onLayoutChange((currentLayout) => ({
                ...currentLayout,
                backgroundColor: event.target.value
              }))
            }
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 py-1"
          />
        </label>
      </div>
    </div>
  );
}
