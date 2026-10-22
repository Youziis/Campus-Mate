import fs from "node:fs";
import path from "node:path";
import { bulkActivities } from "../server/bulk-activities.js";

const outputDirectory = path.resolve("server/uploads/bulk-covers");
const creditsFile = path.resolve("docs/ACTIVITY-COVER-CREDITS.md");
const api = "https://commons.wikimedia.org/w/api.php";
const usedTitles = new Set();
const credits = [];
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const requestedIndex = Number(process.env.COVER_INDEX || 0);
const selectedActivities = requestedIndex
  ? bulkActivities.slice(requestedIndex - 1, requestedIndex)
  : bulkActivities;
if (requestedIndex && !selectedActivities.length) throw new Error("COVER_INDEX 超出活动清单范围");

fs.mkdirSync(outputDirectory, { recursive: true });

function plainText(value = "") {
  return String(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

async function findImage(query) {
  const words = query.split(/\s+/).filter(Boolean);
  const attempts = [...new Set([words.slice(0, 2).join(" "), words[0], query])];
  for (const searchTerm of attempts) {
    const params = new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: searchTerm,
      gsrnamespace: "6",
      gsrlimit: "20",
      prop: "imageinfo",
      iiprop: "url|mime|extmetadata",
      iiurlwidth: "1280",
      format: "json",
      origin: "*",
    });
    let response;
    for (let retry = 0; retry < 5; retry += 1) {
      response = await fetch(`${api}?${params}`, {
        headers: { "user-agent": "Campus-Mate-demo/1.0 (educational project)" },
      });
      if (response.status !== 429) break;
      await wait(4000 * (retry + 1));
    }
    if (!response?.ok) throw new Error(`封面搜索失败：${response?.status || "网络错误"}`);
    const data = await response.json();
    const pages = Object.values(data.query?.pages || {});
    const candidates = pages.filter((page) => {
      const info = page.imageinfo?.[0];
      return info?.mime === "image/jpeg" && info.thumburl && !usedTitles.has(page.title);
    });
    const searchWords = searchTerm.toLowerCase().split(/\s+/);
    const selected = candidates.sort((a, b) => {
      const score = (page) => searchWords.filter((word) => page.title.toLowerCase().includes(word)).length;
      return score(b) - score(a) || (a.index || 0) - (b.index || 0);
    })[0];
    if (selected) {
      usedTitles.add(selected.title);
      return selected;
    }
  }
  throw new Error(`没有找到可用 JPEG：${query}`);
}

async function findImageByTitle(title) {
  const params = new URLSearchParams({
    action: "query",
    titles: title,
    prop: "imageinfo",
    iiprop: "url|mime|extmetadata",
    iiurlwidth: "1280",
    format: "json",
    origin: "*",
  });
  const response = await fetch(`${api}?${params}`, {
    headers: { "user-agent": "Campus-Mate-demo/1.0 (educational project)" },
  });
  if (!response.ok) throw new Error(`指定封面读取失败：${response.status}`);
  const page = Object.values((await response.json()).query?.pages || {})[0];
  if (page?.imageinfo?.[0]?.mime !== "image/jpeg") throw new Error(`指定封面不可用：${title}`);
  return page;
}

for (const [index, activity] of selectedActivities.entries()) {
  const page = activity.coverTitle
    ? await findImageByTitle(activity.coverTitle)
    : await findImage(activity.coverQuery);
  const info = page.imageinfo[0];
  const destination = path.join(outputDirectory, activity.cover);
  const response = await fetch(info.thumburl, {
    headers: { "user-agent": "Campus-Mate-demo/1.0 (educational project)" },
  });
  if (!response.ok) throw new Error(`封面下载失败：${response.status} ${page.title}`);
  fs.writeFileSync(destination, Buffer.from(await response.arrayBuffer()));
  const metadata = info.extmetadata || {};
  credits.push({
    file: activity.cover,
    activity: activity.title,
    sourceTitle: page.title.replace(/^File:/, ""),
    sourceUrl: info.descriptionurl,
    author: plainText(metadata.Artist?.value) || "详见来源页面",
    license: plainText(metadata.LicenseShortName?.value) || "详见来源页面",
    licenseUrl: metadata.LicenseUrl?.value || info.descriptionurl,
  });
  console.log(`[${index + 1}/${selectedActivities.length}] ${activity.title} <- ${page.title}`);
  await wait(1400);
}

const rows = credits.map((item) =>
  `| ${item.file} | ${item.activity} | [${item.sourceTitle}](${item.sourceUrl}) | ${item.author.replace(/\|/g, "\\|")} | [${item.license}](${item.licenseUrl}) |`,
);
const heading = `# 活动封面来源与许可\n\n这些封面下载自 Wikimedia Commons，并保存在 \`server/uploads/bulk-covers/\`。各文件的许可要求以来源页面为准。\n\n| 本地文件 | 用于活动 | 来源 | 作者 | 许可 |\n| --- | --- | --- | --- | --- |\n`;
if (requestedIndex && fs.existsSync(creditsFile)) {
  const file = credits[0].file;
  const lines = fs.readFileSync(creditsFile, "utf8").split(/\r?\n/);
  const rowIndex = lines.findIndex((line) => line.startsWith(`| ${file} |`));
  if (rowIndex >= 0) lines[rowIndex] = rows[0];
  else lines.push(rows[0]);
  fs.writeFileSync(creditsFile, `${lines.filter(Boolean).join("\n")}\n`, "utf8");
} else {
  fs.writeFileSync(creditsFile, `${heading}${rows.join("\n")}\n`, "utf8");
}
console.log(`已下载 ${credits.length} 张封面，并写入 ${creditsFile}`);

