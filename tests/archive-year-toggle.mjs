import { chromium } from "file:///C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/playwright-core@1.61.1/node_modules/playwright-core/index.mjs";
import assert from "node:assert/strict";

const baseUrl = process.env.SITE_URL || "http://127.0.0.1:8001/site/";
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const pageErrors = [];
const failedResponses = [];

page.on("console", (message) => {
  if (message.type() === "error" && !message.text().includes("Failed to load resource")) pageErrors.push(message.text());
});
page.on("pageerror", (error) => pageErrors.push(error.message));
page.on("response", (response) => {
  if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
});

try {
  await page.addInitScript(() => localStorage.setItem("wangli-journey-progress", "5000"));
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  assert.equal(await page.locator("#resumeDialog").count(), 0, "页面不应再包含继续上次旅程弹窗");
  assert.equal(await page.evaluate(() => localStorage.getItem("wangli-journey-progress")), null, "页面应清除旧旅程进度");
  await page.locator("#archive").scrollIntoViewIfNeeded();
  const archivePosition = await page.evaluate(() => window.scrollX);
  await page.mouse.click(1440 * .24, 1000 * .54);
  await page.waitForTimeout(750);
  assert.equal(await page.evaluate(() => window.scrollX), archivePosition, "点击成长轨迹背景不应返回时间轴");
  const yearButton = page.locator('.archive-year-button', { hasText: "2007" });
  const yearSection = yearButton.locator("xpath=ancestor::section[1]");
  const groups = yearSection.locator(".archive-year-groups");
  const countText = yearSection.locator(".archive-year-heading > span");

  await yearButton.scrollIntoViewIfNeeded();
  assert.equal(await yearButton.getAttribute("aria-expanded"), "false", "2007 年默认应为收起状态");
  assert.equal(await groups.isHidden(), true, "2007 年作品默认不应显示");

  await yearButton.click();
  assert.equal(await yearButton.getAttribute("aria-expanded"), "true", "点击年份数字后应展开");
  assert.equal(await groups.isVisible(), true, "展开后作品应可见");

  await yearButton.click();
  assert.equal(await yearButton.getAttribute("aria-expanded"), "false", "再次点击年份数字后应收起");
  assert.equal(await groups.isHidden(), true, "再次点击后作品应隐藏");

  await countText.click();
  assert.equal(await yearButton.getAttribute("aria-expanded"), "false", "点击记录数不应切换年份");
  assert.equal(await groups.isHidden(), true, "点击记录数后作品仍应隐藏");

  await page.locator('.filter-btn[data-filter="综艺"]').click();
  assert.equal(await page.locator(".archive-year-button").count(), 0, "综艺分类不应显示年份展开按钮");
  assert.equal(await page.locator(".archive-row").count() > 0, true, "综艺分类应直接显示条目");
  assert.equal(await page.getByText("《全员加速中·对战季》播出", { exact: true }).count(), 1, "全员加速中对战季应只显示一条");
  assert.equal(await page.getByText("《快乐再出发第三季·山海季》播出", { exact: true }).count(), 1, "快乐再出发山海季应只显示一条");
  assert.equal(await page.getByText("2024-02-16—2024-05-03", { exact: true }).count(), 1, "全员加速中应显示完整播出时间段");
  assert.equal(await page.getByText("2024-12-20—2025-03-21", { exact: true }).count(), 1, "快乐再出发山海季应显示完整播出时间段");

  await page.screenshot({ path: "outputs/archive-year-collapsed-verified.png", fullPage: false });
  assert.deepEqual(pageErrors, [], `页面脚本存在错误：${pageErrors.join(" | ")}`);
  assert.deepEqual(failedResponses, [], `页面资源加载失败：${failedResponses.join(" | ")}`);
  console.log("PASS: 成长轨迹点击不返回时间轴；全部按年份收起；分类直接展示；连续综艺合并为时间段；控制台无错误。");
} finally {
  await browser.close();
}
