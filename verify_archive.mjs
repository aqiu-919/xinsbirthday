import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const workbookPath = "outputs/wang_yuexin_archive_v1/王栎鑫2007-2026公开履历资料库_完整版_按年份排序.xlsx";
const archivePath = "site/data/archive.json";
const statusPath = "PROJECT_STATUS.md";

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(workbookPath));
const requiredSheets = ["总览", "人物档案", "活动年表", "来源与待补"];
const errors = [];

const sheetNames = workbook.worksheets.items.map((sheet) => sheet.name);
for (const name of requiredSheets) {
  if (!sheetNames.includes(name)) errors.push(`工作簿缺少工作表：${name}`);
}

const tableRows = (sheetName) => {
  const rows = workbook.worksheets.getItem(sheetName).getUsedRange(true).values;
  const headers = rows[0];
  return rows.slice(1)
    .filter((row) => row[0])
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
};

const workbookEvents = tableRows("活动年表");
const archiveEvents = JSON.parse(await fs.readFile(archivePath, "utf8"));
const status = await fs.readFile(statusPath, "utf8");

const stableRows = (rows) => JSON.stringify(rows, (_key, value) => value == null ? "" : String(value));
if (stableRows(workbookEvents) !== stableRows(archiveEvents)) {
  errors.push("archive.json 与工作簿活动年表不一致");
}

const statusCounts = status.match(/当前数量：(\d+) 条合并履历（含 (\d+) 个作品项目）/);
if (!statusCounts) {
  errors.push("PROJECT_STATUS.md 缺少可识别的当前数量");
} else {
  if (Number(statusCounts[1]) !== workbookEvents.length) errors.push(`状态文档合并履历数 ${statusCounts[1]} != 工作簿 ${workbookEvents.length}`);
  const representedWorkIds = new Set();
  for (const event of workbookEvents) {
    if (/^W\d+$/.test(String(event["活动ID"]))) representedWorkIds.add(String(event["活动ID"]));
    for (const match of String(event["备注"]).matchAll(/作品档案 (W\d+)/g)) representedWorkIds.add(match[1]);
  }
  if (Number(statusCounts[2]) !== representedWorkIds.size) {
    errors.push(`状态文档作品项目数 ${statusCounts[2]} != 合并年表已标记作品数 ${representedWorkIds.size}`);
  }
}

const duplicateIds = Object.entries(Object.groupBy(workbookEvents, (event) => event["活动ID"]))
  .filter(([, rows]) => rows.length > 1)
  .map(([id]) => id);
if (duplicateIds.length) errors.push(`活动ID重复：${duplicateIds.join("、")}`);

const duplicateKeys = Object.entries(Object.groupBy(workbookEvents, (event) => [
  event["日期精度"], event["活动/事件名称"], event["地点"],
].join("|"))).filter(([, rows]) => rows.length > 1).map(([key]) => key);
if (duplicateKeys.length) errors.push(`活动日期/名称/地点重复：${duplicateKeys.join("；")}`);

const expectedOrder = [...workbookEvents].sort((a, b) =>
  Number(a["年份"]) - Number(b["年份"]) ||
  String(a["日期精度"]).localeCompare(String(b["日期精度"]), "zh-CN") ||
  String(a["类别"]).localeCompare(String(b["类别"]), "zh-CN") ||
  String(a["活动/事件名称"]).localeCompare(String(b["活动/事件名称"]), "zh-CN")
);
if (stableRows(expectedOrder) !== stableRows(workbookEvents)) errors.push("活动年表未按约定顺序排列");

const formulaErrorPattern = /#REF!|#DIV\/0!|#VALUE!|#NAME\?|#N\/A/;
for (const sheet of workbook.worksheets.items) {
  const values = sheet.getUsedRange(true)?.values ?? [];
  if (values.flat().some((value) => formulaErrorPattern.test(String(value)))) {
    errors.push(`${sheet.name} 存在公式错误值`);
  }
}

const allowedCategories = ["影视", "音乐", "舞台", "综艺", "杂志", "其他"];
const unexpectedCategories = [...new Set(workbookEvents.map((event) => event["类别"]).filter((category) => !allowedCategories.includes(category)))];
if (unexpectedCategories.length) errors.push(`活动年表存在未标准化类别：${unexpectedCategories.join("、")}`);
const categoryCounts = Object.fromEntries(Object.entries(Object.groupBy(workbookEvents, (event) => event["类别"])).map(([key, rows]) => [key, rows.length]));

const report = {
  workbook: workbookPath,
  mergedRecords: workbookEvents.length,
  categories: categoryCounts,
  checks: errors.length ? "failed" : "passed",
  errors,
};
console.log(JSON.stringify(report, null, 2));

if (errors.length) process.exitCode = 1;
