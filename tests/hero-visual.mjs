import { chromium } from "file:///C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/playwright-core@1.61.1/node_modules/playwright-core/index.mjs";
import assert from "node:assert/strict";

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
});
const errors = [];

try {
  for (const viewport of [{ width: 1440, height: 1000, name: "desktop" }, { width: 390, height: 844, name: "mobile" }]) {
    const page = await browser.newPage({ viewport });
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => {
      if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
    });
    await page.goto("http://127.0.0.1:8001/site/", { waitUntil: "networkidle" });

    const heading = page.locator(".hero h1");
    const button = page.locator("#beginBtn");
    const orbit = page.locator(".orbit");
    assert.equal(await heading.textContent(), "欢迎光临望栎星");
    assert.equal(await button.textContent(), "由此启程");
    assert.equal(await heading.evaluate((element) => getComputedStyle(element).whiteSpace === "nowrap" && element.scrollWidth <= element.clientWidth), true, `${viewport.name} 标题不应换行或横向溢出`);
    assert.equal(await orbit.isVisible(), true, `${viewport.name} 星环应可见`);
    assert.equal(await button.evaluate((element) => element.getBoundingClientRect().width >= 150), true, `${viewport.name} 底层星形应放大`);
    await page.screenshot({ path: `outputs/hero-${viewport.name}-verified.png`, fullPage: false });
    await page.close();
  }
  assert.deepEqual(errors, [], `页面存在错误：${errors.join(" | ")}`);
  console.log("PASS: 桌面端和手机端标题单行、文案正确、星环可见、星形按钮已放大，页面无加载错误。");
} finally {
  await browser.close();
}
