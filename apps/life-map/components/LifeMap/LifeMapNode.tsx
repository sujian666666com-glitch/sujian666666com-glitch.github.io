"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Castle,
  Flame,
  Gem,
  HeartHandshake,
  MapPin,
  Sparkles,
  Swords,
  Trophy
} from "lucide-react";
import type { LifeFlowNodeData, LifeNodeData } from "@/types/life-map";

const nodeStyles: Record<LifeNodeData["type"], { label: string; className: string; icon: typeof MapPin }> = {
  origin: { label: "起点", className: "border-yellow-300/60 bg-yellow-500/15 text-yellow-100", icon: MapPin },
  family: { label: "NPC", className: "border-amber-300/60 bg-amber-500/15 text-amber-100", icon: HeartHandshake },
  stage: { label: "阶段", className: "border-slate-300/50 bg-slate-400/12 text-slate-100", icon: BookOpen },
  event: { label: "事件", className: "border-zinc-200/40 bg-zinc-300/10 text-zinc-100", icon: Sparkles },
  quest: { label: "主线", className: "border-emerald-300/60 bg-emerald-500/15 text-emerald-100", icon: Swords },
  side_quest: { label: "支线", className: "border-violet-300/60 bg-violet-500/15 text-violet-100", icon: Gem },
  boss: { label: "Boss", className: "border-red-300/70 bg-red-500/18 text-red-100", icon: Flame },
  awakening: { label: "觉醒", className: "border-yellow-200/80 bg-yellow-400/18 text-yellow-50", icon: Sparkles },
  reward: { label: "宝箱", className: "border-orange-300/60 bg-orange-500/15 text-orange-100", icon: Trophy },
  goal: { label: "终点", className: "border-stone-100/80 bg-stone-100/15 text-stone-50", icon: Castle }
};

type LifeMapNodeProps = NodeProps<Node<LifeFlowNodeData, "lifeMapNode">>;

export function LifeMapNode({ data }: LifeMapNodeProps) {
  const config = nodeStyles[data.type];
  const Icon = config.icon;
  const isBoss = data.type === "boss";
  const isAwakening = data.type === "awakening";

  return (
    <motion.div
      initial={false}
      animate={isBoss ? { scale: [1, 1.025, 1] } : { scale: 1 }}
      transition={isBoss ? { duration: 2.6, repeat: Infinity, ease: "easeInOut" } : { duration: 0.18 }}
      whileHover={{ scale: 1.035 }}
      className={[
        "relative w-[210px] rounded-[18px] border p-4 shadow-panel backdrop-blur-xl transition-colors",
        config.className,
        data.selected ? "ring-2 ring-cyan-200/80 ring-offset-2 ring-offset-slate-950" : "ring-0"
      ].join(" ")}
    >
      <Handle type="target" position={Position.Left} className="!border-slate-950 !bg-cyan-200" />
      <Handle type="source" position={Position.Right} className="!border-slate-950 !bg-cyan-200" />
      {isAwakening ? <div className="absolute -inset-3 -z-10 rounded-[24px] bg-yellow-300/20 blur-xl" /> : null}
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-black/22 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white/78">
          <Icon size={13} />
          {config.label}
        </span>
        <span className="text-xs font-bold text-white/60">EXP {data.exp ?? 0}</span>
      </div>
      <h3 className="m-0 text-[17px] font-black leading-tight tracking-normal text-white">{data.title}</h3>
      {data.subtitle ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/68">{data.subtitle}</p> : null}
      <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-white/54">
        <span className="truncate">{data.period ?? "未知阶段"}</span>
        <span className="rounded-full bg-white/10 px-2 py-0.5">{data.status ?? "completed"}</span>
      </div>
    </motion.div>
  );
}
