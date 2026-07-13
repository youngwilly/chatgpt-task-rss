import fs from "node:fs/promises";
import path from "node:path";
import { archiveDir, docsDir, escapeXml, readJson, root } from "./lib.mjs";

const tasks = await readJson(path.join(root, "config/tasks.json"), []);
const { items = [] } = await readJson(path.join(archiveDir, "index.json"), { items: [] });
const baseUrl = (process.env.PUBLIC_BASE_URL || "https://example.github.io/chatgpt-task-rss").replace(/\/$/, "");
await fs.rm(docsDir, { recursive: true, force: true });
await fs.mkdir(path.join(docsDir, "feeds"), { recursive: true });

const css = `:root{color-scheme:light dark;--bg:#f4f1ea;--card:#fffdf8;--text:#171713;--muted:#716e64;--line:#ded9cc;--accent:#d95032}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.65 -apple-system,BlinkMacSystemFont,"PingFang SC","Noto Sans CJK SC",sans-serif}.shell{width:min(760px,100%);margin:auto;padding:18px 14px 64px}header{padding:18px 4px 14px}h1{font:800 clamp(28px,8vw,46px)/1.05 Georgia,"Songti SC",serif;margin:0 0 8px}.deck{color:var(--muted);margin:0}.filters{display:flex;gap:8px;overflow:auto;padding:8px 0 18px}.filters a{white-space:nowrap;border:1px solid var(--line);border-radius:999px;padding:6px 12px;color:inherit;text-decoration:none;background:var(--card)}article{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:18px;margin:0 0 14px;box-shadow:0 8px 28px #0000000a}.meta{display:flex;justify-content:space-between;gap:10px;color:var(--muted);font-size:13px}.tag{color:var(--accent);font-weight:700}article h2{font:750 23px/1.2 Georgia,"Songti SC",serif;margin:8px 0 12px}.content img{display:block;width:100%;height:auto;border-radius:12px;margin:12px 0}.content pre,.content table{max-width:100%;overflow:auto}.content a{color:var(--accent);text-underline-offset:3px}.empty{padding:42px 18px;text-align:center;color:var(--muted)}footer{color:var(--muted);font-size:13px;padding:24px 4px}@media(prefers-color-scheme:dark){:root{--bg:#141412;--card:#1e1e1a;--text:#f3efe6;--muted:#aaa69b;--line:#34332e;--accent:#ff8268}}`;

function page(filter) {
  const list = filter ? items.filter(x => x.taskId === filter) : items;
  const title = filter ? tasks.find(x => x.id === filter)?.title || "任务结果" : "五份每日观察";
  const cards = list.map(item => `<article><div class="meta"><span class="tag">${escapeXml(item.taskTitle)}</span><time>${new Date(item.publishedAt).toLocaleString("zh-CN",{timeZone:"Asia/Shanghai",hour12:false})}</time></div><h2>${escapeXml(item.text.split("\n")[0].slice(0,80) || item.taskTitle)}</h2><div class="content">${item.html}</div></article>`).join("") || `<div class="empty">首次采集完成后，内容会出现在这里。</div>`;
  const nav = [`<a href="/">全部</a>`, ...tasks.map(t => `<a href="/${t.id}.html">${escapeXml(t.title)}</a>`)].join("");
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#f4f1ea"><link rel="alternate" type="application/rss+xml" title="${escapeXml(title)}" href="${filter ? `/feeds/${filter}.xml` : "/rss.xml"}"><title>${escapeXml(title)}</title><style>${css}</style></head><body><main class="shell"><header><h1>${escapeXml(title)}</h1><p class="deck">原文呈现 · 手机优先 · 自动更新</p></header><nav class="filters">${nav}</nav>${cards}<footer>内容保持 ChatGPT 任务原文，仅优化阅读版式。</footer></main></body></html>`;
}

function rss(filter) {
  const list = (filter ? items.filter(x => x.taskId === filter) : items).slice(0, 100);
  const title = filter ? tasks.find(x => x.id === filter)?.title || "任务结果" : "ChatGPT 计划任务合集";
  const entries = list.map(item => `<item><title>${escapeXml(item.taskTitle)}</title><link>${escapeXml(`${baseUrl}/${filter ? `${filter}.html` : ""}#${item.id}`)}</link><guid isPermaLink="false">${escapeXml(item.hash)}</guid><pubDate>${new Date(item.publishedAt).toUTCString()}</pubDate><description><![CDATA[${item.html.replaceAll("]]>", "]]]]><![CDATA[>")}]]></description></item>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${escapeXml(title)}</title><link>${escapeXml(baseUrl)}</link><description>ChatGPT 计划任务原文订阅</description><language>zh-cn</language>${entries}</channel></rss>`;
}

await fs.writeFile(path.join(docsDir, "index.html"), page());
await fs.writeFile(path.join(docsDir, "rss.xml"), rss());
await fs.writeFile(path.join(docsDir, ".nojekyll"), "");
await fs.writeFile(path.join(docsDir, "robots.txt"), "User-agent: *\nDisallow: /\n");
for (const task of tasks) {
  await fs.writeFile(path.join(docsDir, `${task.id}.html`), page(task.id));
  await fs.writeFile(path.join(docsDir, "feeds", `${task.id}.xml`), rss(task.id));
}
