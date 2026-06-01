"use client";

import { useLifeMapStore } from "@/lib/life-map-store";
import type { LifeStage } from "@/types/life-map";

export function LifeMapTimeline({ stages }: { stages: LifeStage[] }) {
  const selectedStageId = useLifeMapStore((state) => state.selectedStageId);
  const setStage = useLifeMapStore((state) => state.setStage);

  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.055] p-3 backdrop-blur-xl">
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setStage(null)}
          className={[
            "shrink-0 rounded-2xl px-4 py-3 text-left text-sm font-black transition",
            selectedStageId === null ? "bg-white text-slate-950" : "bg-slate-950/50 text-slate-300 hover:bg-white/10"
          ].join(" ")}
        >
          全阶段
        </button>
        {stages.map((stage, index) => (
          <button
            key={stage.id}
            type="button"
            onClick={() => setStage(stage.id)}
            className={[
              "shrink-0 rounded-2xl px-4 py-3 text-left transition",
              selectedStageId === stage.id ? "bg-amber-200 text-slate-950 shadow-glow" : "bg-slate-950/50 text-slate-300 hover:bg-white/10"
            ].join(" ")}
          >
            <span className="block text-[11px] font-black uppercase tracking-[0.16em] opacity-65">Stage {index + 1}</span>
            <span className="mt-1 block text-sm font-black">{stage.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
