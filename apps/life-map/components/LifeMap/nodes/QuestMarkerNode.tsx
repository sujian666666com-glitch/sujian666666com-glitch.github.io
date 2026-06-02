"use client";

import { motion } from "framer-motion";
import { BookOpen, Flame, Home, MapPin, ScrollText, Sparkles, Swords, Trophy } from "lucide-react";
import type { LifeFlowNodeData, LifeVisualKind } from "@/types/life-map";
import { ChapterTag, NodeHandles, TapeCorner, nodeStateClasses } from "./shared";

const markerStyles: Partial<Record<LifeVisualKind, { icon: typeof MapPin; shell: string; rotate?: string }>> = {
  signpost: { icon: MapPin, shell: "rounded-[6px_6px_6px_2px] border-[#B76E3C] bg-[#FFF3D6]", rotate: "-2deg" },
  cottage: { icon: Home, shell: "rounded-[10px_10px_4px_4px] border-[#7B9B6F] bg-[#F0F8EC]", rotate: "1deg" },
  "quest-board": { icon: ScrollText, shell: "rounded-[4px] border-[#7B9B6F] bg-[#FFF9EC]", rotate: "-1deg" },
  campfire: { icon: Flame, shell: "rounded-full border-[#D6A84F] bg-[#FFF3D6]", rotate: "0deg" },
  treasure: { icon: Trophy, shell: "rounded-[8px] border-[#D6A84F] bg-[#FFF9EC]", rotate: "3deg" },
  teacher: { icon: BookOpen, shell: "rounded-[6px] border-[#7B9B6F] bg-[#F3E8D2]", rotate: "-1deg" }
};

const typeFallback = {
  origin: { icon: MapPin, shell: "rounded-[6px_6px_6px_2px] border-[#B76E3C] bg-[#FFF3D6]" },
  quest: { icon: Swords, shell: "rounded-[6px] border-[#7B9B6F] bg-[#FFF9EC]" },
  stage: { icon: Home, shell: "rounded-[10px] border-[#D8C5A8] bg-[#F3E8D2]" },
  event: { icon: Sparkles, shell: "rounded-[6px] border-[#D8C5A8] bg-[#FFF9EC]" },
  reward: { icon: Trophy, shell: "rounded-[8px] border-[#D6A84F] bg-[#FFF9EC]" },
  awakening: { icon: Sparkles, shell: "rounded-full border-[#D6A84F] bg-[#FFF3D6]" },
  side_quest: { icon: Sparkles, shell: "rounded-[6px] border-[#8B6F9A] bg-[#FFF9EC]" }
};

export function QuestMarkerNode({ data }: { data: LifeFlowNodeData }) {
  const visual =
    (data.visualKind && markerStyles[data.visualKind]) ??
    typeFallback[data.type as keyof typeof typeFallback] ??
    typeFallback.quest;
  const Icon = visual.icon;
  const isAwakening = data.type === "awakening";

  return (
    <motion.div
      initial={false}
      whileHover={{ scale: 1.04 }}
      className={`relative w-[136px] transition-all ${nodeStateClasses(data)}`}
      style={{ transform: `rotate(${("rotate" in visual && visual.rotate) || markerStyles[data.visualKind ?? "signpost"]?.rotate || "0deg"})` }}
    >
      <NodeHandles />
      <TapeCorner />
      {isAwakening && !data.dimmed ? <div className="absolute -inset-2 -z-10 rounded-full bg-[#D6A84F]/20 blur-lg" /> : null}
      <div className={`border-2 p-3 shadow-[3px_5px_0_rgba(216,197,168,0.5)] ${visual.shell}`}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <Icon size={18} className="text-[#B76E3C]" />
          <ChapterTag chapter={data.chapter} />
        </div>
        <h3 className="m-0 text-[14px] font-black leading-tight text-[#332A22]">{data.mapLabel}</h3>
      </div>
    </motion.div>
  );
}
