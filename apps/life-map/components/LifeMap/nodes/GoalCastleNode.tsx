"use client";

import { motion } from "framer-motion";
import { Castle } from "lucide-react";
import type { LifeFlowNodeData } from "@/types/life-map";
import { ChapterTag, NodeHandles, TapeCorner, nodeStateClasses } from "./shared";

export function GoalCastleNode({ data }: { data: LifeFlowNodeData }) {
  const isHero = data.displayTier === "hero";

  return (
    <motion.div
      initial={false}
      whileHover={{ scale: 1.03 }}
      className={`relative ${isHero ? "w-[200px]" : "w-[180px]"} transition-all ${nodeStateClasses(data)}`}
    >
      <NodeHandles />
      <TapeCorner />
      <div className="border-2 border-[#B76E3C] bg-gradient-to-b from-[#FFF9EC] to-[#F3E8D2] px-4 py-4 shadow-[5px_7px_0_rgba(183,110,60,0.35)]">
        <div className="mb-2 flex items-center justify-between gap-2">
          <Castle size={isHero ? 28 : 22} className="text-[#B76E3C]" />
          <ChapterTag chapter={data.chapter} />
        </div>
        <h3 className={`m-0 font-black leading-tight text-[#332A22] ${isHero ? "text-[18px]" : "text-[15px]"}`}>
          {data.mapLabel}
        </h3>
        {isHero && data.subtitle ? (
          <p className="mt-1 text-[11px] leading-4 text-[#7A6A58]">{data.subtitle}</p>
        ) : null}
      </div>
    </motion.div>
  );
}
