"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Castle,
  CircleUserRound,
  Flame,
  Gem,
  HeartHandshake,
  Home,
  MapPin,
  ScrollText,
  Sparkles,
  Swords,
  Trophy
} from "lucide-react";
import type { LifeFlowNodeData, LifeNodeData } from "@/types/life-map";

const nodeStyles: Record<LifeNodeData["type"], { label: string; className: string; icon: typeof MapPin }> = {
  origin: { label: "起点", className: "border-[#B76E3C] bg-[#FFF9EC] text-[#332A22]", icon: MapPin },
  person: { label: "人物", className: "border-[#D8C5A8] bg-[#FFF9EC] text-[#332A22]", icon: CircleUserRound },
  family: { label: "家庭", className: "border-[#D8C5A8] bg-[#FFF9EC] text-[#332A22]", icon: HeartHandshake },
  stage: { label: "章节", className: "border-[#D8C5A8] bg-[#F3E8D2] text-[#332A22]", icon: BookOpen },
  event: { label: "事件", className: "border-[#D8C5A8] bg-[#FFF9EC] text-[#332A22]", icon: Sparkles },
  quest: { label: "任务", className: "border-[#7B9B6F] bg-[#FFF9EC] text-[#332A22]", icon: Swords },
  side_quest: { label: "支线", className: "border-[#8B6F9A] bg-[#FFF9EC] text-[#332A22]", icon: Gem },
  boss: { label: "Boss", className: "border-[#9A4A3F] bg-[#FFF9EC] text-[#332A22]", icon: Flame },
  awakening: { label: "觉醒", className: "border-[#D6A84F] bg-[#FFF9EC] text-[#332A22]", icon: Sparkles },
  reward: { label: "宝箱", className: "border-[#D6A84F] bg-[#FFF9EC] text-[#332A22]", icon: Trophy },
  goal: { label: "目标", className: "border-[#B76E3C] bg-[#FFF9EC] text-[#332A22]", icon: Castle }
};

type LifeMapNodeProps = NodeProps<Node<LifeFlowNodeData, "lifeMapNode">>;

export function LifeMapNode({ data }: LifeMapNodeProps) {
  const config = nodeStyles[data.type];
  const Icon = data.visualKind === "cottage" ? Home : data.visualKind === "quest-board" ? ScrollText : config.icon;
  const isBoss = data.type === "boss";
  const isAwakening = data.type === "awakening";
  const isImportantPerson = data.id === "me" || data.id === "grandma" || data.id === "her";
  const isYouth = data.branchId === "youth-love" || data.id === "her";

  return (
    <motion.div
      initial={false}
      animate={isBoss && !data.dimmed ? { scale: [1, 1.025, 1] } : { scale: 1 }}
      transition={isBoss ? { duration: 2.6, repeat: Infinity, ease: "easeInOut" } : { duration: 0.18 }}
      whileHover={{ scale: 1.035 }}
      className={[
        "relative w-[210px] rounded-[8px] border-2 p-3 shadow-[4px_6px_0_rgba(216,197,168,0.55)] transition-all",
        config.className,
        isImportantPerson ? "w-[230px]" : "",
        isYouth ? "border-[#8B6F9A]" : "",
        data.dimmed ? "opacity-25 grayscale-[0.35]" : "opacity-100",
        data.highlighted ? "shadow-[6px_8px_0_rgba(214,168,79,0.38)]" : "",
        data.selected ? "ring-4 ring-[#D6A84F]/60 ring-offset-2 ring-offset-[#F7F1E5]" : "ring-0"
      ].join(" ")}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-[#FFF9EC] !bg-[#B76E3C]" />
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-[#FFF9EC] !bg-[#B76E3C]" />
      {isAwakening && !data.dimmed ? <div className="absolute -inset-2 -z-10 rounded-[12px] bg-[#D6A84F]/22 blur-xl" /> : null}
      <div className="absolute -right-2 -top-2 h-5 w-5 rotate-12 rounded-[2px] bg-[#D6A84F]/75 shadow-sm" />
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-[6px] border border-[#D8C5A8] bg-[#F3E8D2] px-2.5 py-1 text-[11px] font-black text-[#7A6A58]">
          <Icon size={13} />
          {config.label}
        </span>
        <span className="text-xs font-black text-[#B76E3C]">{data.chapter ?? data.period ?? ""}</span>
      </div>
      <h3 className="m-0 text-[17px] font-black leading-tight tracking-normal text-[#332A22]">{data.title}</h3>
      {data.subtitle ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#7A6A58]">{data.subtitle}</p> : null}
      <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-[#7A6A58]">
        <span className="truncate">{data.period ?? "未知阶段"}</span>
        <span className="rounded-[5px] border border-[#D8C5A8] bg-[#F7F1E5] px-2 py-0.5">{data.status ?? "completed"}</span>
      </div>
      {isYouth ? <div className="mt-2 h-1 rounded-full bg-[#8B6F9A]/55" /> : null}
    </motion.div>
  );
}
