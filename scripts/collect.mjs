import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";
import { archiveDir, chromePath, profileDir, readJson, root, slugDate, writeJson } from "./lib.mjs";

const tasks = await readJson(path.join(root, "config/tasks.json"), []);
const indexFile = path.join(archiveDir, "index.json");
const archive = await readJson(indexFile, { items: [] });
const port = 9333;
const chrome = spawn(chromePath, [
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profileDir}`,
  "--profile-directory=Default",
  "--no-first-run",
  "--no-default-browser-check",
  "--new-window",
  "about:blank"
], { stdio: "ignore" });
let endpoint;
for (let attempt = 0; attempt < 40; attempt++) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/json/version`);
    if (response.ok) { endpoint = (await response.json()).webSocketDebuggerUrl; break; }
  } catch {}
  await new Promise(resolve => setTimeout(resolve, 250));
}
if (!endpoint) throw new Error("无法连接采集器专用 Chrome");
const browser = await chromium.connectOverCDP(endpoint);
const context = browser.contexts()[0];

try {
  for (const task of tasks) {
    const page = await context.newPage();
    await page.goto(task.url, { waitUntil: "domcontentloaded", timeout: 60000 });
    try {
      await page.waitForSelector('[data-message-author-role="assistant"]', { timeout: 30000 });
    } catch (error) {
      console.error(JSON.stringify({task:task.title,url:page.url(),title:await page.title(),preview:(await page.locator("body").innerText()).slice(0,500)},null,2));
      throw error;
    }
    const result = await page.locator('[data-message-author-role="assistant"]').last().evaluate((node) => {
      const clone = node.cloneNode(true);
      const sourceImages = [...node.querySelectorAll("img")];
      [...clone.querySelectorAll("img")].forEach((image, index) => {
        const source = sourceImages[index];
        const width = source?.naturalWidth || 0;
        const height = source?.naturalHeight || 0;
        const src = image.getAttribute("src") || "";
        const suitable = !/(?:favicon|google\.com\/s2\/favicons)/i.test(src)
          && width >= 720
          && height >= 480
          && width * height >= 600000;
        if (!suitable) {
          image.remove();
          return;
        }
        image.setAttribute("data-published-width", String(width));
        image.setAttribute("data-published-height", String(height));
        image.setAttribute("loading", "lazy");
        image.setAttribute("decoding", "async");
      });
      clone.querySelectorAll("button, script, style, form, textarea, input").forEach(el => el.remove());
      clone.querySelectorAll("a").forEach(el => {
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noreferrer noopener");
      });
      return { html: clone.innerHTML, text: clone.innerText.trim() };
    });
    const hash = crypto.createHash("sha256").update(result.text).digest("hex");
    if (result.text && !archive.items.some(item => item.taskId === task.id && item.hash === hash)) {
      archive.items.unshift({
        id: `${task.id}-${slugDate()}`,
        taskId: task.id,
        taskTitle: task.title,
        sourceUrl: task.url,
        publishedAt: new Date().toISOString(),
        hash,
        html: result.html,
        text: result.text
      });
    }
    await page.close();
  }
  await writeJson(indexFile, archive);
} finally {
  await browser.close();
  chrome.kill("SIGTERM");
}

await import("./build-publication.mjs");
