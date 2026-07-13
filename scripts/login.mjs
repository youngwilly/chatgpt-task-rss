import { spawn } from "node:child_process";
import { profileDir } from "./lib.mjs";

const chrome = spawn("open", [
  "-na", "Google Chrome",
  "--args",
  `--user-data-dir=${profileDir}`,
  "--profile-directory=Default",
  "--new-window",
  "https://chatgpt.com/"
], { stdio: "inherit" });

chrome.on("exit", (code) => process.exit(code ?? 0));
console.log("已用普通 Chrome 打开专用登录窗口。登录完成后请关闭该窗口。");
