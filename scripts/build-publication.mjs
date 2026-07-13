import fs from "node:fs/promises";
import path from "node:path";
import { archiveDir, docsDir, escapeXml, readJson, root } from "./lib.mjs";

const tasks = await readJson(path.join(root, "config/tasks.json"), []);
const { items = [] } = await readJson(path.join(archiveDir, "index.json"), { items: [] });
const baseUrl = (process.env.PUBLIC_BASE_URL || "https://youngwilly.github.io/chatgpt-task-rss").replace(/\/$/, "");
const basePath = new URL(baseUrl).pathname.replace(/\/$/, "");
await fs.rm(docsDir, { recursive: true, force: true });
await fs.mkdir(path.join(docsDir, "feeds"), { recursive: true });

const css = `:root{color-scheme:light dark;--bg:#f4f1ea;--card:#fffdf8;--text:#171713;--muted:#716e64;--line:#ded9cc;--accent:#d95032;--table-head:#eee9dd;--table-alt:#faf7f0}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.65 -apple-system,BlinkMacSystemFont,"PingFang SC","Noto Sans CJK SC",sans-serif}.shell{width:min(760px,100%);margin:auto;padding:18px 14px 64px}header{padding:18px 4px 14px}h1{font:800 clamp(28px,8vw,46px)/1.05 Georgia,"Songti SC",serif;margin:0 0 8px}.deck{color:var(--muted);margin:0}.filters{display:flex;gap:8px;overflow:auto;padding:8px 0 18px;scrollbar-width:none}.filters a{white-space:nowrap;border:1px solid var(--line);border-radius:999px;padding:6px 12px;color:inherit;text-decoration:none;background:var(--card)}article{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:18px;margin:0 0 14px;box-shadow:0 8px 28px #0000000a}.meta{display:flex;justify-content:space-between;gap:10px;color:var(--muted);font-size:13px}.tag{color:var(--accent);font-weight:700}article h2{font:750 23px/1.2 Georgia,"Songti SC",serif;margin:8px 0 12px}.content img{display:block;width:100%;height:auto;border-radius:12px;margin:14px 0;background:var(--table-alt)}.content pre{max-width:100%;overflow:auto}.content a{color:var(--accent);text-underline-offset:3px}.table-scroll{max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;margin:16px 0;border:1px solid var(--line);border-radius:12px;background:var(--card);scrollbar-width:thin}.table-scroll:focus{outline:3px solid color-mix(in srgb,var(--accent) 28%,transparent);outline-offset:2px}.table-scroll table{width:max-content;min-width:100%;border:0;border-collapse:separate;border-spacing:0;font-size:14px;line-height:1.45}.table-scroll th,.table-scroll td{min-width:120px;max-width:260px;padding:10px 12px;border-right:1px solid var(--line);border-bottom:1px solid var(--line);text-align:left!important;vertical-align:top;overflow-wrap:anywhere}.table-scroll th{position:sticky;top:0;z-index:2;background:var(--table-head);font-weight:750}.table-scroll tr:nth-child(even) td{background:var(--table-alt)}.table-scroll th:first-child,.table-scroll td:first-child{position:sticky;left:0;z-index:1;min-width:58px;max-width:150px;background:var(--card);font-weight:700;box-shadow:1px 0 0 var(--line)}.table-scroll th:first-child{z-index:3;background:var(--table-head)}.table-scroll tr:nth-child(even) td:first-child{background:var(--table-alt)}.table-scroll tr:last-child td{border-bottom:0}.table-scroll th:last-child,.table-scroll td:last-child{border-right:0}.empty{padding:42px 18px;text-align:center;color:var(--muted)}footer{color:var(--muted);font-size:13px;padding:24px 4px}@media(max-width:560px){.shell{padding-inline:10px}article{padding:15px;border-radius:15px}.table-scroll{margin-inline:-4px}.table-scroll th,.table-scroll td{min-width:108px;max-width:220px;padding:9px 10px;font-size:13px}}@media(prefers-color-scheme:dark){:root{--bg:#141412;--card:#1e1e1a;--text:#f3efe6;--muted:#aaa69b;--line:#3b3933;--accent:#ff8268;--table-head:#302e29;--table-alt:#25241f}}`;

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, "i"))?.[1] || "";
}

