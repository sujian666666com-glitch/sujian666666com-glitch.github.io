"use client";

import { motion } from "framer-motion";
import { Flame, Gem, Heart, Mail, MapPin, Trophy } from "lucide-react";
import type { LifeFlowNodeData, LifeVisualKind } from "@/types/life-map";
import { ChapterTag, NodeHandles, nodeStateClasses } from "./shared";

const youthVisuals: Partial<Record<LifeVisualKind, { icon: typeof Heart; shape: string }>> = {
  "branch-path": { icon: MapPin, shape: "rounded-[4px_12px_4px_12px] border-dashed" },
  treasure: { icon: Gem, shape: "rounded-[10px] rotate-3" },
  boss: { icon: Heart, shape: "rounded-[12px_4px_12px_4px] -rotate-2" },
  campfire: { icon: Flame, shape: "rounded-full" }
};

export function YouthStoryNode({ data }: { data: LifeFlowNodeData }) {
  const visual = youthVisuals[data.visualKind ?? "branch-path"] ?? youthVisuals["branch-path"]!;
  const Icon = data.id.includes("kiss") ? Trophy : data.id.includes("meet") ? Mail : visual.icon;

  return (
    <motion.div
      initial={false}
      whileHover={{ scale: 1.06 }}
      className={`relative w-[112px] transition-all ${nodeStateClasses(data)}`}
    >
      <NodeHandles />
      <div
        className={`border-2 border-[#8B6F9A] bg-[#FAF5FF] p-2.5 shadow-[2px_4px_0_rgba(139,111,154,0.35)] ${visual.shape}`}
      >
        <div className="mb-1.5 flex items-center justify-between gap-1">
          <Icon size={14} className="text-[#8B6F9A]" />
          <ChapterTag chapter={data.chapter} />
        </div>
        <h3 className="m-0 text-center text-[12px] font-black leading-tight text-[#5A3F62]">{data.mapLabel}</h3>
      </div>
      <div className="mx-auto mt-1 h-0.5 w-8 rounded-full bg-[#8B6F9A]/50" />
    </motion.div>
  );
}
