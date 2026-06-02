"use client";

export function EmotionTags({ emotion }: { emotion?: string }) {
  if (!emotion) return null;

  const tags = emotion
    .split(/[、,，]/)
    .map((item) => item.trim())
    .filter(Boolean);

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded-full border border-[#8B6F9A]/40 bg-[#FAF5FF] px-3 py-1 text-xs font-bold text-[#5A3F62]"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
