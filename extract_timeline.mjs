import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

// Complete merged archive export only. The website timeline is an independent source.

const workbookPath = "outputs/wang_yuexin_archive_v1/王栎鑫2007-2026公开履历资料库_完整版_按年份排序.xlsx";
const input = await FileBlob.load(workbookPath);
const workbook = await SpreadsheetFile.importXlsx(input);
const sheet = workbook.worksheets.getItem("活动年表");
const rows = sheet.getUsedRange(true).values;
const headers = rows[0];
const archive = rows.slice(1)
  .filter((row) => row[0])
  .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
await fs.mkdir("site/data", { recursive: true });
await fs.writeFile("site/data/archive.json", JSON.stringify(archive, null, 2), "utf8");
const timeline = JSON.parse(await fs.readFile("site/data/timeline.json", "utf8"));
console.log(JSON.stringify({ archiveRows: archive.length, independentTimelineRows: timeline.length, first: archive[0], last: archive.at(-1) }, null, 2));
