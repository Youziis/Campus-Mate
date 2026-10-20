import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { configuredDatabaseFile } from "../server/data-files.js";
import { activityIso } from "../shared/time.js";

// 一次性数据导入工具，不在启动或 db:seed 时自动执行。
// 用法：node scripts/add-screenshot-activities.js "截图所在文件夹"
// 每张图片使用内容哈希命名；重复执行时根据封面识别已添加活动，不重复创建。
const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const sourceDirectory = process.argv[2] && path.resolve(process.argv[2]);
if (!sourceDirectory || !fs.statSync(sourceDirectory).isDirectory()) {
  throw Error("请提供包含七张原始活动截图的文件夹路径。");
}

// 时间均为北京时间，通过 activityIso 统一转为 UTC 入库。
const records = [
  {
    source: "桌游1.jpg", key: "cat-boardgame", creatorId: 9, creatorName: "悦悦同学",
    title: "猫咪主题桌游新手局｜周末一起开一桌",
    category: "社交", location: "厦大南门附近桌游空间（门店成团后确认）",
    startsAt: "2026-10-31T14:20", endsAt: "2026-10-31T17:50", capacity: 4,
    interests: ["猫咪", "桌游", "新手友好", "社交"],
    description: "被截图里的猫咪棋盘和彩色筹码吸引了，想找几位同样喜欢猫猫、愿意尝试桌游的同学一起玩。\n\n先用轻量游戏认识彼此，再尝试猫咪主题的策略桌游，开局前一起讲规则、走一轮示范，不要求有桌游经验。不会因为输赢催促别人，想慢慢思考也没关系。\n\n共4人，包含发起者。建议提前10分钟集合，游戏与门店在报名通过后共同确认，场地和饮品按实际消费AA。想带自己的桌游也可以提前联系我。",
  },
  {
    source: "桌游2.jpg", key: "strategy-boardgame", creatorId: 6, creatorName: "小杰",
    title: "中策桌游组局｜周二晚来一场认真博弈",
    category: "社交", location: "厦门集美大学城桌游空间（门店待确认）",
    startsAt: "2026-10-27T19:00", endsAt: "2026-10-27T22:00", capacity: 4,
    interests: ["桌游", "游戏", "策略游戏", "社交"],
    description: "想找能一起研究规则和讨论策略的桌游搭子。参考截图中的卡牌、地图和资源管理玩法，这次准备选一款中等复杂度的策略桌游，完整体验一场布局与决策。\n\n19:00集合，先讲解规则和回合流程，再进行正式对局，结束后留一点时间复盘。玩过类似游戏的同学可以一起带新，第一次接触中策游戏也欢迎，提前愿意看看规则就可以。\n\n总人数4人，包含我。具体游戏根据报名同学的经验一起决定，场地费用按实际消费AA，不强制购买桌游或饮品。",
  },
  {
    source: "观影-情书.jpg", key: "love-letter-film", creatorId: 4, creatorName: "周同学",
    title: "《情书》观影小聚｜一杯咖啡和一封未寄出的信",
    category: "文化", location: "集美大学城影音咖啡空间（场地待确认）",
    startsAt: "2026-10-30T19:00", endsAt: "2026-10-30T21:30", capacity: 6,
    interests: ["电影", "读书", "咖啡", "情书"],
    description: "平时喜欢读书和喝咖啡，也想把安静的周五晚上留给一部电影。看到截图中的《情书》主题卡片，想约几位同学一起重温这段关于记忆、书信和青春的故事。\n\n计划先一起看《情书》，观影后聊聊喜欢的镜头和台词，也可以分享一本让自己想到这部电影的书。不需要提前做功课，看过或第一次看都可以，不强制每个人发言。\n\n总人数6人，包含发起者。请尽量准时，观影过程中手机静音、避免剧透。门店、片源和实际消费在报名通过后提前确认，费用按实际AA。",
  },
  {
    source: "观影2.jpg", key: "cyberpunk-film", creatorId: 2, creatorName: "林同学",
    title: "夜之城同好局｜《赛博朋克：边缘行者》观影交流",
    category: "文化", location: "厦门集美影音空间（场地待确认）",
    startsAt: "2026-11-01T14:30", endsAt: "2026-11-01T19:00", capacity: 8,
    interests: ["动漫", "游戏", "赛博朋克", "观影"],
    description: "平时喜欢游戏，也想认识对夜之城世界观感兴趣的同学。以截图中的赛博朋克海报为主题，组织一次动画观影与游戏闲聊，欢迎喜欢科幻、城市美术和角色故事的伙伴。\n\n14:30集合，选看《赛博朋克：边缘行者》第一季的已确认片源，中间安排休息，最后一起聊聊角色选择、音乐和游戏中的城市体验。具体集数会在成团后确认，不把海报中的续作信息当成已确定片单。\n\n总人数8人，包含发起者。请不要提前剧透；可以只参加观影或后半段交流，报名时说明即可。场地与饮品按实际消费AA。",
  },
  {
    source: "观影3.jpg", key: "eva-film", creatorId: 12, creatorName: "黑猫",
    title: "EVA《序》观影交流｜从构图聊到角色心事",
    category: "文化", location: "集美大学城影音空间（场地待确认）",
    startsAt: "2026-11-02T19:00", endsAt: "2026-11-02T21:00", capacity: 6,
    interests: ["动漫", "电影", "摄影", "EVA"],
    description: "喜欢摄影和记录日常，也会被动画里的构图、色彩和光影打动。看到这张EVA《序》的海报，想找同学一起看电影，再从画面语言聊到角色的成长与关系。\n\n本次以《福音战士新剧场版：序》为观影片单，先用几分钟交代基础背景，再安静观影，最后分享喜欢的画面。老观众欢迎交流，新观众也能加入，不做设定知识考试，也不强制发言。\n\n总人数6人，包含发起者。请避免剧透后续作品。门店、房间和播放安排在报名通过后确认，场地费用按实际AA。",
  },
  {
    source: "观影4.jpg", key: "gintama-film", creatorId: 1, creatorName: "Yuuko",
    title: "银魂剧场版同好观影｜笑点有人接，热血有人懂",
    category: "文化", location: "厦门集美影音空间（场地待确认）",
    startsAt: "2026-11-07T19:00", endsAt: "2026-11-07T21:00", capacity: 8,
    interests: ["动漫", "漫画", "银魂", "观影"],
    description: "想把喜欢动漫和漫画的同学聚到一起，看一部银魂剧场版，再聊聊万事屋那些又好笑又让人感动的片段。喜欢截图里这股热血劲的同好，欢迎来接头！\n\n计划19:00集合后观影，片目从已确认可播放的银魂剧场版中共同选择，开场前说明背景和可能涉及的剧情。看完可以交流喜欢的角色、漫画和表情包，带不带周边都可以。\n\n总人数8人，包含我。请尊重不同角色喜好，不在观影过程中大声聊天或提前剧透。具体门店、片目和消费在报名通过后确认，费用按实际AA。",
  },
  {
    source: "麻将.jpg", key: "mahjong-ktv", creatorId: 5, creatorName: "何志美",
    title: "周四下课后放松局｜麻将与K歌一起安排",
    category: "社交", location: "厦门集美棋牌K歌空间（门店待确认）",
    startsAt: "2026-10-29T19:00", endsAt: "2026-10-29T22:00", capacity: 4,
    interests: ["探店", "麻将", "KTV", "社交"],
    description: "平时喜欢探店，看到截图里能打麻将又能K歌的聚会空间，想约三位同学下课后一起放松。不会唱歌也能来，不熟悉麻将规则也可以先学一轮，大家轮流选择喜欢的项目。\n\n19:00集合，先确认麻将玩法与轮换方式，再根据大家的兴趣安排K歌和聊天。以轻松娱乐和认识同伴为主，注意音量，也尊重不想被拍照的同学。\n\n总人数4人，包含发起者。包间、时间和费用预算会在报名通过后一起确认，场地与饮品按实际消费AA，自愿点单，不强制饮酒。",
  },
];

