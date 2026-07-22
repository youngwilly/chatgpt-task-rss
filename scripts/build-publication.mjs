import fs from "node:fs/promises";
import path from "node:path";
import { archiveDir, docsDir, escapeXml, readJson, root } from "./lib.mjs";

const tasks = await readJson(path.join(root, "config/tasks.json"), []);
const { items = [] } = await readJson(path.join(archiveDir, "index.json"), { items: [] });
const baseUrl = (process.env.PUBLIC_BASE_URL || "https://youngwilly.github.io/chatgpt-task-rss").replace(/\/$/, "");
const basePath = new URL(baseUrl).pathname.replace(/\/$/, "");
const aggregateFeedLimit = 20;
const taskFeedLimit = 5;
await fs.rm(docsDir, { recursive: true, force: true });
await fs.mkdir(path.join(docsDir, "feeds"), { recursive: true });

const css = `:root{color-scheme:light dark;--bg:#f4f1ea;--card:#fffdf8;--text:#171713;--muted:#716e64;--line:#ded9cc;--accent:#d95032;--table-head:#eee9dd;--table-alt:#faf7f0}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.65 -apple-system,BlinkMacSystemFont,"PingFang SC","Noto Sans CJK SC",sans-serif}.shell{width:min(760px,100%);margin:auto;padding:18px 14px 64px}header{padding:18px 4px 14px}h1{font:800 clamp(28px,8vw,46px)/1.05 Georgia,"Songti SC",serif;margin:0 0 8px}.deck{color:var(--muted);margin:0}.filters{display:flex;gap:8px;overflow:auto;padding:8px 0 18px;scrollbar-width:none}.filters a{white-space:nowrap;border:1px solid var(--line);border-radius:999px;padding:6px 12px;color:inherit;text-decoration:none;background:var(--card)}article{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:18px;margin:0 0 14px;box-shadow:0 8px 28px #0000000a}.meta{display:flex;justify-content:space-between;gap:10px;color:var(--muted);font-size:13px}.tag{color:var(--accent);font-weight:700}article h2{font:750 23px/1.2 Georgia,"Songti SC",serif;margin:8px 0 12px}.content img{display:block;width:100%;height:auto;border-radius:12px;margin:14px 0;background:var(--table-alt)}.content pre{max-width:100%;overflow:auto}.content a{color:var(--accent);text-underline-offset:3px}.table-scroll{max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;margin:16px 0;border:1px solid var(--line);border-radius:12px;background:var(--card);scrollbar-width:thin}.table-scroll:focus{outline:3px solid color-mix(in srgb,var(--accent) 28%,transparent);outline-offset:2px}.table-scroll table{width:max-content;min-width:100%;border:0;border-collapse:separate;border-spacing:0;font-size:14px;line-height:1.45}.table-scroll th,.table-scroll td{min-width:120px;max-width:260px;padding:10px 12px;border-right:1px solid var(--line);border-bottom:1px solid var(--line);text-align:left!important;vertical-align:top;overflow-wrap:anywhere}.table-scroll th{position:sticky;top:0;z-index:2;background:var(--table-head);font-weight:750}.table-scroll tr:nth-child(even) td{background:var(--table-alt)}.table-scroll th:first-child,.table-scroll td:first-child{position:sticky;left:0;z-index:1;min-width:58px;max-width:150px;background:var(--card);font-weight:700;box-shadow:1px 0 0 var(--line)}.table-scroll th:first-child{z-index:3;background:var(--table-head)}.table-scroll tr:nth-child(even) td:first-child{background:var(--table-alt)}.table-scroll tr:last-child td{border-bottom:0}.table-scroll th:last-child,.table-scroll td:last-child{border-right:0}.empty{padding:42px 18px;text-align:center;color:var(--muted)}footer{color:var(--muted);font-size:13px;padding:24px 4px}@media(max-width:560px){.shell{padding-inline:10px}article{padding:15px;border-radius:15px}.table-scroll{margin-inline:-4px}.table-scroll th,.table-scroll td{min-width:108px;max-width:220px;padding:9px 10px;font-size:13px}}@media(prefers-color-scheme:dark){:root{--bg:#141412;--card:#1e1e1a;--text:#f3efe6;--muted:#aaa69b;--line:#3b3933;--accent:#ff8268;--table-head:#302e29;--table-alt:#25241f}}`;

