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
      {error ? <span className="text-sm font-semibold text-[#9A4A3F]">{error}</span> : null}
      <button
        type="button"
        onClick={handleExport}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-[8px] border border-[#B76E3C] bg-[#D6A84F] px-4 py-3 text-sm font-black text-[#332A22] shadow-[3px_4px_0_rgba(183,110,60,0.25)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Download size={16} />
        {busy ? "导出中" : "导出地图"}
      </button>
    </div>
  );
}
