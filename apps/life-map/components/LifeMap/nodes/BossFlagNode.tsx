"use client";

import { motion } from "framer-motion";
import { Flame, Skull } from "lucide-react";
import type { LifeFlowNodeData } from "@/types/life-map";
import { ChapterTag, NodeHandles, TapeCorner, nodeStateClasses } from "./shared";

export function BossFlagNode({ data }: { data: LifeFlowNodeData }) {
  return (
    <motion.div
      initial={false}
      animate={!data.dimmed ? { scale: [1, 1.03, 1] } : { scale: 1 }}
      transition={!data.dimmed ? { duration: 2.8, repeat: Infinity, ease: "easeInOut" } : { duration: 0.18 }}
      whileHover={{ scale: 1.04 }}
      className={`relative w-[140px] transition-all ${nodeStateClasses(data)}`}
    >
      <NodeHandles />
      <TapeCorner className="bg-[#9A4A3F]/80" />
      <div className="relative border-2 border-[#9A4A3F] bg-[#FFF5F2] px-3 py-3 shadow-[4px_6px_0_rgba(154,74,63,0.35)]">
        <div className="absolute -top-3 left-1/2 h-6 w-1 -translate-x-1/2 bg-[#9A4A3F]" />
        <div className="absolute -top-5 left-1/2 h-3 w-10 -translate-x-1/2 border-2 border-[#9A4A3F] bg-[#FFF5F2]" />
        <div className="mb-2 flex items-center justify-between gap-2">
          <Flame size={16} className="text-[#9A4A3F]" />
          <ChapterTag chapter={data.chapter} />
        </div>
        <div className="flex items-start gap-2">
          <Skull size={18} className="mt-0.5 shrink-0 text-[#9A4A3F]" />
          <h3 className="m-0 text-[13px] font-black leading-tight text-[#332A22]">{data.mapLabel}</h3>
        </div>
      </div>
    </motion.div>
  );
}