const platformCss = `html{-webkit-text-size-adjust:100%;text-size-adjust:100%;scroll-behavior:smooth}body{min-width:320px}.shell{padding-left:max(14px,env(safe-area-inset-left));padding-right:max(14px,env(safe-area-inset-right));padding-bottom:max(64px,env(safe-area-inset-bottom))}.content{overflow-wrap:anywhere}.content p{margin-block:0 1em}.content h1,.content h2,.content h3,.content h4{line-height:1.3;margin-block:1.35em .55em}.content ul,.content ol{padding-inline-start:1.5em}.content blockquote{margin:1.25em 0;padding:.1em 0 .1em 1em;border-left:3px solid var(--accent);color:var(--muted)}.content pre{padding:14px;border:1px solid var(--line);border-radius:10px;background:var(--table-alt);font-size:13px;line-height:1.5}.content code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.content img{max-height:78vh;object-fit:contain}.media-gallery{display:grid;gap:12px;margin:4px 0 22px}.media-gallery figure{margin:0}.media-gallery a{display:block;border-radius:13px;overflow:hidden;background:var(--table-alt)}.media-gallery img{margin:0;width:100%;max-height:none;aspect-ratio:auto;object-fit:contain}.media-gallery figcaption{padding:8px 2px 0;color:var(--muted);font-size:12px;line-height:1.45}.media-gallery figcaption span{white-space:nowrap}.filters a{display:inline-flex;align-items:center;min-height:42px}.filters a:focus-visible,.content a:focus-visible{outline:3px solid var(--accent);outline-offset:3px;border-radius:4px}@media(min-width:700px){.shell{width:min(900px,100%);padding-top:30px}.filters{flex-wrap:wrap;overflow:visible}article{padding:24px;margin-bottom:18px}.content{font-size:17px;line-height:1.72}.media-gallery:has(figure:nth-child(2)){grid-template-columns:repeat(2,minmax(0,1fr))}.table-scroll th,.table-scroll td{padding:11px 13px}}@media(min-width:1100px){.shell{width:min(1080px,100%);padding-top:42px}header{padding-block:24px 18px}article{padding:30px 34px;border-radius:22px}.content{font-size:18px;line-height:1.75}.content>p,.content>h1,.content>h2,.content>h3,.content>h4,.content>ul,.content>ol,.content>blockquote{max-width:74ch}.table-scroll{margin-block:22px}.table-scroll th,.table-scroll td{font-size:14px}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}@media(forced-colors:active){.filters a,article,.table-scroll,.table-scroll th,.table-scroll td{border-color:CanvasText}.tag,.content a{color:LinkText}}@media print{:root{color-scheme:light;--bg:#fff;--card:#fff;--text:#000;--muted:#444;--line:#aaa;--accent:#000;--table-head:#eee;--table-alt:#f7f7f7}body{background:#fff;font:11pt/1.5 Georgia,"Songti SC",serif}.shell{width:auto;max-width:none;padding:0}.filters,.deck,footer{display:none}header{padding:0 0 12pt}h1{font-size:24pt}article{border:0;border-radius:0;box-shadow:none;padding:0;margin:0 0 20pt;break-inside:auto}article h2{break-after:avoid}.content a{color:#000;text-decoration:underline}.content img{max-height:20cm;break-inside:avoid}.table-scroll{overflow:visible;border-radius:0;break-inside:avoid}.table-scroll table{width:100%;min-width:0;font-size:8pt}.table-scroll th,.table-scroll td{position:static!important;min-width:0;max-width:none;padding:4pt;box-shadow:none}.meta{font-size:9pt}}`;

