import fs from "node:fs/promises";

const timelinePath = "site/data/timeline.json";
const timeline = JSON.parse(await fs.readFile(timelinePath, "utf8"));
const errors = [];
const requiredFields = ["活动ID", "日期精度", "年份", "类别", "活动/事件名称"];

for (const [index, event] of timeline.entries()) {
  for (const field of requiredFields) {
    if (event[field] == null || event[field] === "") errors.push(`第 ${index + 1} 条缺少字段：${field}`);
  }
}

const duplicateIds = Object.entries(Object.groupBy(timeline, (event) => event["活动ID"]))
  .filter(([, rows]) => rows.length > 1)
  .map(([id]) => id);
if (duplicateIds.length) errors.push(`活动ID重复：${duplicateIds.join("、")}`);

const stableRows = (rows) => JSON.stringify(rows, (_key, value) => value == null ? "" : String(value));
const expectedOrder = [...timeline].sort((a, b) =>
  Number(a["年份"]) - Number(b["年份"]) ||
  String(a["日期精度"]).localeCompare(String(b["日期精度"]), "zh-CN")
);
if (stableRows(expectedOrder) !== stableRows(timeline)) errors.push("时间轴未按年份、日期升序排列");

console.log(JSON.stringify({
  timeline: timelinePath,
  nodes: timeline.length,
  checks: errors.length ? "failed" : "passed",
  errors,
}, null, 2));

if (errors.length) process.exitCode = 1;
