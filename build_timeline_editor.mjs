import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const timelinePath = "site/data/timeline.json";
const outputDir = "outputs/timeline_editor_20260723";
const outputPath = `${outputDir}/王栎鑫纪念网站_精选时间轴编辑表.xlsx`;
const previewPath = `${outputDir}/timeline-editor-preview.png`;
const guidePreviewPath = `${outputDir}/timeline-guide-preview.png`;
const timeline = JSON.parse(await fs.readFile(timelinePath, "utf8"));
const specialIds = new Set(["E001", "E004", "E011", "E016", "E028", "E029", "E041", "E049", "E157", "E162"]);

const workbook = Workbook.create();
const timelineSheet = workbook.worksheets.add("时间轴节点");
const guideSheet = workbook.worksheets.add("编辑说明");

timelineSheet.showGridLines = false;
guideSheet.showGridLines = false;

const headers = [
  "顺序", "特殊节点", "活动ID", "日期精度", "年份", "类别", "活动/事件名称", "身份",
  "平台/主办", "地点", "核验状态", "来源URL", "备注", "素材准备状态", "后续修改备注",
];
const rows = timeline.map((event, index) => [
  index + 1,
  specialIds.has(event["活动ID"]) ? "是" : "否",
  event["活动ID"],
  event["日期精度"],
  Number(event["年份"]),
  event["类别"],
  event["活动/事件名称"],
  event["身份"],
  event["平台/主办"],
  event["地点"],
  event["核验状态"],
  event["来源URL"],
  event["备注"],
  "待补充",
  "",
]);

timelineSheet.getRange("A1:O2").merge();
timelineSheet.getRange("A1").values = [["王栎鑫纪念网站 · 精选时间轴编辑表"]];
timelineSheet.getRange("A1:O2").format = {
  fill: "#142A3A",
  font: { name: "Microsoft YaHei", size: 18, bold: true, color: "#FFFFFF" },
  verticalAlignment: "center",
  horizontalAlignment: "left",
};
timelineSheet.getRange("A3:O3").merge();
timelineSheet.getRange("A3").values = [[`当前共 ${timeline.length} 个独立节点；黄色行表示网站全屏特效节点。修改后交给 Codex 同步到 timeline.json。`]];
timelineSheet.getRange("A3:O3").format = {
  fill: "#EAF2F5",
  font: { name: "Microsoft YaHei", size: 10, color: "#39566A" },
  verticalAlignment: "center",
};
timelineSheet.getRange(`A5:O${rows.length + 5}`).values = [headers, ...rows];
const table = timelineSheet.tables.add(`A5:O${rows.length + 5}`, true, "TimelineEditorTable");
table.style = "TableStyleMedium2";
table.showFilterButton = true;
timelineSheet.freezePanes.freezeRows(5);
timelineSheet.freezePanes.freezeColumns(3);

timelineSheet.getRange(`A6:A${rows.length + 5}`).format.numberFormat = "0";
timelineSheet.getRange(`E6:E${rows.length + 5}`).format.numberFormat = "0";
timelineSheet.getRange(`A6:F${rows.length + 5}`).format.verticalAlignment = "center";
timelineSheet.getRange(`G6:O${rows.length + 5}`).format = {
  verticalAlignment: "top",
  wrapText: true,
};
timelineSheet.getRange(`B6:B${rows.length + 5}`).dataValidation = { rule: { type: "list", values: ["是", "否"] } };
timelineSheet.getRange(`K6:K${rows.length + 5}`).dataValidation = { rule: { type: "list", values: ["已初核", "待二次核验", "已核验"] } };
timelineSheet.getRange(`N6:N${rows.length + 5}`).dataValidation = { rule: { type: "list", values: ["待补充", "已准备", "不需要"] } };
timelineSheet.getRange(`A6:O${rows.length + 5}`).format.borders = {
  insideHorizontal: { style: "thin", color: "#DCE5EA" },
};
timelineSheet.getRange(`B6:B${rows.length + 5}`).conditionalFormats.add("containsText", {
  text: "是",
  format: { fill: "#FFF0B8", font: { bold: true, color: "#8A5A00" } },
});
timelineSheet.getRange(`K6:K${rows.length + 5}`).conditionalFormats.add("containsText", {
  text: "待二次核验",
  format: { fill: "#FDE2DF", font: { color: "#9E2E27" } },
});

