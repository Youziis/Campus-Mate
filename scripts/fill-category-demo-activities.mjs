import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { db } from "../server/db.js";
import { replaceInterests } from "../server/interests.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const catalog = JSON.parse(await fs.readFile(new URL("./category-demo-catalog.json", import.meta.url), "utf8"));
const folder = path.join(root, "server/uploads/category-demo-covers");
const target = 10;
const categories = [...new Set(catalog.map((item) => item.category))];
const countCategory = db.prepare("SELECT count(*) total FROM activities WHERE category=? AND status='open'");
const digest = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");

function extension(buffer) {
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "jpg";
  if (buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return "png";
  if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "webp";
  throw new Error("返回内容不是 JPEG、PNG 或 WebP 图片");
}

async function prepareCover(item) {
  let buffer;
  // 下载过的图片可复用；网络失败后重新运行不必重复下载全部图片。
  const cached = (await fs.readdir(folder)).find((file) => file.startsWith(`${item.key}.`));
  if (cached) buffer = await fs.readFile(path.join(folder, cached));
  else {
    let lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetch(item.imageUrl, {
          headers: { "User-Agent": "Mozilla/5.0 CampusMateDemo/1.0", Referer: item.source },
          signal: AbortSignal.timeout(30000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        buffer = Buffer.from(await response.arrayBuffer());
        extension(buffer);
        if (buffer.length < 1000 || buffer.length > 15 * 1024 * 1024) throw new Error("图片大小异常");
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (!buffer) throw lastError;
  }
  const ext = extension(buffer);
  item.hash = digest(buffer);
  item.image = `/uploads/category-demo-covers/${item.key}.${ext}`;
  await fs.writeFile(path.join(folder, `${item.key}.${ext}`), buffer);
  console.log(`封面就绪：${item.category} / ${item.title} (${Math.round(buffer.length / 1024)} KB)`);
}

function schedule(item, index) {
  const beijingNow = new Date(Date.now() + 8 * 3600000);
  const start = new Date(Date.UTC(beijingNow.getUTCFullYear(), beijingNow.getUTCMonth(),
    beijingNow.getUTCDate() + 3 + (index % 21), item.hour - 8));
  // 校外长时段活动放在周末，避免学生上课期间参加长途出行。
  if (["户外", "美食", "文化", "艺术"].includes(item.category)) {
    const day = new Date(start.getTime() + 8 * 3600000).getUTCDay();
    if (day !== 0 && day !== 6) start.setUTCDate(start.getUTCDate() + 6 - day);
  }
  return [start.toISOString(), new Date(start.getTime() + item.duration * 3600000).toISOString()];
}

try {
  await fs.mkdir(folder, { recursive: true });
  const plan = [];
  for (const category of categories) {
    const need = Math.max(0, target - countCategory.get(category).total);
    const available = catalog.filter((item) => item.category === category).filter((item) =>
      !db.prepare("SELECT id FROM activities WHERE title=?").get(item.title));
    if (available.length < need) throw new Error(`${category} 仍缺少 ${need - available.length} 条候选，请补充清单`);
    plan.push(...available.slice(0, need));
  }
  if (!plan.length) console.log("八个类别均已达到10条可展示活动，无需重复导入。");

  // 图片全部准备好后再开始事务，不创建缺失封面的活动。
  const failures = [];
  for (const item of plan) {
    try { await prepareCover(item); }
    catch (error) { failures.push(`${item.key}: ${error.message}`); }
  }
  if (failures.length) throw new Error(`以下封面需要更换来源，本次未写入数据库：\n${failures.join("\n")}`);
  const hashes = new Set();
  for (const item of plan) {
    if (hashes.has(item.hash)) throw new Error(`封面内容重复：${item.key}`);
    hashes.add(item.hash);
  }
  const existingImages = db.prepare("SELECT DISTINCT image FROM activities WHERE image LIKE '/uploads/%'").all();
  for (const { image } of existingImages) {
    const file = path.join(root, "server", image.slice(1));
    try {
      const hash = digest(await fs.readFile(file));
      if (hashes.has(hash)) throw new Error(`新增封面与现有活动重复：${image}`);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  const users = db.prepare(`SELECT u.id,u.name,u.contact,group_concat(i.name,' ') tags
    FROM users u LEFT JOIN user_interests ui ON ui.user_id=u.id
    LEFT JOIN interests i ON i.id=ui.interest_id
    WHERE u.role='user' GROUP BY u.id ORDER BY u.id`).all();
  if (!users.length) throw new Error("没有可用的普通账号");
  const assigned = new Map();
  const results = [];
  db.exec("BEGIN IMMEDIATE");
  try {
    const insert = db.prepare(`INSERT INTO activities(creator_id,title,description,category,category_id,
      location,starts_at,ends_at,capacity,image,status,contact) VALUES(?,?,?,?,?,?,?,?,?,?,'open',?)`);
    for (const [index,item] of plan.entries()) {
      // 在事务内重新计数，避免执行期间有新活动发布而超过目标数量。
      if (countCategory.get(item.category).total >= target) continue;
      const category = db.prepare("SELECT id FROM activity_categories WHERE name=? AND enabled=1").get(item.category);
      if (!category) throw new Error(`分类不存在或未启用：${item.category}`);
      const creator = [...users].sort((a,b) => {
        const score = (user) => {
          const matches = item.tags.filter((tag) => (user.tags || "").split(" ").includes(tag)).length;
          return matches * 10 + (user.contact ? 1 : 0) - (assigned.get(user.id) || 0) * 2;
        };
        return score(b) - score(a) || a.id - b.id;
      })[0];
      assigned.set(creator.id,(assigned.get(creator.id) || 0)+1);
      const [start,end] = schedule(item,index);
      const description = `【演示活动】${item.details} 活动为同学自发组队，封面为主题示意，不代表原报道机构或商家承办。报名通过后请通过站内成员信息与发起者确认集合安排。`;
      const id = Number(insert.run(creator.id,item.title,description,item.category,category.id,item.location,
        start,end,item.capacity,item.image,creator.contact || "").lastInsertRowid);
      replaceInterests(db,"activity",id,item.tags);
      db.prepare("INSERT INTO applications(activity_id,user_id,status,message) VALUES(?,?,'approved','组织者')")
        .run(id,creator.id);
      results.push({id,category:item.category,title:item.title,creator:creator.name,image:item.image,
        startsAt:start,endsAt:end,source:item.source,imageUrl:item.imageUrl,sha256:item.hash});
    }
    for (const category of categories) {
      if (countCategory.get(category).total < target) throw new Error(`导入后 ${category} 未达到目标`);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  if (results.length) {
    const manifestPath = path.join(root,"docs/CATEGORY-DEMO-IMPORT.json");
    let previous = [];
    try { previous = JSON.parse(await fs.readFile(manifestPath,"utf8")); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
    await fs.writeFile(manifestPath,JSON.stringify([...previous,...results],null,2)+"\n","utf8");
    const credits = ["# 每类十条活动：新增封面来源", "",
      "此清单保存演示活动的国内来源网页、图片原始地址和本地文件。图片内容已按主题筛选，地点与拍摄时间仍以原始报道为准。",
      "原始机构、商家和照片中人物不代表活动发起者或合作方；历史报道和展览不作为正在举办的事实。",
      "许可状态：尚未确认公开复用授权。保留来源不等于获得授权，正式使用或公开分发前需取得授权或替换素材。", "",
      "| 类别 | 活动 | 本地封面 | 来源 |", "| --- | --- | --- | --- |",
      ...[...previous,...results].map((item) => `| ${item.category} | ${item.title} | ${item.image} | [原始网页](${item.source}) · [原图](${item.imageUrl}) |`),
      "", "## 重复执行", "",
      "运行 `node scripts/fill-category-demo-activities.mjs`。根据各类别 status=open 的活动数量补足到10条，按标题防止重复导入。",
      "保留所有已有活动，发起者作为已通过成员计入人数；不修改已有用户兴趣和联系方式。",
      "封面下载失败时不写入活动。清单详见 scripts/category-demo-catalog.json。导入后使用 npm run data:export 生成共享快照。", "",
    ].join("\n");
    await fs.writeFile(path.join(root,"docs/CATEGORY-DEMO-COVER-SOURCES.md"),credits,"utf8");
  }
  console.log(JSON.stringify({added:results.length,counts:categories.map((category)=>({category,total:countCategory.get(category).total})),results},null,2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  db.close();
}