if (records.length !== 7 || new Set(records.map((record) => record.creatorId)).size !== 7) {
  throw Error("必须恰好七条活动，并由七个不同账号发布。");
}
const hash = (buffer) => createHash("sha256").update(buffer).digest("hex");
const uploadsDirectory = path.join(projectRoot, "server/uploads");
const databaseFile = configuredDatabaseFile();
const database = new DatabaseSync(databaseFile);
database.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
const beforeCount = database.prepare("SELECT count(*) AS total FROM activities").get().total;
const prepared = records.map((record) => {
  const creator = database.prepare("SELECT id,name FROM users WHERE id=?").get(record.creatorId);
  if (creator?.name !== record.creatorName) throw Error(`请确认发起者账号：${record.creatorName}`);
  const category = database.prepare("SELECT id FROM activity_categories WHERE name=? AND enabled=1").get(record.category);
  if (!category) throw Error(`活动分类不存在：${record.category}`);
  const buffer = fs.readFileSync(path.join(sourceDirectory, record.source));
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer.length > 5 * 1024 * 1024) {
    throw Error(`图片不是有效的 JPG 或超过5MB：${record.source}`);
  }
  const digest = hash(buffer);
  const filename = `activity-${record.key}-${digest.slice(0, 12)}.jpg`;
  const image = `/uploads/${filename}`;
  const startsAt = activityIso(record.startsAt);
  const endsAt = activityIso(record.endsAt);
  if (new Date(startsAt) <= new Date() || endsAt <= startsAt) throw Error(`活动时间需要调整：${record.title}`);
  return { ...record, buffer, digest, filename, image, categoryId: category.id, startsAt, endsAt };
});
if (new Set(prepared.map((record) => record.digest)).size !== 7) throw Error("七张封面存在重复图片。");