const widths = [8, 10, 12, 22, 9, 16, 36, 18, 24, 16, 16, 48, 42, 16, 34];
widths.forEach((width, index) => {
  timelineSheet.getRangeByIndexes(0, index, rows.length + 5, 1).format.columnWidth = width;
});
timelineSheet.getRange("1:1").format.rowHeight = 28;
timelineSheet.getRange("2:2").format.rowHeight = 28;
timelineSheet.getRange("3:3").format.rowHeight = 24;
timelineSheet.getRange("5:5").format.rowHeight = 30;
timelineSheet.getRange(`6:${rows.length + 5}`).format.rowHeight = 42;

guideSheet.getRange("A1:F2").merge();
guideSheet.getRange("A1").values = [["时间轴编辑说明"]];
guideSheet.getRange("A1:F2").format = {
  fill: "#142A3A",
  font: { name: "Microsoft YaHei", size: 18, bold: true, color: "#FFFFFF" },
  verticalAlignment: "center",
};
guideSheet.getRange("A4:B12").values = [
  ["项目", "填写规则"],
  ["顺序", "决定网页时间轴中的前后顺序；新增节点后请连续编号。"],
  ["特殊节点", "选择“是”时，表示该节点需要全屏特效和特定素材。"],
  ["活动ID", "保持唯一；已有ID不要重复，新节点由 Codex 统一补充。"],
  ["日期精度", "可填写 YYYY、YYYY-MM 或 YYYY-MM-DD；没有准确日期时不要猜具体日期。"],
  ["年份", "填写四位年份，并与日期精度对应。"],
  ["来源URL", "填写公开资料链接，便于后续核验。"],
  ["素材准备状态", "使用“待补充、已准备、不需要”三种状态。"],
  ["同步方式", "本表是编辑底稿，不会自动覆盖网站。修改完成后交给 Codex 审核并同步到 site/data/timeline.json。"],
];
guideSheet.getRange("A4:B4").format = {
  fill: "#2F6F6D",
  font: { bold: true, color: "#FFFFFF" },
};
guideSheet.getRange("A5:A12").format = { fill: "#EDF4F2", font: { bold: true, color: "#183B4E" } };
guideSheet.getRange("A4:B12").format.borders = {
  outside: { style: "thin", color: "#C6D6D3" },
  insideHorizontal: { style: "thin", color: "#DCE5EA" },
};
guideSheet.getRange("A4:B12").format.wrapText = true;
guideSheet.getRange("A:A").format.columnWidth = 22;
guideSheet.getRange("B:B").format.columnWidth = 88;
guideSheet.getRange("4:4").format.rowHeight = 28;
guideSheet.getRange("5:12").format.rowHeight = 42;
guideSheet.freezePanes.freezeRows(4);

await fs.mkdir(outputDir, { recursive: true });
const inspect = await workbook.inspect({
  kind: "table",
  range: "时间轴节点!A1:O12",
  include: "values,formulas",
  tableMaxRows: 12,
  tableMaxCols: 15,
  maxChars: 6000,
});
console.log(inspect.ndjson);
const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "timeline editor formula error scan",
});
console.log(errors.ndjson);
const preview = await workbook.render({ sheetName: "时间轴节点", range: "A1:O16", scale: 1, format: "png" });
await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));
const guidePreview = await workbook.render({ sheetName: "编辑说明", range: "A1:F12", scale: 1.4, format: "png" });
await fs.writeFile(guidePreviewPath, new Uint8Array(await guidePreview.arrayBuffer()));
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(JSON.stringify({ outputPath, previewPath, guidePreviewPath, rows: timeline.length }, null, 2));