function qualityImage(tag) {
  const src = attribute(tag, "src");
  if (!src || /(?:favicon|google\.com\/s2\/favicons)/i.test(src)) return false;
  const width = Number(attribute(tag, "data-published-width") || attribute(tag, "width"));
  const height = Number(attribute(tag, "data-published-height") || attribute(tag, "height"));
  return width >= 720 && height >= 480 && width * height >= 600000;
}

function addInlineStyle(tag, style) {
  if (/\bstyle=["']/i.test(tag)) {
    return tag.replace(/\bstyle=(["'])(.*?)\1/i, (_match, quote, current) => `style=${quote}${current};${style}${quote}`);
  }
  return tag.replace(/>$/, ` style="${style}">`);
}

function preparedHtml(html, { rss = false } = {}) {
  let output = html.replace(/<img\b[^>]*>/gi, tag => qualityImage(tag)
    ? tag.replace(/<img\b/i, '<img loading="lazy" decoding="async"')
    : "");
  output = output.replace(/<figure\b[^>]*>\s*<\/figure>/gi, "");
  output = output.replace(/<table\b[^>]*>/gi, tag => {
    const wrapper = rss
      ? '<div style="max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;margin:16px 0">'
      : '<div class="table-scroll" role="region" aria-label="横向滑动查看完整表格" tabindex="0">';
    return `${wrapper}${rss ? addInlineStyle(tag, "min-width:720px;width:100%;border-collapse:collapse;font-size:14px;line-height:1.45") : tag}`;
  }).replace(/<\/table>/gi, "</table></div>");
  if (rss) {
    output = output.replace(/<(th|td)\b[^>]*>/gi, tag => addInlineStyle(tag, "padding:9px 10px;border:1px solid #d8d3c8;text-align:left;vertical-align:top"));
  }
  return output;
}

function page(filter) {
  const list = filter ? items.filter(x => x.taskId === filter) : items;
  const title = filter ? tasks.find(x => x.id === filter)?.title || "任务结果" : "四份每日观察";
  const cards = list.map(item => `<article id="${escapeXml(item.id)}"><div class="meta"><span class="tag">${escapeXml(item.taskTitle)}</span><time>${new Date(item.publishedAt).toLocaleString("zh-CN",{timeZone:"Asia/Shanghai",hour12:false})}</time></div><h2>${escapeXml(item.text.split("\n")[0].slice(0,80) || item.taskTitle)}</h2><div class="content">${preparedHtml(item.html)}</div></article>`).join("") || `<div class="empty">首次采集完成后，内容会出现在这里。</div>`;
  const nav = [`<a href="${basePath}/">全部</a>`, ...tasks.map(t => `<a href="${basePath}/${t.id}.html">${escapeXml(t.title)}</a>`)].join("");
  const feedHref = filter ? `${basePath}/feeds/${filter}.xml` : `${basePath}/rss.xml`;
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#f4f1ea"><link rel="alternate" type="application/rss+xml" title="${escapeXml(title)}" href="${feedHref}"><title>${escapeXml(title)}</title><style>${css}</style></head><body><main class="shell"><header><h1>${escapeXml(title)}</h1><p class="deck">原文呈现 · 手机优先 · 自动更新</p></header><nav class="filters">${nav}</nav>${cards}<footer>内容保持 ChatGPT 任务原文，仅优化阅读版式。</footer></main></body></html>`;
}

function rss(filter) {
  const list = (filter ? items.filter(x => x.taskId === filter) : items).slice(0, 100);
  const title = filter ? tasks.find(x => x.id === filter)?.title || "任务结果" : "ChatGPT 计划任务合集";
  const entries = list.map(item => `<item><title>${escapeXml(item.taskTitle)}</title><link>${escapeXml(`${baseUrl}/${filter ? `${filter}.html` : ""}#${item.id}`)}</link><guid isPermaLink="false">${escapeXml(item.hash)}</guid><pubDate>${new Date(item.publishedAt).toUTCString()}</pubDate><description><![CDATA[${preparedHtml(item.html, { rss: true }).replaceAll("]]>", "]]]]><![CDATA[>")}]]></description></item>`).join("");
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
