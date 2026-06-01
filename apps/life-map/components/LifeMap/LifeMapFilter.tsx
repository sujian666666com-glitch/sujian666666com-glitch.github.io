"use client";

import { SlidersHorizontal } from "lucide-react";
import { useLifeMapStore } from "@/lib/life-map-store";
import type { LifeMapFilter } from "@/types/life-map";

export const lifeMapFilters: LifeMapFilter[] = [
  { id: "all", label: "全部" },
  { id: "family", label: "家庭" },
  { id: "youth", label: "青春" },
  { id: "study", label: "学习" },
  { id: "work", label: "工作" },
  { id: "boss", label: "Boss" },
  { id: "awakening", label: "觉醒" },
  { id: "goal", label: "目标" }
];

export function LifeMapFilter() {
  const selectedFilter = useLifeMapStore((state) => state.selectedFilter);
  const setFilter = useLifeMapStore((state) => state.setFilter);

  return (
    <div className="flex min-w-0 items-center gap-3 rounded-[8px] border border-[#D8C5A8] bg-[#FFF9EC] p-2 shadow-[3px_4px_0_rgba(216,197,168,0.45)]">
      <div className="hidden items-center gap-2 px-2 text-xs font-black uppercase tracking-[0.14em] text-[#7A6A58] sm:flex">
        <SlidersHorizontal size={15} />
        标签
      </div>
      <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1 sm:pb-0">
        {lifeMapFilters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setFilter(filter.id)}
            className={[
              "shrink-0 rounded-[7px] border px-3.5 py-2 text-sm font-black transition",
              selectedFilter === filter.id
                ? "border-[#B76E3C] bg-[#D6A84F] text-[#332A22] shadow-[2px_3px_0_rgba(183,110,60,0.25)]"
                : "border-[#D8C5A8] bg-[#F3E8D2] text-[#7A6A58] hover:border-[#B76E3C] hover:text-[#332A22]"
            ].join(" ")}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  );
}
