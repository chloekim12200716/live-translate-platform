import React, { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { BrainCircuit, Grid3X3, Layers, Settings, Tv } from "lucide-react";
import { mockPlatformChannel } from "../../data/mockPlatformData";

function navClass({ isActive }: { isActive: boolean }) {
  return `px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
    isActive ? "bg-indigo-600 text-white shadow-md" : "text-slate-300 hover:text-white"
  }`;
}

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col antialiased">
      <header className="bg-slate-900 text-white shadow-md border-b border-slate-800 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 flex-shrink-0 z-20">
        <Link to="/" className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-600/30">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div className="text-left">
            <h1 className="text-md font-extrabold tracking-tight flex items-center gap-2">
              MediCast CC <span className="text-[10px] bg-indigo-500/30 text-indigo-300 font-semibold px-2 py-0.5 rounded-full uppercase">AI-Powered</span>
            </h1>
            <p className="text-xs text-slate-400">의학행사 실시간 자막·통역 하이브리드 미디어 플랫폼</p>
          </div>
        </Link>

        <nav className="flex bg-slate-800 p-1 rounded-xl border border-slate-700/50">
          <NavLink to="/demo" className={navClass}>
            <Layers className="w-3.5 h-3.5" />
            통합 데모
          </NavLink>
          <NavLink to="/admin" end className={navClass}>
            <Settings className="w-3.5 h-3.5" />
            관리자
          </NavLink>
          <NavLink to="/admin/channels" className={navClass}>
            <Grid3X3 className="w-3.5 h-3.5" />
            채널
          </NavLink>
          <NavLink to={`/live/${mockPlatformChannel.slug}/en`} className={navClass}>
            <Tv className="w-3.5 h-3.5" />
            Live
          </NavLink>
        </nav>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 space-y-6">{children}</main>

      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-6 text-center text-xs mt-auto flex-shrink-0">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>MediCast Core System - AI 실시간 의학행사 자막·통역 플랫폼 v2.4</span>
          </div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-slate-200 transition">서비스 이용 약관</a>
            <span className="text-slate-700">|</span>
            <a href="#" className="hover:text-slate-200 transition">개인정보 처리방침</a>
            <span className="text-slate-700">|</span>
            <span className="font-mono text-slate-500">Powered by Gemini 3.5 Flash & Antigravity</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
