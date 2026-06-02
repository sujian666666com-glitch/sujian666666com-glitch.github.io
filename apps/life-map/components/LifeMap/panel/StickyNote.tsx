"use client";

import type { ReactNode } from "react";

export function StickyNote({
  title,
  children,
  tilt = "left"
}: {
  title?: string;
  children: ReactNode;
  tilt?: "left" | "right" | "none";
}) {
  const rotate = tilt === "left" ? "-rotate-1" : tilt === "right" ? "rotate-1" : "";

  return (
    <div className={`relative ${rotate}`}>
      <div className="absolute -left-1 top-0 h-3 w-8 bg-[#D6A84F]/45" />
      <div className="rounded-[6px] border border-[#D8C5A8] bg-[#FFFDE8] p-3 shadow-[2px_3px_0_rgba(216,197,168,0.35)]">
        {title ? <p className="text-xs font-black text-[#B76E3C]">{title}</p> : null}
        <div className={title ? "mt-1 text-sm leading-6 text-[#332A22]" : "text-sm leading-6 text-[#332A22]"}>
          {children}
        </div>
      </div>
    </div>
  );
}
