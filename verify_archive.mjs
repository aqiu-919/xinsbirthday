import fs from "node:fs/promises";

const sourcePath = "sources/feishu/公开活动合集.json";
const archivePath = "site/data/archive.json";
const statusPath = "PROJECT_STATUS.md";

const errors = [];
const sourceEvents = JSON.parse(await fs.readFile(sourcePath, "utf8"));
const archiveEvents = JSON.parse(await fs.readFile(archivePath, "utf8"));
const status = await fs.readFile(statusPath, "utf8");

const normalizeSource = (rows) => rows.map((event) => ({
  活动ID: `PA${String(Number(event.活动序号) || 0).padStart(4, "0")}`,
  活动序号: String(event.活动序号 || ""),
  日期精度: String(event.日期精度 || ""),
  年份: String(event.年份 || String(event.日期精度 || "").slice(0, 4)),
  类别: String(event.类别 || ""),
  "活动/事件名称": String(event.活动事件名称 || ""),
  身份: String(event.身份 || ""),
  "平台/主办": String(event.平台主办 || ""),
  地点: String(event.地点 || ""),
  核验状态: String(event.核验状态 || ""),
  来源URL: String(event.来源URL || ""),
  备注: String(event.备注 || ""),
}));

const stableRows = (rows) => JSON.stringify(rows, (_key, value) => value == null ? "" : String(value));
if (stableRows(normalizeSource(sourceEvents)) !== stableRows(archiveEvents)) {
  errors.push("archive.json 与飞书多维表格源文件不一致");
}

const statusCounts = status.match(/当前数量：(\d+) 条公开活动记录/);
if (!statusCounts) {
  errors.push("PROJECT_STATUS.md 缺少可识别的当前数量");
} else if (Number(statusCounts[1]) !== sourceEvents.length) {
  errors.push(`状态文档记录数 ${statusCounts[1]} != 源文件 ${sourceEvents.length}`);
}

const allowedCategories = ["影视", "音乐", "舞台", "综艺", "直播", "杂志", "其他"];
const unexpectedCategories = [...new Set(sourceEvents.map((event) => event["类别"]).filter((category) => !allowedCategories.includes(category)))];
if (unexpectedCategories.length) errors.push(`活动年表存在未标准化类别：${unexpectedCategories.join("、")}`);
const categoryCounts = Object.fromEntries(Object.entries(Object.groupBy(sourceEvents, (event) => event["类别"])).map(([key, rows]) => [key, rows.length]));

const report = {
  source: sourcePath,
  mergedRecords: sourceEvents.length,
  categories: categoryCounts,
  checks: errors.length ? "failed" : "passed",
  errors,
};
console.log(JSON.stringify(report, null, 2));

if (errors.length) process.exitCode = 1;
