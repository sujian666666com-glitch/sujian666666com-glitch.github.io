"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { exportMapAsPng } from "@/lib/export-map";

export function ExportButton({ targetId }: { targetId: string }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleExport() {
    const element = document.getElementById(targetId);
    if (!element) {
      setError("没有找到地图区域");
      return;
    }

    setBusy(true);
    setError("");
    try {
      await exportMapAsPng(element);
    } catch {
      setError("导出失败，请稍后重试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {error ? <span className="text-sm font-semibold text-red-200">{error}</span> : null}
      <button
        type="button"
        onClick={handleExport}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Download size={16} />
        {busy ? "导出中" : "导出地图"}
      </button>
    </div>
  );
}
