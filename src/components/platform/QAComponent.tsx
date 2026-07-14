import React from "react";
import { MessageSquare } from "lucide-react";

export default function QAComponent() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-white/15 bg-white/95 p-4 text-left shadow-2xl">
      <div className="mb-3 flex items-center gap-2 text-slate-800">
        <MessageSquare className="h-4 w-4 text-indigo-600" />
        <h2 className="text-sm font-bold">Q&A</h2>
      </div>
      <div className="space-y-3 overflow-y-auto">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="text-[11px] font-bold text-slate-500">Lee MD</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-800">
            What is the recommended eGFR cutoff for empagliflozin initiation?
          </p>
        </div>
        <div className="rounded-md border border-emerald-100 bg-emerald-50 p-3">
          <p className="text-[11px] font-bold text-emerald-700">Answered</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-700">
            The chair will address this during the renal protection section.
          </p>
        </div>
      </div>
    </div>
  );
}
