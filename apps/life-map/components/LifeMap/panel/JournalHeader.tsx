"use client";

import type { LifeNodeData } from "@/types/life-map";

export function JournalHeader({
  kind,
  node
}: {
  kind: string;
  node: LifeNodeData;
}) {
  const meta = [node.chapter ?? node.period, node.location].filter(Boolean).join(" · ");

  return (
    <header className="min-w-0">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#B76E3C]">{kind}</p>
      <h2 className="mt-2 text-2xl font-black leading-tight text-[#332A22]">{node.title}</h2>
      {node.subtitle ? <p className="mt-2 text-sm leading-6 text-[#7A6A58]">{node.subtitle}</p> : null}
      {meta ? <p className="mt-2 text-xs font-bold text-[#7A6A58]">{meta}</p> : null}
      {node.summary ? (
        <p className="mt-3 text-sm leading-7 text-[#332A22]">{node.summary}</p>
      ) : null}
    </header>
  );
}
