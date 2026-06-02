import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RELAYOUT_POSITIONS = JSON.parse(
  fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "relayout-positions.json"), "utf8")
);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.resolve(__dirname, "../data/life-map-data.server.ts");
let content = fs.readFileSync(dataPath, "utf8");

for (const [id, layout] of Object.entries(RELAYOUT_POSITIONS)) {
  const block = `modePosition: {
      relationship: { desktop: { x: ${layout.relationship.desktop.x}, y: ${layout.relationship.desktop.y} }, mobile: { x: ${layout.relationship.mobile.x}, y: ${layout.relationship.mobile.y} } },
      route: { desktop: { x: ${layout.route.desktop.x}, y: ${layout.route.desktop.y} }, mobile: { x: ${layout.route.mobile.x}, y: ${layout.route.mobile.y} } }
    }`;

  const idPattern = new RegExp(
    `(id: "${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[\\s\\S]*?)modePosition: \\{[\\s\\S]*?\\n    \\}`,
    "m"
  );

  if (!idPattern.test(content)) {
    console.warn(`Missing node: ${id}`);
    continue;
  }

  content = content.replace(idPattern, `$1${block}`);
}

fs.writeFileSync(dataPath, content);
console.log("Updated modePosition for", Object.keys(RELAYOUT_POSITIONS).length, "nodes");
