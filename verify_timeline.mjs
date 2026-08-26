import fs from "node:fs/promises";

const timelinePath = "site/data/timeline.json";
const timeline = JSON.parse(await fs.readFile(timelinePath, "utf8"));
const errors = [];
const requiredFields = ["活动ID", "顺序", "日期精度", "年份", "活动/事件名称", "文字介绍", "素材展示", "来源URL", "是否是特殊节点"];

for (const [index, event] of timeline.entries()) {
  for (const field of requiredFields) {
    if (event[field] == null) errors.push(`第 ${index + 1} 条缺少字段：${field}`);
  }
  if (event["顺序"] !== index + 1) errors.push(`第 ${index + 1} 条顺序字段应为 ${index + 1}`);
  if (!/^\d{4}\/\d{2}\/\d{2}$/.test(event["日期精度"])) errors.push(`第 ${index + 1} 条日期格式错误：${event["日期精度"]}`);
  if (String(event["年份"]) !== String(event["日期精度"]).slice(0, 4)) errors.push(`第 ${index + 1} 条年份与日期不一致`);
  if (!["", "是"].includes(event["是否是特殊节点"])) errors.push(`第 ${index + 1} 条特殊节点字段只能为“是”或空白`);
  if (event["素材展示"] && !event["素材展示"].startsWith("assets/timeline/")) errors.push(`第 ${index + 1} 条图片路径不在时间轴素材目录`);
}

const duplicateIds = Object.entries(Object.groupBy(timeline, (event) => event["活动ID"]))
  .filter(([, rows]) => rows.length > 1)
  .map(([id]) => id);
if (duplicateIds.length) errors.push(`活动ID重复：${duplicateIds.join("、")}`);

if (timeline.length !== 32) errors.push(`时间轴应为 32 条，实际为 ${timeline.length} 条`);

const imageChecks = await Promise.all(timeline.filter((event) => event["素材展示"]).map(async (event) => {
  try {
    await fs.access(`site/${event["素材展示"]}`);
    return "";
  } catch {
    return `${event["活动ID"]} 图片不存在：${event["素材展示"]}`;
  }
}));
errors.push(...imageChecks.filter(Boolean));

console.log(JSON.stringify({
  timeline: timelinePath,
  nodes: timeline.length,
  checks: errors.length ? "failed" : "passed",
  errors,
}, null, 2));

if (errors.length) process.exitCode = 1;
