"use client";

const legends = [
  ["人物贴纸", "bg-[#FFF9EC] border-[#D8C5A8]"],
  ["主线虚线", "bg-[#B76E3C] border-[#B76E3C]"],
  ["青春支线", "bg-[#8B6F9A] border-[#8B6F9A]"],
  ["Boss 压力", "bg-[#9A4A3F] border-[#9A4A3F]"],
  ["觉醒篝火", "bg-[#D6A84F] border-[#D6A84F]"],
  ["远方主城", "bg-[#7B9B6F] border-[#7B9B6F]"]
];

export function LifeMapLegend() {
  return (
    <div className="flex flex-wrap gap-2 rounded-[8px] border border-[#D8C5A8] bg-[#FFF9EC] p-3 text-xs font-bold text-[#7A6A58] shadow-[3px_4px_0_rgba(216,197,168,0.45)]">
      {legends.map(([label, color]) => (
        <span key={label} className="inline-flex items-center gap-2 rounded-[7px] border border-[#D8C5A8] bg-[#F3E8D2] px-3 py-1.5">
          <span className={`h-2.5 w-2.5 rounded-full border ${color}`} />
          {label}
        </span>
      ))}
    </div>
  );
}
