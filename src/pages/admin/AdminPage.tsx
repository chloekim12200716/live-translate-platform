import React from "react";
import { Link } from "react-router-dom";
import AdminCMS from "../../components/AdminCMS";
import QAPanel from "../../components/QAPanel";
import { AppDataContext } from "../../types/appContext";

export default function AdminPage({
  appState,
  dictionary,
  updateServerState,
  fetchDictionary,
  handleAddQA,
  handleAnswerQA
}: AppDataContext) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Admin</p>
          <h2 className="text-2xl font-bold text-slate-900">관리자 콘솔</h2>
        </div>
        <Link
          to="/admin/channels"
          className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
        >
          채널 관리로 이동
        </Link>
      </div>

      <AdminCMS
        appState={appState}
        dictionary={dictionary}
        onUpdateState={updateServerState}
        onRefreshDictionary={fetchDictionary}
        currentVideoTime={appState.currentVideoTime}
      />

      <QAPanel
        qaList={appState.qaList}
        onAddQA={handleAddQA}
        onAnswerQA={handleAnswerQA}
        isAdmin={true}
      />
    </div>
  );
}
