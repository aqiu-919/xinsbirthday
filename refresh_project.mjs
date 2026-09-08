import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
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
  ["导出完整档案（来自多维表格源）", "extract_timeline.mjs"],
  ["验证完整档案与源文件", "verify_archive.mjs"],
  ["验证独立时间轴", "verify_timeline.mjs"],
];

for (const [label, script] of steps) {
  console.log(`\n[refresh] ${label}`);
  const result = spawnSync(nodeExecutable, [script], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${label}失败：${script} 退出码 ${result.status}`);
  }
}

console.log("\n[refresh] 源文件与完整档案已通过一致性验证；独立时间轴已通过自身结构验证。");
