import fs from "node:fs/promises";
import path from "node:path";

export const root = path.resolve(import.meta.dirname, "..");
export const archiveDir = path.join(root, "archive");
export const docsDir = path.join(root, "docs");
export const profileDir = path.join(root, ".collector-profile");
export const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

export async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, "utf8")); } catch { return fallback; }
}

export async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(value, null, 2) + "\n");
}

export function escapeXml(value = "") {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function slugDate(date = new Date()) {
  return date.toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z");
}
