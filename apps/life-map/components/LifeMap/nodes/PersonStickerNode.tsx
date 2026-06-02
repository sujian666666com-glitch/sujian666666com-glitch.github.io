"use client";

import { motion } from "framer-motion";
import { CircleUserRound, Sparkles } from "lucide-react";
import type { LifeFlowNodeData } from "@/types/life-map";
import { shouldShowSubtitle } from "@/lib/life-map-display";
import { ChapterTag, NodeHandles, TapeCorner, nodeStateClasses } from "./shared";

const avatarColors: Record<string, string> = {
  self: "from-[#D6A84F] to-[#B76E3C]",
  guardian: "from-[#7B9B6F] to-[#5A7A4F]",
  future: "from-[#8B6F9A] to-[#6B4F7A]",
  avatar: "from-[#D8C5A8] to-[#B76E3C]"
};

export function PersonStickerNode({ data }: { data: LifeFlowNodeData }) {
  const isHero = data.displayTier === "hero";
  const gradient = avatarColors[data.visualKind ?? "avatar"] ?? avatarColors.avatar;
  const size = isHero ? "h-[88px] w-[88px]" : data.displayTier === "compact" ? "h-[56px] w-[56px]" : "h-[72px] w-[72px]";
  const width = isHero ? "w-[168px]" : data.displayTier === "compact" ? "w-[96px]" : "w-[128px]";

  return (
    <motion.div
      initial={false}
      whileHover={{ scale: 1.04 }}
      className={`relative flex flex-col items-center ${width} transition-all ${nodeStateClasses(data)}`}
    >
      <NodeHandles />
      {isHero ? <TapeCorner /> : null}
      <div
        className={`relative flex ${size} items-center justify-center rounded-full border-[3px] border-[#D8C5A8] bg-gradient-to-br ${gradient} shadow-[3px_5px_0_rgba(216,197,168,0.55)]`}
      >
        {data.visualKind === "guardian" ? (
          <Sparkles size={isHero ? 28 : 20} className="text-[#FFF9EC]" />
        ) : (
          <CircleUserRound size={isHero ? 32 : 22} className="text-[#FFF9EC]" />
        )}
        {data.branchId === "youth-love" || data.id === "her" ? (
          <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-[#FFF9EC] bg-[#8B6F9A]" />
        ) : null}
      </div>
      <div className="mt-2 w-full text-center">
        <div className="mb-1 flex justify-center">{isHero ? <ChapterTag chapter={data.chapter} /> : null}</div>
        <h3 className={`m-0 font-black leading-tight text-[#332A22] ${isHero ? "text-[17px]" : "text-[13px]"}`}>
          {data.mapLabel}
        </h3>
        {shouldShowSubtitle(data, data.displayTier) ? (
          <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[#7A6A58]">{data.subtitle}</p>
        ) : null}
      </div>
    </motion.div>
  );
}
