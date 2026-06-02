"use client";

import type { LifeNodeStoryBeat } from "@/types/life-map";

const beatOrder = ["发生了什么", "当时的情绪", "当时的我", "对我的影响", "后来的影响", "为什么遗憾", "为什么成为遗憾"];

export function StoryPath({ beats }: { beats: LifeNodeStoryBeat[] }) {
  const sorted = [...beats].sort((a, b) => {
    const ai = beatOrder.indexOf(a.label);
    const bi = beatOrder.indexOf(b.label);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return (
    <ol className="relative space-y-4 border-l-2 border-dashed border-[#8B6F9A]/50 pl-5">
      {sorted.map((beat, index) => (
        <li key={`${beat.label}-${index}`} className="relative">
          <span className="absolute -left-[1.65rem] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[#8B6F9A] bg-[#FAF5FF] text-[9px] font-black text-[#8B6F9A]">
            {index + 1}
          </span>
          <p className="text-xs font-black text-[#8B6F9A]">{beat.label}</p>
          <p className="mt-1 text-sm leading-6 text-[#332A22]">{beat.value}</p>
        </li>
      ))}
    </ol>
  );
}
