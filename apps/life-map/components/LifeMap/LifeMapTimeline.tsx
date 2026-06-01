"use client";

import { useLifeMapStore } from "@/lib/life-map-store";
import type { LifeStage } from "@/types/life-map";

export function LifeMapTimeline({ stages }: { stages: LifeStage[] }) {
  const selectedStageId = useLifeMapStore((state) => state.selectedStageId);
  const setStage = useLifeMapStore((state) => state.setStage);

  return (
    <div className="rounded-[8px] border border-[#D8C5A8] bg-[#FFF9EC] p-3 shadow-[3px_4px_0_rgba(216,197,168,0.45)]">
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setStage(null)}
          className={[
            "shrink-0 rounded-[7px] border px-4 py-3 text-left text-sm font-black transition",
            selectedStageId === null
              ? "border-[#B76E3C] bg-[#D6A84F] text-[#332A22]"
              : "border-[#D8C5A8] bg-[#F3E8D2] text-[#7A6A58] hover:border-[#B76E3C]"
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
              "shrink-0 rounded-[7px] border px-4 py-3 text-left transition",
              selectedStageId === stage.id
                ? "border-[#B76E3C] bg-[#D6A84F] text-[#332A22] shadow-[2px_3px_0_rgba(183,110,60,0.25)]"
                : "border-[#D8C5A8] bg-[#F3E8D2] text-[#7A6A58] hover:border-[#B76E3C]"
            ].join(" ")}
          >
            <span className="block text-[11px] font-black uppercase tracking-[0.14em] opacity-65">Chapter {index + 1}</span>
            <span className="mt-1 block text-sm font-black">{stage.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
