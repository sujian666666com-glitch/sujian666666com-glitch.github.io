"use client";

import { BadgeCheck, Clock3, MapPin, Star, Tags } from "lucide-react";
import type { LifeNodeData } from "@/types/life-map";

export function LifeMapPanel({ node }: { node: LifeNodeData | null }) {
  if (!node) {
    return (
      <aside className="rounded-[22px] border border-white/10 bg-white/[0.055] p-6 text-slate-300 shadow-panel backdrop-blur-xl lg:min-h-[680px]">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Node Detail</p>
        <h2 className="mt-4 text-2xl font-black text-white">选择一个节点</h2>
        <p className="mt-3 leading-7 text-slate-400">点击地图上的关卡卡片后，这里会显示对应的人生阶段、影响和解锁能力。</p>
      </aside>
    );
  }

  return (
    <aside className="rounded-[22px] border border-white/10 bg-white/[0.065] p-5 shadow-panel backdrop-blur-2xl lg:min-h-[680px]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">{node.type}</p>
          <h2 className="mt-2 text-2xl font-black leading-tight text-white">{node.title}</h2>
          {node.subtitle ? <p className="mt-2 text-sm leading-6 text-slate-300">{node.subtitle}</p> : null}
        </div>
        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-slate-200">
          {node.status ?? "completed"}
        </span>
      </div>

      <div className="mt-5 grid gap-3 text-sm text-slate-300">
        <InfoRow icon={Clock3} label="阶段 / 时间" value={node.period} />
        <InfoRow icon={MapPin} label="地点" value={node.location} />
        <InfoRow icon={Star} label="获得经验" value={node.exp ? `${node.exp} EXP` : undefined} />
      </div>

      <section className="mt-6 rounded-2xl border border-white/10 bg-slate-950/44 p-4">
        <h3 className="flex items-center gap-2 text-sm font-black text-white">
          <BadgeCheck size={16} />
          简介
        </h3>
        <p className="mt-3 text-sm leading-7 text-slate-300">{node.summary}</p>
        {node.impact ? <p className="mt-3 border-t border-white/10 pt-3 text-sm leading-7 text-amber-100/86">{node.impact}</p> : null}
      </section>

      {node.unlockedSkills?.length ? (
        <section className="mt-5">
          <h3 className="text-sm font-black text-white">解锁能力</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {node.unlockedSkills.map((skill) => (
              <span key={skill} className="rounded-full bg-cyan-200/12 px-3 py-1.5 text-xs font-bold text-cyan-100">
                {skill}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {node.tags?.length ? (
        <section className="mt-5">
          <h3 className="flex items-center gap-2 text-sm font-black text-white">
            <Tags size={15} />
            标签
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {node.tags.map((tag) => (
              <span key={tag} className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-xs text-slate-300">
                #{tag}
              </span>
            ))}
          </div>
        </section>
      ) : null}
    </aside>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/34 px-3 py-3">
      <Icon size={16} className="text-cyan-200" />
      <span className="min-w-20 text-slate-500">{label}</span>
      <span className="min-w-0 flex-1 truncate font-semibold text-slate-200">{value ?? "未标记"}</span>
    </div>
  );
}