const tableCardCss = `.table-mobile{display:none}@media(max-width:699px){.table-scroll{display:none}.table-mobile{display:grid;gap:10px;margin:14px 0}.table-card{margin:0;border:1px solid var(--line);border-radius:13px;background:var(--card);overflow:hidden}.table-card summary{display:grid;grid-template-columns:minmax(0,1fr) 28px;align-items:center;gap:10px;min-height:52px;padding:11px 12px;cursor:pointer;list-style:none;-webkit-tap-highlight-color:transparent}.table-card summary::-webkit-details-marker{display:none}.table-card summary::after{content:"＋";display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:var(--table-head);color:var(--muted);font-size:18px;line-height:1}.table-card[open] summary{border-bottom:1px solid var(--line);background:var(--table-alt)}.table-card[open] summary::after{content:"−"}.table-card-title{display:block;color:var(--text);font-size:15px;font-weight:750;line-height:1.35}.table-card-meta{display:block;margin-top:3px;color:var(--muted);font-size:12px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.table-card dl{margin:0}.table-card dl>div{display:grid;grid-template-columns:minmax(88px,34%) minmax(0,1fr);gap:10px;padding:9px 12px;border-bottom:1px solid var(--line)}.table-card dl>div:last-child{border-bottom:0}.table-card dt{color:var(--muted);font-size:12px;font-weight:700;line-height:1.45}.table-card dd{min-width:0;margin:0;color:var(--text);font-size:13px;line-height:1.5;overflow-wrap:anywhere}.table-card dd p{margin:0}.table-card summary:focus-visible{outline:3px solid var(--accent);outline-offset:-3px}}@media print{.table-mobile{display:none!important}.table-scroll{display:block!important}}`;

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