// 保留包含 WAL 最新数据的操作前备份，以便需要时恢复。
const backupDirectory = path.join(path.dirname(databaseFile), "backups");
fs.mkdirSync(backupDirectory, { recursive: true });
const backupFile = path.join(backupDirectory, `before-seven-activities-${Date.now()}.db`);
database.prepare("VACUUM INTO ?").run(backupFile);

fs.mkdirSync(uploadsDirectory, { recursive: true });
const copiedFiles = [];
const result = [];
database.exec("BEGIN IMMEDIATE");
try {
  for (const record of prepared) {
    const existing = database.prepare("SELECT id,creator_id FROM activities WHERE image=?").get(record.image);
    if (existing && existing.creator_id !== record.creatorId) throw Error("封面已被其他发起者的活动使用。");
    const destination = path.join(uploadsDirectory, record.filename);
    if (fs.existsSync(destination)) {
      if (hash(fs.readFileSync(destination)) !== record.digest) throw Error("目标图片与原图不一致。");
    } else {
      fs.writeFileSync(destination, record.buffer, { flag: "wx" });
      copiedFiles.push(destination);
    }
    if (existing) {
      result.push({ id: existing.id, creator: record.creatorName, title: record.title, status: "already-present" });
      continue;
    }
    const activityId = Number(database.prepare(`
      INSERT INTO activities(creator_id,title,description,category,category_id,location,starts_at,ends_at,capacity,image,status)
      VALUES(?,?,?,?,?,?,?,?,?,?,'open')
    `).run(record.creatorId, record.title, record.description, record.category, record.categoryId,
      record.location, record.startsAt, record.endsAt, record.capacity, record.image).lastInsertRowid);
    for (const tag of record.interests) {
      database.prepare("INSERT OR IGNORE INTO interests(name) VALUES(?)").run(tag);
      const interest = database.prepare("SELECT id FROM interests WHERE name=?").get(tag);
      database.prepare("INSERT INTO activity_interests(activity_id,interest_id) VALUES(?,?)").run(activityId, interest.id);
    }
    // 与网站发布流程一致，发起者自动计入人数，初始显示1/总人数。
    database.prepare("INSERT INTO applications(activity_id,user_id,status,message) VALUES(?,?,'approved','组织者')")
      .run(activityId, record.creatorId);
    database.prepare("INSERT INTO uploads(user_id,path,mime) VALUES(?,?,'image/jpeg')").run(record.creatorId, record.image);
    result.push({ id: activityId, creator: record.creatorName, title: record.title, startsAt: record.startsAt, capacity: record.capacity, status: "created" });
  }
  const created = result.filter((row) => row.status === "created").length;
  const afterCount = database.prepare("SELECT count(*) AS total FROM activities").get().total;
  if (afterCount !== beforeCount + created) throw Error("活动新增数量不一致。");
  if (database.prepare("PRAGMA foreign_key_check").all().length) throw Error("数据外键检查失败。");
  database.exec("COMMIT");
  console.log(JSON.stringify({ beforeCount, created, afterCount, backupFile, activities: result }, null, 2));
} catch (error) {
  database.exec("ROLLBACK");
  for (const file of copiedFiles) fs.rmSync(file, { force: true });
  throw error;
} finally {
  database.close();
}

// 同步完整数据快照，其他成员拉取后可通过 data:import 获取这七条活动。
execFileSync(process.execPath, [path.join(projectRoot, "scripts/project-data.js"), "export"], {
  cwd: projectRoot, stdio: "inherit",
});
