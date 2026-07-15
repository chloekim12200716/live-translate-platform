import React from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Settings2 } from "lucide-react";
import {
  mockDisplayUrls,
  mockPlatformData
} from "../../data/mockPlatformData";

const captionPlayerOptions = {
  languages: ["Arabic", "Chinese", "English", "French", "Korean", "Russian", "Spanish"],
  themes: ["High Contrast", "Terminal", "Notepad", "Default"],
  fontSizes: ["18", "24", "30", "36", "48", "60"],
  fontFamilies: ["Arial", "Courier New", "Helvetica", "Verdana"],
  controls: ["View Transcript", "Show/Hide Header", "Scroll", "Whole Words"]
};

export default function AdminSessionsPage() {
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

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Caption Player Configuration</h3>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              StreamText player demo를 참고한 시청자 자막 플레이어 설정 초안입니다.
            </p>
          </div>
          <a
            href="https://www.streamtext.net/player/?event=ihaveadream"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            Reference Demo
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Object.entries(captionPlayerOptions).map(([groupName, values]) => (
            <div key={groupName} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{groupName}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {values.map((value) => (
                  <span
                    key={value}
                    className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700"
                  >
                    {value}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-cyan-100 bg-cyan-50 p-4 text-xs leading-relaxed text-cyan-900">
          현재 구현: `/live/:sessionSlug/:languageCode` 우측 상단 `View Transcript`, 우하단 `Show/Hide Header`, 실시간 demo stream Start/Stop.
          다음 단계에서 이 설정들을 DB 저장 가능한 player preset으로 분리할 수 있습니다.
        </div>
      </div>
    </div>
  );
}
