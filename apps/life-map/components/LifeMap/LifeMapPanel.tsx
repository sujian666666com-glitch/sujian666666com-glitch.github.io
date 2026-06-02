"use client";

import { HeartHandshake, Sparkles, Tags } from "lucide-react";
import type { LifeMapPayload, LifeNodeData } from "@/types/life-map";
import { useLifeMapStore } from "@/lib/life-map-store";
import { BossStickers } from "./panel/BossStickers";
import { EmotionTags } from "./panel/EmotionTags";
import { JournalHeader } from "./panel/JournalHeader";
import { PaperChipList } from "./panel/PaperChipList";
import { StickyNote } from "./panel/StickyNote";
import { StoryPath } from "./panel/StoryPath";

function PanelSection({
  icon: Icon,
  title,
  children
}: {
  icon: typeof Sparkles;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-[#332A22]">
        <Icon size={16} className="text-[#B76E3C]" />
        {title}
      </h3>
      {children}
    </section>
  );
}

export function LifeMapPanel({ node, payload }: { node: LifeNodeData | null; payload: LifeMapPayload }) {
  const setSelectedNode = useLifeMapStore((state) => state.setSelectedNode);

  if (!node) {
    return (
      <aside className="min-w-0 rounded-[8px] border border-[#D8C5A8] bg-[#FFF9EC] p-6 text-[#7A6A58] shadow-[4px_6px_0_rgba(216,197,168,0.45)] lg:min-h-[720px]">
        <p className="text-sm font-black uppercase tracking-[0.14em] text-[#B76E3C]">手账页</p>
        <h2 className="mt-4 text-2xl font-black text-[#332A22]">选择一个节点</h2>
        <p className="mt-3 leading-7">点击地图上的人物、关卡或青春小路节点，这里会展开对应的故事。</p>
      </aside>
    );
  }

  const affectedNodes = getAffectedNodes(node, payload);
  const panelKind = getPanelKind(node);
  const highlightNotes = pickStickyNotes(node);

  return (
    <aside className="relative min-w-0 rounded-[8px] border border-[#D8C5A8] bg-[#FFF9EC] p-5 text-[#332A22] shadow-[4px_6px_0_rgba(216,197,168,0.45)] lg:min-h-[720px]">
      <div className="absolute -right-2 -top-2 h-8 w-8 rotate-12 rounded-[3px] bg-[#D6A84F]/80" />
      <JournalHeader kind={panelKind} node={node} />

      {node.type === "person" ? (
        <>
          <PanelSection icon={HeartHandshake} title="TA 是谁">
            <p className="text-sm leading-7 text-[#332A22]">
              {[node.relationship, node.summary].filter(Boolean).join("。")}
            </p>
          </PanelSection>
          <PanelSection icon={Sparkles} title="影响过的关卡">
            <PaperChipList nodes={affectedNodes} onSelect={setSelectedNode} />
          </PanelSection>
          {node.emotion ? (
            <PanelSection icon={Tags} title="留下的情绪">
              <EmotionTags emotion={node.emotion} />
            </PanelSection>
          ) : null}
        </>
      ) : null}

      {node.defeatBy ? (
        <PanelSection icon={Sparkles} title="Boss 情报">
          <BossStickers defeatBy={node.defeatBy} />
        </PanelSection>
      ) : null}

      {node.branchId === "youth-love" && node.storyBeats?.length ? (
        <PanelSection icon={HeartHandshake} title="青春小路">
          <StoryPath beats={node.storyBeats} />
          {node.emotion ? (
            <div className="mt-4">
              <EmotionTags emotion={node.emotion} />
            </div>
          ) : null}
        </PanelSection>
      ) : null}

      {node.storyBeats?.length && node.branchId !== "youth-love" ? (
        <PanelSection icon={Sparkles} title={node.type === "awakening" ? "觉醒记录" : "故事段落"}>
          <StoryPath beats={node.storyBeats} />
        </PanelSection>
      ) : null}

      {node.type !== "person" && node.type !== "boss" && !node.branchId && highlightNotes.length ? (
        <PanelSection icon={Sparkles} title="关卡便签">
          <div className="space-y-3">
            {highlightNotes.map((note, index) => (
              <StickyNote key={note.title} title={note.title} tilt={index % 2 === 0 ? "left" : "right"}>
                {note.body}
              </StickyNote>
            ))}
          </div>
        </PanelSection>
      ) : null}

      {node.impact && node.type !== "person" && !node.branchId ? (
        <PanelSection icon={Sparkles} title="长远影响">
          <p className="text-sm leading-7">{node.impact}</p>
        </PanelSection>
      ) : null}

      {node.unlockedSkills?.length ? (
        <PanelSection icon={Sparkles} title="获得 / 解锁">
          <div className="flex flex-wrap gap-2">
            {node.unlockedSkills.map((skill) => (
              <span
                key={skill}
                className="rounded-[7px] border border-[#D8C5A8] bg-[#F3E8D2] px-3 py-1.5 text-xs font-black text-[#7A6A58]"
              >
                {skill}
              </span>
            ))}
          </div>
        </PanelSection>
      ) : null}

      {node.tags?.length ? (
        <PanelSection icon={Tags} title="纸质标签">
          <div className="flex flex-wrap gap-2">
            {node.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-[7px] border border-[#D8C5A8] bg-[#F7F1E5] px-3 py-1 text-xs font-bold text-[#7A6A58]"
              >
                #{tag}
              </span>
            ))}
          </div>
        </PanelSection>
      ) : null}
    </aside>
  );
}

function pickStickyNotes(node: LifeNodeData) {
  return [
    { title: "发生了什么", body: node.summary },
    { title: "获得", body: node.gain },
    { title: "失去", body: node.loss },
    { title: "下一关", body: node.nextStep }
  ].filter((item) => item.body);
}

function getAffectedNodes(node: LifeNodeData, payload: LifeMapPayload) {
  return payload.nodes.filter((item) => {
    if (item.id === node.id) return false;
    if (item.relatedPeopleIds?.includes(node.id)) return true;
    return node.id === "her" && item.branchId === "youth-love";
  });
}

function getPanelKind(node: LifeNodeData) {
  if (node.type === "person") return "人物纸卡";
  if (node.type === "boss") return "Boss 关卡";
  if (node.type === "awakening") return "觉醒点";
  if (node.branchId === "youth-love") return "青春支线";
  return "关卡纸卡";
}
