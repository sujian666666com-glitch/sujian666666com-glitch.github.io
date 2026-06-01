"use client";

const legends = [
  ["起点", "bg-yellow-300"],
  ["NPC", "bg-amber-300"],
  ["主线", "bg-emerald-300"],
  ["支线", "bg-violet-300"],
  ["Boss", "bg-red-400"],
  ["觉醒", "bg-yellow-100"],
  ["目标", "bg-stone-100"]
];

export function LifeMapLegend() {
  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-slate-950/54 p-3 text-xs text-slate-300 backdrop-blur-xl">
      {legends.map(([label, color]) => (
        <span key={label} className="inline-flex items-center gap-2 rounded-full bg-white/[0.055] px-3 py-1.5">
          <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
          {label}
        </span>
      ))}
    </div>
  );
}
