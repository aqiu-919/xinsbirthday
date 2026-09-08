import fs from "node:fs/promises";

// Complete merged archive export only. Source of truth is the exported Feishu bitable JSON.

const sourcePath = "sources/feishu/公开活动合集.json";
const archivePath = "site/data/archive.json";
const timelinePath = "site/data/timeline.json";

const archive = JSON.parse(await fs.readFile(sourcePath, "utf8"));
await fs.mkdir("site/data", { recursive: true });
await fs.writeFile(archivePath, JSON.stringify(archive, null, 2), "utf8");
const timeline = JSON.parse(await fs.readFile(timelinePath, "utf8"));
console.log(JSON.stringify({
  sourcePath,
  archiveRows: archive.length,
  independentTimelineRows: timeline.length,
  first: archive[0],
  last: archive.at(-1),
}, null, 2));
