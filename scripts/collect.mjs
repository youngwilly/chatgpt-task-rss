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

function runCommand(command, args, { allowExitCodeOne = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", code => {
      if (code === 0 || (allowExitCodeOne && code === 1)) resolve(code);
      else reject(new Error(`${command} 执行失败，退出码 ${code}`));
    });
  });
}

const minImageWidth = 720;
const minImageHeight = 400;
const minImageArea = 320000;

function suitableImage(image) {
  return image.src
    && !/(?:favicon|google\.com\/s2\/favicons|emoji|avatar|logo)/i.test(`${image.src} ${image.alt || ""}`)
    && image.width >= minImageWidth
    && image.height >= minImageHeight
    && image.width * image.height >= minImageArea;
}

async function embeddedMedia(message, itemId) {
  const candidates = await message.locator("img").evaluateAll(images => images.map((image, index) => {
    const link = image.closest("a[href]");
    return {
      index,
      src: image.currentSrc || image.src,
      alt: image.alt || "",
      width: image.naturalWidth || 0,
      height: image.naturalHeight || 0,
      sourceUrl: link?.href || image.currentSrc || image.src
    };
  }));
  const selected = candidates.filter(suitableImage).sort((a, b) => b.width * b.height - a.width * a.height).slice(0, 3);
  const media = [];
  for (const [position, image] of selected.entries()) {
    if (/^https?:\/\//i.test(image.src)) {
      media.push({ ...image, kind: "official-preview" });
      continue;
    }
    const relativePath = `assets/${itemId}-${position + 1}.png`;
    await fs.mkdir(path.join(archiveDir, "assets"), { recursive: true });
    await message.locator("img").nth(image.index).screenshot({ path: path.join(archiveDir, relativePath) });
    media.push({ ...image, src: relativePath, kind: "cropped-screenshot" });
  }
  return media.map(({ index: _index, ...image }) => image);
}