function plainText(html = "") {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanSourceMarkup(html) {
  let output = html
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, "")
    .replace(/<\/?span\b[^>]*>/gi, "")
    .replace(/\s+(?:class|style|data-[\w:-]+|aria-[\w:-]+|tabindex|alt|role)=(?:"[^"]*"|'[^']*')/gi, "");
  for (let pass = 0; pass < 3; pass++) {
    output = output.replace(/<(div|p)\b[^>]*>\s*<\/\1>/gi, "");
  }
  return output;
}

function tableParts(table) {
  const head = table.match(/<thead\b[^>]*>([\s\S]*?)<\/thead>/i)?.[1] || "";
  const headers = [...head.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].map(match => plainText(match[1]));
  const body = table.match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i)?.[1] || table.replace(/<thead\b[^>]*>[\s\S]*?<\/thead>/i, "");
  const rows = [...body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(row =>
    [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(cell => cell[1])
  ).filter(cells => cells.length);
  return { headers, rows };
}

function tableCards(table, { rss = false } = {}) {
  const { headers, rows } = tableParts(table);
  if (!headers.length || !rows.length) return "";
  if (rss) {
    return `<div>${rows.map(cells => {
      const first = plainText(cells[0]);
      const primaryIndex = cells.length > 1 && /^[\d\s#＋+\-.%()（）]+$/.test(first) ? 1 : 0;
      const primary = plainText(cells[primaryIndex]) || "数据项";
      return `<section><h4>${escapeXml(primary)}</h4><dl>${cells.map((cell, index) => `<dt><strong>${escapeXml(headers[index] || `第${index + 1}列`)}</strong></dt><dd>${cell}</dd>`).join("")}</dl></section><hr>`;
    }).join("")}</div>`;
  }
  return `<div class="table-mobile" role="list" aria-label="表格的手机卡片视图">${rows.map(cells => {
    const first = plainText(cells[0]);
    const primaryIndex = cells.length > 1 && /^[\d\s#＋+\-.%()（）]+$/.test(first) ? 1 : 0;
    const secondaryIndex = primaryIndex === 0 && cells.length > 1 ? 1 : 0;
    const primary = plainText(cells[primaryIndex]) || `第${rows.indexOf(cells) + 1}项`;
    const secondary = cells[secondaryIndex] ? `${headers[secondaryIndex] || ""} ${plainText(cells[secondaryIndex])}`.trim().slice(0, 70) : "点按查看详情";
    return `<details class="table-card" role="listitem"><summary><span><span class="table-card-title">${escapeXml(primary)}</span><span class="table-card-meta">${escapeXml(secondary)}</span></span></summary><dl>${cells.map((cell, index) => `<div><dt>${escapeXml(headers[index] || `第${index + 1}列`)}</dt><dd>${cell}</dd></div>`).join("")}</dl></details>`;
  }).join("")}</div>`;
}

function preparedHtml(html, { rss = false } = {}) {
  let output = cleanSourceMarkup(html).replace(/<img\b[^>]*>/gi, tag => qualityImage(tag)
    ? tag.replace(/<img\b/i, '<img loading="lazy" decoding="async"')
    : "");
  output = output.replace(/<figure\b[^>]*>\s*<\/figure>/gi, "");
  output = output.replace(/<table\b[^>]*>[\s\S]*?<\/table>/gi, table => {
    const cards = tableCards(table, { rss });
    if (rss) return cards || table;
    return `${cards}<div class="table-scroll" role="region" aria-label="完整表格" tabindex="0">${table}</div>`;
  });
  return output;
}

function mediaMarkup(item, { rss = false } = {}) {
  const media = (item.media || []).filter(image => suitableMedia(image));
  if (!media.length) return "";
  return `<div class="media-gallery">${media.map(image => {
    const src = /^https?:\/\//i.test(image.src)
      ? image.src
      : `${rss ? baseUrl : basePath}/${image.src.replace(/^\//, "")}`;
    const sourceUrl = image.sourceUrl || src;
    const label = image.sourceLabel || (() => {
      try { return new URL(sourceUrl).hostname.replace(/^www\./, ""); } catch { return "图片来源"; }
    })();
    const alt = image.alt || `${item.taskTitle}相关图片`;
    return `<figure><a href="${escapeXml(sourceUrl)}" target="_blank" rel="noreferrer noopener"><img src="${escapeXml(src)}" alt="${escapeXml(alt)}" width="${Number(image.width)}" height="${Number(image.height)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-published-width="${Number(image.width)}" data-published-height="${Number(image.height)}"></a><figcaption>${escapeXml(alt)} · <span>来源：${escapeXml(label)}</span></figcaption></figure>`;
  }).join("")}</div>`;
}

function suitableMedia(image) {
  return image?.src
    && Number(image.width) >= 720
    && Number(image.height) >= 400
    && Number(image.width) * Number(image.height) >= 320000;
}

function page(filter) {
  const list = filter ? items.filter(x => x.taskId === filter) : items;
  const title = filter ? tasks.find(x => x.id === filter)?.title || "任务结果" : "四份每日观察";
  const cards = list.map(item => `<article id="${escapeXml(item.id)}"><div class="meta"><span class="tag">${escapeXml(item.taskTitle)}</span><time>${new Date(item.publishedAt).toLocaleString("zh-CN",{timeZone:"Asia/Shanghai",hour12:false})}</time></div><h2>${escapeXml(item.text.split("\n")[0].slice(0,80) || item.taskTitle)}</h2><div class="content">${mediaMarkup(item)}${preparedHtml(item.html)}</div></article>`).join("") || `<div class="empty">首次采集完成后，内容会出现在这里。</div>`;
  const nav = [`<a href="${basePath}/">全部</a>`, ...tasks.map(t => `<a href="${basePath}/${t.id}.html">${escapeXml(t.title)}</a>`)].join("");
  const feedHref = filter ? `${basePath}/feeds/${filter}.xml` : `${basePath}/rss.xml`;
  const jsonHref = filter ? `${basePath}/feeds/${filter}.json` : `${basePath}/feed.json`;
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="format-detection" content="telephone=no"><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#f4f1ea" media="(prefers-color-scheme:light)"><meta name="theme-color" content="#141412" media="(prefers-color-scheme:dark)"><link rel="alternate" type="application/rss+xml" title="${escapeXml(title)}" href="${feedHref}"><link rel="alternate" type="application/feed+json" title="${escapeXml(title)} JSON Feed" href="${jsonHref}"><title>${escapeXml(title)}</title><style>${css}${platformCss}${tableCardCss}</style></head><body><main class="shell"><header><h1>${escapeXml(title)}</h1><p class="deck">原文呈现 · 全平台阅读 · 自动更新</p></header><nav class="filters" aria-label="内容分类">${nav}</nav>${cards}<footer>内容保持 ChatGPT 任务原文，仅优化阅读版式。</footer></main></body></html>`;
}

function itemTitle(item) {
  const firstLine = item.text.split("\n").map(line => line.trim()).find(Boolean) || item.taskTitle;
  if (firstLine === item.taskTitle) return item.taskTitle;
  if (firstLine.startsWith(item.taskTitle)) return firstLine.slice(0, 76);
  return `${item.taskTitle}｜${firstLine.slice(0, 56)}`;
}

function itemSummary(item) {
  return item.text.replace(/\s+/g, " ").trim().slice(0, 420);
}

function rss(filter, feedFile) {
  const list = (filter ? items.filter(x => x.taskId === filter) : items)
    .slice(0, filter ? taskFeedLimit : aggregateFeedLimit);
  const title = filter ? tasks.find(x => x.id === filter)?.title || "任务结果" : "ChatGPT 计划任务合集";
  const feedUrl = filter ? `${baseUrl}/feeds/${filter}.xml` : `${baseUrl}/${feedFile || "rss.xml"}`;
  const lastBuildDate = list.length ? new Date(list[0].publishedAt).toUTCString() : new Date().toUTCString();
  const entries = list.map(item => {
    const url = `${baseUrl}/${filter ? `${filter}.html` : ""}#${item.id}`;
    const fullContent = `${mediaMarkup(item, { rss: true })}${preparedHtml(item.html, { rss: true })}`.replaceAll("]]>", "]]]]><![CDATA[>");
    return `<item><title>${escapeXml(itemTitle(item))}</title><link>${escapeXml(url)}</link><guid isPermaLink="false">${escapeXml(item.hash)}</guid><pubDate>${new Date(item.publishedAt).toUTCString()}</pubDate><category>${escapeXml(item.taskTitle)}</category><description>${escapeXml(itemSummary(item))}</description><content:encoded><![CDATA[${fullContent}]]></content:encoded></item>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>${escapeXml(title)}</title><link>${escapeXml(baseUrl)}</link><atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml"/><description>ChatGPT 计划任务原文订阅</description><language>zh-cn</language><lastBuildDate>${lastBuildDate}</lastBuildDate><ttl>10</ttl><generator>ChatGPT Task RSS</generator>${entries}</channel></rss>`;
}

function jsonFeed(filter) {
  const list = (filter ? items.filter(x => x.taskId === filter) : items)
    .slice(0, filter ? taskFeedLimit : aggregateFeedLimit);
  const title = filter ? tasks.find(x => x.id === filter)?.title || "任务结果" : "ChatGPT 计划任务合集";
  const feedUrl = filter ? `${baseUrl}/feeds/${filter}.json` : `${baseUrl}/feed.json`;
  return JSON.stringify({
    version: "https://jsonfeed.org/version/1.1",
    title,
    home_page_url: filter ? `${baseUrl}/${filter}.html` : `${baseUrl}/`,
    feed_url: feedUrl,
    language: "zh-CN",
    description: "ChatGPT 计划任务原文订阅",
    items: list.map(item => ({
      id: item.hash,
      url: `${baseUrl}/${filter ? `${filter}.html` : ""}#${item.id}`,
      title: itemTitle(item),
      summary: itemSummary(item),
      content_html: `${mediaMarkup(item, { rss: true })}${preparedHtml(item.html, { rss: true })}`,
      date_published: item.publishedAt,
      tags: [item.taskTitle]
    }))
  }, null, 2) + "\n";
}

await fs.writeFile(path.join(docsDir, "index.html"), page());
await fs.writeFile(path.join(docsDir, "rss.xml"), rss());
await fs.writeFile(path.join(docsDir, "feed.xml"), rss(undefined, "feed.xml"));
await fs.writeFile(path.join(docsDir, "feed.json"), jsonFeed());
await fs.writeFile(path.join(docsDir, ".nojekyll"), "");
await fs.writeFile(path.join(docsDir, "robots.txt"), "User-agent: *\nAllow: /\n");
await fs.cp(path.join(archiveDir, "assets"), path.join(docsDir, "assets"), { recursive: true, force: true }).catch(() => {});
for (const task of tasks) {
  await fs.writeFile(path.join(docsDir, `${task.id}.html`), page(task.id));
  await fs.writeFile(path.join(docsDir, "feeds", `${task.id}.xml`), rss(task.id));
  await fs.writeFile(path.join(docsDir, "feeds", `${task.id}.json`), jsonFeed(task.id));
}
