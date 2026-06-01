"use client";

import { BadgeCheck, Flame, HeartHandshake, MapPin, Sparkles, Tags } from "lucide-react";
import type { ReactNode } from "react";
import type { LifeMapPayload, LifeNodeData } from "@/types/life-map";

export function LifeMapPanel({ node, payload }: { node: LifeNodeData | null; payload: LifeMapPayload }) {
  if (!node) {
    return (
      <aside className="rounded-[8px] border border-[#D8C5A8] bg-[#FFF9EC] p-6 text-[#7A6A58] shadow-[4px_6px_0_rgba(216,197,168,0.45)] lg:min-h-[720px]">
        <p className="text-sm font-black uppercase tracking-[0.14em] text-[#B76E3C]">手账纸卡</p>
        <h2 className="mt-4 text-2xl font-black text-[#332A22]">选择一个节点</h2>
        <p className="mt-3 leading-7">点击地图上的人物、关卡、Boss 或青春支线节点后，这里会展开对应的故事细节。</p>
      </aside>
    );
  }

  const affectedNodes = getAffectedNodes(node, payload);
  const panelKind = getPanelKind(node);

  return (
    <aside className="relative rounded-[8px] border border-[#D8C5A8] bg-[#FFF9EC] p-5 text-[#332A22] shadow-[4px_6px_0_rgba(216,197,168,0.45)] lg:min-h-[720px]">
      <div className="absolute -right-2 -top-2 h-8 w-8 rotate-12 rounded-[3px] bg-[#D6A84F]/80" />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#B76E3C]">{panelKind}</p>
          <h2 className="mt-2 text-2xl font-black leading-tight text-[#332A22]">{node.title}</h2>
          {node.subtitle ? <p className="mt-2 text-sm leading-6 text-[#7A6A58]">{node.subtitle}</p> : null}
        </div>
        <span className="shrink-0 rounded-[7px] border border-[#D8C5A8] bg-[#F3E8D2] px-3 py-1 text-xs font-black text-[#7A6A58]">
          {node.status ?? "completed"}
        </span>
      </div>

      <div className="mt-5 grid gap-3 text-sm">
        <InfoRow icon={MapPin} label="章节 / 时间" value={node.period ?? node.chapter} />
        <InfoRow icon={MapPin} label="地点" value={node.location} />
      </div>

      <Section icon={BadgeCheck} title={getSummaryTitle(node)}>
        <p>{node.summary}</p>
        {node.impact ? <p className="mt-3 border-t border-[#D8C5A8] pt-3 font-semibold text-[#B76E3C]">{node.impact}</p> : null}
      </Section>

      {node.type === "person" ? (
        <Section icon={HeartHandshake} title="人物关系">
          <DetailGrid
            items={[
              ["TA 是谁", node.relationship],
              ["留下的情绪", node.emotion],
              ["影响了哪些关卡", affectedNodes.map((item) => item.title).join("、") || "暂无标记"]
            ]}
          />
        </Section>
      ) : null}

      {node.defeatBy ? (
        <Section icon={Flame} title="Boss 情报">
          <DetailGrid
            items={[
              ["弱点", node.defeatBy.weakness],
              ["代价", node.defeatBy.cost],
              ["击败方式", node.defeatBy.method],
              ["当前状态", node.defeatBy.status]
            ]}
          />
        </Section>
      ) : null}

      {node.type !== "person" && node.type !== "boss" && node.type !== "awakening" && !node.branchId ? (
        <Section icon={Sparkles} title="关卡记录">
          <DetailGrid
            items={[
              ["发生了什么", node.summary],
              ["谁影响了它", listRelatedPeople(node, payload)],
              ["获得", node.gain],
              ["失去", node.loss],
              ["下一关", node.nextStep]
            ]}
          />
        </Section>
      ) : null}

      {node.storyBeats?.length ? (
        <Section icon={Sparkles} title={node.branchId === "youth-love" ? "青春支线" : "觉醒记录"}>
          <div className="space-y-3">
            {node.storyBeats.map((beat) => (
              <div key={beat.label} className="rounded-[7px] border border-[#D8C5A8] bg-[#F7F1E5] p-3">
                <p className="text-xs font-black text-[#B76E3C]">{beat.label}</p>
                <p className="mt-1 text-sm leading-6 text-[#332A22]">{beat.value}</p>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {node.branchId === "youth-love" ? (
        <Section icon={HeartHandshake} title="长期影响">
          <DetailGrid
            items={[
              ["支线名称", node.branchLabel],
              ["当时的情绪", node.emotion],
              ["对我的影响", node.impact],
              ["为什么成为遗憾", node.loss ?? "它承载的不只是她，也是一条没有走成的人生线。"],
              ["和自我证明的关系", "它让出人头地不只是赢，也像是在回应过去那个不够成熟的自己。"]
            ]}
          />
        </Section>
      ) : null}

      {node.unlockedSkills?.length ? (
        <Section icon={Sparkles} title="获得 / 解锁">
          <div className="flex flex-wrap gap-2">
            {node.unlockedSkills.map((skill) => (
              <span key={skill} className="rounded-[7px] border border-[#D8C5A8] bg-[#F3E8D2] px-3 py-1.5 text-xs font-black text-[#7A6A58]">
                {skill}
              </span>
            ))}
          </div>
        </Section>
      ) : null}

      {node.tags?.length ? (
        <Section icon={Tags} title="纸质标签">
          <div className="flex flex-wrap gap-2">
            {node.tags.map((tag) => (
              <span key={tag} className="rounded-[7px] border border-[#D8C5A8] bg-[#F7F1E5] px-3 py-1 text-xs font-bold text-[#7A6A58]">
                #{tag}
              </span>
            ))}
          </div>
        </Section>
      ) : null}
    </aside>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof BadgeCheck; title: string; children: ReactNode }) {
  return (
    <section className="mt-5 rounded-[8px] border border-[#D8C5A8] bg-[#FFF9EC] p-4 text-sm leading-7 shadow-[2px_3px_0_rgba(216,197,168,0.32)]">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-[#332A22]">
        <Icon size={16} className="text-[#B76E3C]" />
        {title}
      </h3>
      {children}
    </section>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[8px] border border-[#D8C5A8] bg-[#F3E8D2] px-3 py-3">
      <Icon size={16} className="text-[#B76E3C]" />
      <span className="min-w-20 text-[#7A6A58]">{label}</span>
      <span className="min-w-0 flex-1 truncate font-bold text-[#332A22]">{value ?? "未标记"}</span>
    </div>
  );
}

function DetailGrid({ items }: { items: Array<[string, string | undefined]> }) {
  return (
    <div className="space-y-3">
      {items
        .filter(([, value]) => value)
        .map(([label, value]) => (
          <div key={label} className="rounded-[7px] border border-[#D8C5A8] bg-[#F7F1E5] p-3">
            <p className="text-xs font-black text-[#B76E3C]">{label}</p>
            <p className="mt-1 text-sm leading-6 text-[#332A22]">{value}</p>
          </div>
        ))}
    </div>
  );
}

function getAffectedNodes(node: LifeNodeData, payload: LifeMapPayload) {
  return payload.nodes.filter((item) => {
    if (item.id === node.id) return false;
    if (item.relatedPeopleIds?.includes(node.id)) return true;
    return node.id === "her" && item.branchId === "youth-love";
  });
}

function listRelatedPeople(node: LifeNodeData, payload: LifeMapPayload) {
  const names =
    node.relatedPeopleIds
      ?.map((id) => payload.nodes.find((item) => item.id === id && item.type === "person")?.title)
      .filter(Boolean)
      .join("、") ?? "";
  return names || "主要由我自己的选择与阶段环境推动";
}

function getPanelKind(node: LifeNodeData) {
  if (node.type === "person") return "人物纸卡";
  if (node.type === "boss") return "Boss 关卡";
  if (node.type === "awakening") return "觉醒点";
  if (node.branchId === "youth-love") return "青春支线";
  return "关卡纸卡";
}

function getSummaryTitle(node: LifeNodeData) {
  if (node.type === "person") return "TA 是谁";
  if (node.type === "boss") return "发生了什么";
  if (node.type === "awakening") return "前因与触发";
  if (node.branchId === "youth-love") return "这段支线";
  return "关卡简介";
}