async function referencedPhotoMedia(message, itemId) {
  const links = await message.locator("a[href]").evaluateAll(anchors => anchors.map(anchor => ({
    url: anchor.href,
    text: (anchor.textContent || "").trim()
  })).filter(link => /^https?:\/\//i.test(link.url)));
  const likelyPhotoPages = links.filter(link => /(?:reutersconnect|photo|picture|image|gallery)/i.test(`${link.url} ${link.text}`)).slice(0, 2);
  for (const link of likelyPhotoPages) {
    const sourcePage = await context.newPage();
    try {
      await sourcePage.goto(link.url, { waitUntil: "domcontentloaded", timeout: 45000 });
      await sourcePage.locator("main img").first().waitFor({ state: "visible", timeout: 15000 });
      await sourcePage.waitForFunction(() => [...document.querySelectorAll("main img")].some(image =>
        image.complete && image.naturalWidth >= 720 && image.naturalHeight >= 400
      ), null, { timeout: 15000 }).catch(() => {});
      const candidates = await sourcePage.locator("main img").evaluateAll(images => images.map((image, index) => ({
        index,
        src: image.currentSrc || image.src,
        alt: image.alt || "",
        width: image.naturalWidth || 0,
        height: image.naturalHeight || 0,
        renderedWidth: Math.round(image.getBoundingClientRect().width),
        renderedHeight: Math.round(image.getBoundingClientRect().height),
        renderedArea: image.getBoundingClientRect().width * image.getBoundingClientRect().height
      })));
      const selected = candidates.filter(suitableImage).sort((a, b) =>
        (b.renderedArea + b.width * b.height) - (a.renderedArea + a.width * a.height)
      )[0];
      if (!selected) {
        const screenshotCandidate = candidates.filter(image =>
          image.src
          && !/(?:favicon|emoji|avatar|logo)/i.test(`${image.src} ${image.alt || ""}`)
          && image.renderedWidth >= minImageWidth
          && image.renderedHeight >= minImageHeight
          && image.renderedArea >= minImageArea
        ).sort((a, b) => b.renderedArea - a.renderedArea)[0];
        if (screenshotCandidate) {
          await fs.mkdir(path.join(archiveDir, "assets"), { recursive: true });
          const highResolutionUrl = screenshotCandidate.src.replace(/([?&])w=\d+/i, "$1w=1200");
          const response = await context.request.get(highResolutionUrl, {
            headers: { referer: sourcePage.url(), accept: "image/jpeg,image/png,image/*;q=0.8" },
            timeout: 30000
          }).catch(() => null);
          let relativePath;
          let kind;
          if (response?.ok() && /^image\//i.test(response.headers()["content-type"] || "")) {
            const contentType = response.headers()["content-type"] || "";
            const extension = /webp/i.test(contentType) ? "webp" : /png/i.test(contentType) ? "png" : "jpg";
            relativePath = `assets/${itemId}-official.${extension}`;
            await fs.writeFile(path.join(archiveDir, relativePath), await response.body());
            kind = "official-preview";
          } else {
            relativePath = `assets/${itemId}-official.png`;
            await sourcePage.locator("main img").nth(screenshotCandidate.index).screenshot({ path: path.join(archiveDir, relativePath) });
            kind = "cropped-screenshot";
          }
          return [{
            src: relativePath,
            alt: screenshotCandidate.alt,
            width: screenshotCandidate.renderedWidth,
            height: screenshotCandidate.renderedHeight,
            sourceUrl: link.url,
            sourceLabel: new URL(link.url).hostname.replace(/^www\./, ""),
            kind
          }];
        }
        console.error(JSON.stringify({
          message: "图片尺寸未达到要求",
          url: link.url,
          candidates: candidates.slice(0, 5).map(image => ({
            src: image.src.slice(0, 160),
            alt: image.alt.slice(0, 100),
            width: image.width,
            height: image.height,
            renderedWidth: image.renderedWidth,
            renderedHeight: image.renderedHeight,
            renderedArea: image.renderedArea
          }))
        }));
        continue;
      }
      if (/^https?:\/\//i.test(selected.src)) {
        return [{
          src: selected.src,
          alt: selected.alt,
          width: selected.width,
          height: selected.height,
          sourceUrl: link.url,
          sourceLabel: new URL(link.url).hostname.replace(/^www\./, ""),
          kind: "official-preview"
        }];
      }
      const relativePath = `assets/${itemId}-official.png`;
      await fs.mkdir(path.join(archiveDir, "assets"), { recursive: true });
      await sourcePage.locator("main img").nth(selected.index).screenshot({ path: path.join(archiveDir, relativePath) });
      return [{
        src: relativePath,
        alt: selected.alt,
        width: selected.width,
        height: selected.height,
        sourceUrl: link.url,
        sourceLabel: new URL(link.url).hostname.replace(/^www\./, ""),
        kind: "cropped-screenshot"
      }];
    } catch (error) {
      console.error(`图片采集失败：${link.url} (${error.message})`);
    } finally {
      await sourcePage.close();
    }
  }
  return [];
}

try {
  for (const task of tasks) {
    const page = await context.newPage();
    try {
      await page.goto(task.url, { waitUntil: "domcontentloaded", timeout: 60000 });
      try {
        await page.waitForSelector('[data-message-author-role="assistant"]', { timeout: 30000 });
      } catch (error) {
        console.error(JSON.stringify({task:task.title,url:page.url(),title:await page.title(),preview:(await page.locator("body").innerText()).slice(0,500)},null,2));
        throw error;
      }
      const messages = page.locator('[data-message-author-role="assistant"]');
      const message = messages.last();
      const result = await message.evaluate((node) => {
        const clone = node.cloneNode(true);
        clone.querySelectorAll("img").forEach(image => image.remove());
        clone.querySelectorAll("button, script, style, form, textarea, input").forEach(el => el.remove());
        clone.querySelectorAll("a").forEach(el => {
          el.setAttribute("target", "_blank");
          el.setAttribute("rel", "noreferrer noopener");
        });
        return { html: clone.innerHTML, text: clone.innerText.trim() };
      });
      const hash = crypto.createHash("sha256").update(result.text).digest("hex");
      const existing = archive.items.find(item => item.taskId === task.id && item.hash === hash);
      if (result.text && (!existing || !existing.media?.length)) {
        const itemId = existing?.id || `${task.id}-${slugDate()}`;
        let media = await embeddedMedia(message, itemId);
        if (!media.length && task.id === "daily-photo") media = await referencedPhotoMedia(message, itemId);
        if (existing) {
          existing.media = media;
        } else {
          archive.items.unshift({
            id: itemId,
            taskId: task.id,
            taskTitle: task.title,
            sourceUrl: task.url,
            publishedAt: new Date().toISOString(),
            hash,
            media,
            html: result.html,
            text: result.text
          });
        }
      }
    } catch (error) {
      console.error(`任务采集失败：${task.title} (${error.message})`);
    } finally {
      await page.close();
    }
  }
  await writeJson(indexFile, archive);
} finally {
  await browser.close();
  chrome.kill("SIGTERM");
}

await import("./build-publication.mjs");

if (process.env.NO_AUTO_PUBLISH !== "1") {
  try {
    await runCommand("git", ["add", "archive", "docs"]);
    const unchanged = await runCommand("git", ["diff", "--cached", "--quiet"], { allowExitCodeOne: true }) === 0;
    if (!unchanged) {
      const stamp = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false });
      await runCommand("git", ["commit", "-m", `Update task content ${stamp}`]);
      await runCommand("git", ["push"]);
    }
  } catch (error) {
    console.error(`自动发布失败：${error.message}`);
  }
}
