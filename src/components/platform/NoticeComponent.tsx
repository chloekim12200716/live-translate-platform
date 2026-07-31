import React from "react";
import { Megaphone } from "lucide-react";

export default function NoticeComponent() {
  return (
    <div className="flex h-full min-h-0 items-center overflow-hidden rounded-lg border border-amber-200/30 bg-amber-100/95 px-4 py-3 text-left text-amber-950 shadow-2xl">
      <Megaphone className="mr-3 h-5 w-5 flex-shrink-0 text-amber-700" />
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Notice</p>
        <p className="truncate text-sm font-semibold">
          Channel interpretation is provided as real-time AI captions for demonstration.
        </p>
      </div>
    </div>
  );
}
