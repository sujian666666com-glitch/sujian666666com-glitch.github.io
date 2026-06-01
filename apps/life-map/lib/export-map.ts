"use client";

import { toPng } from "html-to-image";

export async function exportMapAsPng(element: HTMLElement, fileName = "life-map.png") {
  const dataUrl = await toPng(element, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: "#F7F1E5",
    filter: (node) => !(node instanceof HTMLElement && node.classList.contains("no-map-export"))
  });

  const link = document.createElement("a");
  link.download = fileName;
  link.href = dataUrl;
  link.click();
}
