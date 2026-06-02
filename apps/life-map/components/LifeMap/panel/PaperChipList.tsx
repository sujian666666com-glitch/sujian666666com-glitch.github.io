"use client";

import type { LifeNodeData } from "@/types/life-map";

export function PaperChipList({
  nodes,
  onSelect
}: {
  nodes: LifeNodeData[];
  onSelect?: (id: string) => void;
}) {
  if (!nodes.length) {
    return <p className="text-sm leading-6 text-[#7A6A58]">暂无标记的关联关卡。</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {nodes.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect?.(item.id)}
          className="rounded-[6px] border border-[#D8C5A8] bg-[#F7F1E5] px-3 py-1.5 text-left text-xs font-bold text-[#332A22] shadow-[1px_2px_0_rgba(216,197,168,0.4)] transition hover:-translate-y-0.5 hover:border-[#B76E3C]"
        >
          {item.title}
        </button>
      ))}
    </div>
  );
}
