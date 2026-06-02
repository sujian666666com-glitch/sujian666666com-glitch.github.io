"use client";

import { Handle, Position } from "@xyflow/react";
import type { LifeFlowNodeData } from "@/types/life-map";

export function NodeHandles() {
  return (
    <>
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-[#FFF9EC] !bg-[#B76E3C]" />
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-[#FFF9EC] !bg-[#B76E3C]" />
    </>
  );
}

export function TapeCorner({ className = "" }: { className?: string }) {
  return <div className={`absolute -right-1.5 -top-1.5 h-4 w-4 rotate-12 rounded-[2px] bg-[#D6A84F]/75 shadow-sm ${className}`} />;
}

export function nodeStateClasses(data: LifeFlowNodeData) {
  return [
    data.dimmed ? "opacity-20 grayscale-[0.4] scale-90" : "opacity-100",
    data.highlighted ? "shadow-[5px_7px_0_rgba(214,168,79,0.42)] z-10" : "",
    data.selected ? "ring-4 ring-[#D6A84F]/60 ring-offset-2 ring-offset-[#F7F1E5]" : "ring-0"
  ].join(" ");
}

export function ChapterTag({ chapter }: { chapter?: string }) {
  if (!chapter) return null;
  return (
    <span className="rounded-[4px] border border-[#D8C5A8] bg-[#F3E8D2] px-1.5 py-0.5 text-[10px] font-black text-[#B76E3C]">
      {chapter}
    </span>
  );
}
