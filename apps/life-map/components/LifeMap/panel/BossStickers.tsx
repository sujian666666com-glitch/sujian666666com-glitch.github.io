"use client";

import type { LifeNodeDefeatBy } from "@/types/life-map";
import { StickyNote } from "./StickyNote";

export function BossStickers({ defeatBy }: { defeatBy: LifeNodeDefeatBy }) {
  const items: Array<[string, string]> = [
    ["弱点", defeatBy.weakness],
    ["代价", defeatBy.cost],
    ["击败方式", defeatBy.method],
    ["当前状态", defeatBy.status]
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map(([title, value], index) => (
        <StickyNote key={title} title={title} tilt={index % 2 === 0 ? "left" : "right"}>
          {value}
        </StickyNote>
      ))}
    </div>
  );
}
