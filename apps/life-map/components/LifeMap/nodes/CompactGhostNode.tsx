"use client";

import { motion } from "framer-motion";
import {
  CircleUserRound,
  Flame,
  Gem,
  Heart,
  Mail,
  MapPin,
  Sparkles
} from "lucide-react";
import type { LifeFlowNodeData } from "@/types/life-map";
import { NodeHandles, nodeStateClasses } from "./shared";

function renderGhostIcon(data: LifeFlowNodeData, className: string) {
  const size = 16;
  if (data.branchId === "youth-love") {
    if (data.id.includes("kiss")) return <Gem size={size} className={className} />;
    if (data.id.includes("regret") || data.visualKind === "campfire") return <Flame size={size} className={className} />;
    if (data.id.includes("meet")) return <Mail size={size} className={className} />;
    return <Heart size={size} className={className} />;
  }
  if (data.type === "person") return <CircleUserRound size={size} className={className} />;
  if (data.type === "boss") return <Flame size={size} className={className} />;
  return <MapPin size={size} className={className} />;
}

export function CompactGhostNode({ data }: { data: LifeFlowNodeData }) {
  const isYouth = data.branchId === "youth-love";
  const iconClass = isYouth ? "text-[#8B6F9A]" : "text-[#B76E3C]";

  return (
    <motion.div
      initial={false}
      whileHover={{ scale: 1.08 }}
      className={`relative flex w-[68px] flex-col items-center transition-all ${nodeStateClasses(data)}`}
    >
      <NodeHandles />
      <div
        className={`flex h-[44px] w-[44px] items-center justify-center rounded-full border-2 shadow-sm ${
          isYouth ? "border-[#8B6F9A]/60 bg-[#FAF5FF]/80" : "border-[#D8C5A8]/60 bg-[#FFF9EC]/80"
        }`}
      >
        {renderGhostIcon(data, iconClass)}
      </div>
      <p className="mt-1 max-w-[68px] truncate text-center text-[9px] font-bold leading-tight text-[#7A6A58]">
        {data.mapLabel}
      </p>
      {data.highlighted ? <Sparkles size={10} className="absolute -right-1 -top-1 text-[#D6A84F]" /> : null}
    </motion.div>
  );
}
