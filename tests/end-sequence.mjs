import { chromium } from "file:///C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core/index.mjs";
import assert from "node:assert/strict";

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
});
const errors = [];

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
  await page.goto("http://127.0.0.1:8000/", { waitUntil: "networkidle" });
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    const node = document.querySelector(".event-node:last-of-type");
    const center = node.getBoundingClientRect().left + scrollX + node.offsetWidth / 2;
    scrollTo({ left: center - innerWidth * .24, behavior: "auto" });
    updateProgress();
  });
  await page.waitForTimeout(300);
  const desktopEndLayout = await page.evaluate(() => {
    const node = document.querySelector(".event-node:last-of-type");
    const nodeRect = node.getBoundingClientRect();
    return {
      archiveLeft: document.querySelector("#archive").getBoundingClientRect().left,
      nodeLeft: nodeRect.left,
      nodeRight: nodeRect.right,
      travelerOpacity: getComputedStyle(document.querySelector("#traveler")).opacity,
      viewportWidth: innerWidth,
    };
  });
  assert.equal(desktopEndLayout.travelerOpacity, "1", "PC端走到最后节点时小光人应保持可见");
  assert.equal(desktopEndLayout.nodeLeft >= 0 && desktopEndLayout.nodeRight <= desktopEndLayout.viewportWidth, true, "PC端最后节点应完整位于画面内");
  assert.equal(desktopEndLayout.archiveLeft >= desktopEndLayout.viewportWidth, true, "PC端最后节点居中时不应带出资料库");
  await page.screenshot({ path: "outputs/timeline-last-node-desktop-verified.png", fullPage: false });
  await page.evaluate(() => beginEndSequence());

  await page.waitForTimeout(900);
  assert.equal(await page.locator("#endScene").getAttribute("aria-hidden"), "true", "结束后1秒内不应提前显示过渡页");
  await page.waitForTimeout(250);
  assert.equal(await page.locator("#endScene").getAttribute("aria-hidden"), "false", "结束1秒后应显示黄色过渡层");
  assert.equal(await page.locator("#endScene").evaluate((element) => element.classList.contains("copy-visible")), false, "黄色层显示0.5秒前不应出现文字");
  await page.waitForTimeout(450);
  assert.equal(await page.locator("#endScene").evaluate((element) => element.classList.contains("copy-visible")), true, "黄色层显示0.5秒后应出现文字");
  assert.equal(await page.locator("#journey").evaluate((element) => getComputedStyle(element).opacity), "0", "过渡页应隐藏原页面主体并保留星空背景");
  const copyLines = (await page.locator(".end-scene-copy").innerText()).split("\n").filter(Boolean);
  assert.deepEqual(copyLines, [
    "十九年如白驹过隙",
    "不知道屏幕前的你是在什么时候看到了王栎鑫的名字",
    "又是什么时候开始生活中有了王栎鑫的痕迹呢",
    "或早或晚 都不必感到遗憾",
    "只是  再陪伴阿糊更久一点吧",
  ]);
  assert.equal(await page.locator(".end-scene-copy h2").count(), 0, "结尾文案不应包含单独标题");
  assert.equal(await page.locator(".event-node").first().evaluate((node) => node.classList.contains("special-node")), false, "时间轴首节点不应是特殊节点");
  assert.equal(await page.locator(".event-node").last().evaluate((node) => node.classList.contains("special-node")), false, "时间轴末节点不应是特殊节点");
  await page.locator("#endScene").click({ position: { x: 20, y: 20 }, force: true });
  assert.equal(await page.locator("#endScene").getAttribute("aria-hidden"), "false", "文字展示未满10秒时点击不应跳转");
  await page.waitForTimeout(1250);
  await page.screenshot({ path: "outputs/end-sequence-desktop-verified.png", fullPage: false });

  await page.waitForTimeout(9000);
  assert.equal(await page.locator("#endScene").evaluate((element) => element.classList.contains("skippable")), true, "文字展示10秒后应允许整屏点击");
  await page.locator("#endScene").click({ position: { x: 20, y: 20 } });
  await page.waitForTimeout(800);
  assert.equal(await page.locator("#endScene").getAttribute("aria-hidden"), "true", "文字展示10秒后点击应关闭过渡页");
  assert.equal(await page.evaluate(() => window.scrollX > innerWidth), true, "点击过渡页后应进入作品集");
  await page.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  mobile.on("pageerror", (error) => errors.push(error.message));
  await mobile.goto("http://127.0.0.1:8000/", { waitUntil: "networkidle" });
  await mobile.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    const node = document.querySelector(".event-node:last-of-type");
    const center = node.getBoundingClientRect().top + scrollY + node.offsetHeight / 2;
    scrollTo({ top: center - innerHeight * .48, behavior: "auto" });
    updateProgress();
  });
  await mobile.waitForTimeout(300);
  const mobileEndLayout = await mobile.evaluate(() => {
    const node = document.querySelector(".event-node:last-of-type");
    const nodeRect = node.getBoundingClientRect();
    return {
      archiveTop: document.querySelector("#archive").getBoundingClientRect().top,
      nodeTop: nodeRect.top,
      nodeBottom: nodeRect.bottom,
      travelerOpacity: getComputedStyle(document.querySelector("#traveler")).opacity,
      viewportHeight: innerHeight,
    };
  });
  assert.equal(mobileEndLayout.travelerOpacity, "1", "手机端走到最后节点时小光人应保持可见");
  assert.equal(mobileEndLayout.nodeTop >= 0 && mobileEndLayout.nodeBottom <= mobileEndLayout.viewportHeight, true, "手机端最后节点应完整位于画面内");
  assert.equal(mobileEndLayout.archiveTop >= mobileEndLayout.viewportHeight, true, "手机端最后节点居中时不应带出资料库");
  await mobile.evaluate(() => showEndScene());
  await mobile.waitForTimeout(1850);
  const copyFits = await mobile.locator(".end-scene-copy").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight;
  });
  assert.equal(copyFits, true, "手机端文字应完整位于屏幕内");
  await mobile.screenshot({ path: "outputs/end-sequence-mobile-verified.png", fullPage: false });
  await mobile.close();

  assert.deepEqual(errors, [], `页面存在错误：${errors.join(" | ")}`);
  console.log("PASS: 走完末节点后等待1秒、0.5秒显字、显字10秒后整屏点击进入作品集及桌面/手机布局均通过。");
} finally {
  await browser.close();
}
