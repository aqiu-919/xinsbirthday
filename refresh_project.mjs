import { spawnSync } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
import path from "node:path";

const homeCandidates = [
  process.env.USERPROFILE,
  path.resolve(process.cwd(), "..", ".."),
].filter(Boolean);
const bundledNode = homeCandidates
  .map((home) => path.join(home, ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "bin", "node.exe"))
  .find(existsSync);
const nodeExecutable = bundledNode ?? process.execPath;

const steps = [
  ["生成工作簿", "build_wang_yuexin_archive.mjs"],
  ["导出完整档案（不修改独立时间轴）", "extract_timeline.mjs"],
  ["验证资料库与完整档案", "verify_archive.mjs"],
  ["验证独立时间轴", "verify_timeline.mjs"],
];
const workbookPath = path.join("outputs", "wang_yuexin_archive_v1", "王栎鑫2007-2026公开履历资料库_完整版_按年份排序.xlsx");

for (const [label, script] of steps) {
  console.log(`\n[refresh] ${label}`);
  const result = spawnSync(nodeExecutable, [script], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  const exportedBeforeNativeExit = script === "build_wang_yuexin_archive.mjs"
    && result.status === 3221226505
    && /exported \d+ works and \d+ events/.test(result.stdout ?? "")
    && existsSync(workbookPath);
  if (exportedBeforeNativeExit) {
    console.warn("[refresh] 警告：表格原生库在导出完成后的进程收尾阶段异常退出；产物将由后续读取验证裁决。");
    continue;
  }
  if (result.status !== 0) {
    throw new Error(`${label}失败：${script} 退出码 ${result.status}`);
  }
}

const inspectLog = `${workbookPath}.inspect.ndjson`;
if (existsSync(inspectLog)) unlinkSync(inspectLog);

console.log("\n[refresh] 工作簿与完整档案已通过一致性验证；独立时间轴已通过自身结构验证。");
