"use client";

import { SlidersHorizontal } from "lucide-react";
import { useLifeMapStore } from "@/lib/life-map-store";
import type { LifeMapFilter } from "@/types/life-map";

export const lifeMapFilters: LifeMapFilter[] = [
  { id: "all", label: "全部" },
  { id: "family", label: "家庭" },
  { id: "study", label: "学习" },
  { id: "relationship", label: "感情" },
  { id: "work", label: "工作" },
  { id: "boss", label: "Boss" },
  { id: "awakening", label: "觉醒点" },
  { id: "goal", label: "目标" }
];

export function LifeMapFilter() {
  const selectedFilter = useLifeMapStore((state) => state.selectedFilter);
  const setFilter = useLifeMapStore((state) => state.setFilter);

  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.055] p-2 backdrop-blur-xl">
      <div className="hidden items-center gap-2 px-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400 sm:flex">
        <SlidersHorizontal size={15} />
        Filter
      </div>
      <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1 sm:pb-0">
        {lifeMapFilters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setFilter(filter.id)}
            className={[
              "shrink-0 rounded-xl px-3.5 py-2 text-sm font-bold transition",
              selectedFilter === filter.id
                ? "bg-cyan-200 text-slate-950 shadow-glow"
                : "bg-slate-950/50 text-slate-300 hover:bg-white/10 hover:text-white"
            ].join(" ")}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  );
}
