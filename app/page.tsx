import fs from "node:fs";
import path from "node:path";

type Item = { id:string; taskId:string; taskTitle:string; publishedAt:string; html:string; text:string };

export default function Home() {
  const file = path.join(process.cwd(), "archive/index.json");
  const items: Item[] = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")).items : [];
  const tasks = ["每日新闻摄影精选","每日重点简报","美股收盘日报","AI Turning Point Scan","世界杯赛日回顾"];
  return <main className="shell">
    <header><p className="eyebrow">FIVE SIGNALS</p><h1>五份每日观察</h1><p className="deck">原文呈现 · 手机优先 · 自动更新</p></header>
    <nav className="filters"><button className="active">全部</button>{tasks.map(t=><button key={t}>{t}</button>)}</nav>
    {items.length ? items.map(item=><article key={item.id}>
      <div className="meta"><span>{item.taskTitle}</span><time>{new Date(item.publishedAt).toLocaleString("zh-CN")}</time></div>
      <h2>{item.text.split("\n")[0].slice(0,80)}</h2>
      <div className="content" dangerouslySetInnerHTML={{__html:item.html}} />
    </article>) : <section className="empty"><div className="pulse"/><h2>等待首次采集</h2><p>完成一次独立登录后，五个任务的最新结果会依次出现在这里。</p></section>}
    <footer>内容保持 ChatGPT 任务原文，仅优化阅读版式。</footer>
  </main>;
}
