import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "../server/db.js";
import { replaceInterests } from "../server/interests.js";

// 用户确认的国内来源封面。这里只导入演示活动，不修改现有活动或用户资料。
// source 是原始网页；imageUrl 是图片地址。公开复用许可尚未确认。
const activities = [
  {
    key: "badminton", category: "运动", title: "周末羽毛球双打：新手也能一起挥拍",
    description: "【演示活动】想找固定运动搭子！先热身十分钟，再按水平轮换双打，不计输赢，接不到球也没关系。请自带球拍、运动鞋和饮用水，羽毛球费用按实际平摊。集合后再一起进入场馆，场地以预约结果为准。",
    location: "学校体育馆羽毛球场入口", capacity: 6, hour: 19, duration: 2,
    tags: ["羽毛球", "运动", "交友"], preferredName: "浩然同学",
    source: "https://www.xujc.com/info/74qlqvjg.html",
    imageUrl: "https://www.xujc.com/uploads2/img/2016/11/28/20161128150445.jpg",
    scene: "厦门大学嘉庚学院与漳州开发区羽毛球交流活动",
  },
  {
    key: "sunrise", category: "户外", title: "黄厝追日出：一起等海面亮起来",
    description: "【演示活动】天亮前到黄厝海滩，找一处安全的岸边等日出，手机或相机都可以，互相帮忙拍几张照片。看完沿海边散步并各自返程。请提前安排交通、带薄外套，不下海、不靠近湿滑礁石；遇雨或大风提前通知改期。",
    location: "厦门黄厝海滩公共入口", capacity: 6, hour: 5, duration: 3,
    tags: ["摄影", "户外", "日出", "散步"], preferredName: "晨曦同学",
    source: "https://m.sohu.com/a/982757428_122530457",
    imageUrl: "https://q6.itc.cn/images01/20260202/4be4084c8ca4450d887afaea2772cd46.jpeg",
    scene: "搜狐文章标注的黄厝海滩日出，地点未独立核验",
  },
  {
    key: "study", category: "学习", title: "图书馆专注两小时：带上你的待办清单",
    description: "【演示活动】各自带着作业、备考资料或想读的书来，开始前写下两个小目标，按五十分钟专注、十分钟休息的节奏学习。我们只互相督促，不要求相同专业。图书馆内保持安静，交流放在休息时到室外进行，不代占座。",
    location: "本校图书馆一楼大厅", capacity: 5, hour: 19, duration: 2,
    tags: ["学习", "读书", "自习", "考研"], preferredName: "诗雨同学",
    source: "https://www.xujc.com/info/x4zz7224.html",
    imageUrl: "https://www.xujc.com/upload/36/03a6158de9d0121f8c2270076c9678.jpg",
    scene: "厦门大学嘉庚学院图书馆学习场景",
  },
  {
    key: "flowers", category: "生活", title: "把周末插进花瓶：零基础花艺搭子",
    description: "【演示活动】一起尝试一束小花，从修剪花枝、配色到简单包装慢慢做，不需要基础。花材和工具提前在群里商量，费用按实际购买金额平摊；也可以自带花瓶。每个人完成后互相拍照，作品自行带走。场地需提前确认。",
    location: "大学生活动中心共享手作区", capacity: 6, hour: 14, duration: 2,
    tags: ["花艺", "手作", "生活", "摄影"], preferredName: "林同学",
    source: "https://www.fjglhs.com/teach/class",
    imageUrl: "https://www.fjglhs.com/images/glhs/kt/3.jpg",
    scene: "厦门国兰花尚花艺培训课堂；配图不表示商家承办本活动",
  },
  {
    key: "boardgames", category: "社交", title: "今晚不当社恐：UNO和狼人杀破冰局",
    description: "【演示活动】先从规则简单的UNO开始，熟悉后再投票选择狼人杀或其他桌游。组织者现场讲规则，不熟练可以随时问，拒绝嘲讽和强迫发言。自带水杯，可以带小零食分享；预计玩两到三轮，提前离场请告知。",
    location: "学生活动中心桌游交流区", capacity: 8, hour: 19, duration: 3,
    tags: ["桌游", "游戏", "社交", "交友"], preferredName: "小杰",
    source: "https://yurenhao1.sizhengwang.cn/a/xmdx/240930/1939849.shtml",
    imageUrl: "https://yurenhao1.sizhengwang.cn/upload/resources/image/2024/09/30/7136056.png",
    scene: "厦门大学景润青年学生社区活动",
  },
  {
    key: "noodles", category: "美食", title: "厦门沙茶面探店：寻找你最爱的那碗汤",
    description: "【演示活动】约几个同学去老城区吃沙茶面，比较自己喜欢的配料和汤底，吃完顺路散步。具体店铺和人均预算报名后一起决定，餐费各自结算。对花生、海鲜等过敏的同学请提前说明并向店家核实配料，不勉强尝试。",
    location: "厦门中山路步行街入口集合", capacity: 5, hour: 17, duration: 2,
    tags: ["美食", "探店", "沙茶面", "打卡"], preferredName: "饭团",
    source: "https://k.sina.cn/article_2918442287_adf3e52f00100lli0.html?from=food",
    imageUrl: "https://n.sinaimg.cn/sinacn20191130ac/320/w640h480/20191130/6515-ikcaceq6474720.jpg",
    scene: "新浪用户文章中的沙茶面配图，具体店铺未确认",
  },
  {
    key: "pottery", category: "艺术", title: "鼓浪屿慢游与陶艺初体验",
    description: "【演示活动】一起坐船到鼓浪屿，在街巷慢走拍照，再找可预约的陶艺工作室体验捏塑或拉坯。零基础可参加，体验项目、费用、烧制和取件方式需提前向工作室确认。船票与体验费各自承担；未订到船票或场次则协商改期。",
    location: "厦门邮轮中心厦鼓码头出发大厅外", capacity: 5, hour: 9, duration: 5,
    tags: ["陶艺", "手作", "旅行", "摄影"], preferredName: "陈同学",
    source: "https://city.cri.cn/20170831/bffb4f7f-b702-94b3-3250-13033ebfe527.html",
    imageUrl: "https://p2.cri.cn/M00/14/70/CqgNOlmnaDyAHg2QAAAAAAAAAAA110.900x613.jpg",
    scene: "国际在线刊载的鼓浪屿陶艺场景，原文标注新华社摄影来源",
  },
  {
    key: "museum", category: "文化", title: "厦门市博物馆同行：慢慢看展再聊聊",
    description: "【演示活动】结伴参观厦门市博物馆，先各自按兴趣观看，结束后分享一个印象最深的展品。不要求懂历史，愿意听和交流就好。请提前确认开放时间及预约要求；封面为历史展厅配图，实际参观以当天开放的展览为准。",
    location: "厦门市博物馆主馆入口", capacity: 6, hour: 10, duration: 3,
    tags: ["博物馆", "展览", "文化", "读书"], preferredName: "周同学",
    source: "https://www.xmmuseum.com/zn/yczn/202210/t20221028_2696.htm",
    imageUrl: "https://www.xmmuseum.com/zn/yczn/202210/W020221028443956461117.jpg",
    scene: "厦门市博物馆历史展厅，不代表当前展览安排",
  },
];

const root = fileURLToPath(new URL("../", import.meta.url));
const coverDirectory = path.join(root, "server/uploads/local-demo-covers");

async function downloadCover(activity) {
  const response = await fetch(activity.imageUrl, {
    headers: { "User-Agent": "Mozilla/5.0 CampusMateDemo/1.0", Referer: activity.source },
    signal: AbortSignal.timeout(45000),
  });
  if (!response.ok) throw new Error(`封面下载失败 ${response.status}：${activity.title}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const jpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
  const png = buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if ((!jpeg && !png) || buffer.length < 1000) {
    throw new Error(`返回的不是有效 JPEG/PNG 图片：${activity.title}`);
  }
  const filename = `${activity.key}.${png ? "png" : "jpg"}`;
  await fs.writeFile(path.join(coverDirectory, filename), buffer);
  activity.localPath = `/uploads/local-demo-covers/${filename}`;
  console.log(`封面已下载：${activity.title} (${buffer.length} bytes)`);
}

try {
  // 所有图片下载成功后才写入数据库，避免活动指向不存在的封面。
  await fs.mkdir(coverDirectory, { recursive: true });
  for (const activity of activities) await downloadCover(activity);

  const users = db.prepare(`
    SELECT u.id,u.name,u.contact,group_concat(i.name,' ') AS tags
    FROM users u LEFT JOIN user_interests ui ON ui.user_id=u.id
    LEFT JOIN interests i ON i.id=ui.interest_id
    WHERE u.role='user' GROUP BY u.id ORDER BY u.id
  `).all();
  if (!users.length) throw new Error("没有可用于发布演示活动的普通账号");
  const results = [];
  db.exec("BEGIN IMMEDIATE");
  try {
    const insert = db.prepare(`
      INSERT INTO activities(creator_id,title,description,category,category_id,location,
        starts_at,ends_at,capacity,image,status,contact)
      VALUES(?,?,?,?,?,?,?,?,?,?,'open',?)
    `);
    for (const [index, activity] of activities.entries()) {
      const existing = db.prepare("SELECT id FROM activities WHERE image=?").get(activity.localPath);
      if (existing) {
        results.push({ title: activity.title, id: existing.id, skipped: true });
        continue;
      }
      const category = db.prepare("SELECT id FROM activity_categories WHERE name=? AND enabled=1").get(activity.category);
      if (!category) throw new Error(`分类未启用：${activity.category}`);
      // 优先选择熟悉该主题的现有账号，不自动改写账号兴趣、联系方式和空闲时间。
      const creator = users.find((user) => user.name === activity.preferredName) || [...users].sort((a, b) => {
        const score = (user) => activity.tags.filter((tag) => (user.tags || "").split(" ").includes(tag)).length;
        return score(b) - score(a) || a.id - b.id;
      })[0];
      const date = new Date(Date.now() + 8 * 3600000);
      // 从北京时间三天后开始安排，数据库仍用带 Z 的标准 UTC 时间。
      const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 3 + index,
        activity.hour - 8));
      // 标题写明周末的活动落在北京时间周六或周日。
      if (activity.title.includes("周末")) {
        const weekday = new Date(start.getTime() + 8 * 3600000).getUTCDay();
        if (weekday !== 0 && weekday !== 6) start.setUTCDate(start.getUTCDate() + 6 - weekday);
      }
      const end = new Date(start.getTime() + activity.duration * 3600000);
      const id = Number(insert.run(creator.id, activity.title, activity.description, activity.category, category.id,
        activity.location, start.toISOString(), end.toISOString(), activity.capacity, activity.localPath,
        creator.contact || "").lastInsertRowid);
      replaceInterests(db, "activity", id, activity.tags);
      // 发起者占一个人数名额，与网站发布接口保持一致。
      db.prepare("INSERT INTO applications(activity_id,user_id,status,message) VALUES(?,?,'approved','组织者')")
        .run(id, creator.id);
      results.push({ id, title: activity.title, creator: creator.name, category: activity.category,
        beijingTime: start.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false }) });
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  const credits = [
    "# 国内来源演示活动封面", "",
    "以下为用户确认后导入的8条演示活动。图片仅与主题对应，原始页面中的学校、商家及人物不代表本平台活动的发起者或合作方。",
    "公开复用许可尚未确认；保留来源不等于取得授权。需要公开分发或正式使用时，应取得授权或替换为已授权素材。",
    "图片是示意配图，不把历史展览、报道或照片当作当前真实活动。", "",
    "| 活动 | 本地封面 | 来源网页 | 图片内容说明 |", "| --- | --- | --- | --- |",
    ...activities.map((activity) => `| ${activity.title} | ${activity.localPath} | [原始页面](${activity.source}) | ${activity.scene} |`),
    "", "## 再次执行", "",
    "运行 `node scripts/seed-local-cover-activities.mjs`。脚本按封面路径判断是否已导入，重复执行不会新增重复活动或改变已有活动信息。",
    "导入后运行 `npm run data:export`，将共享快照与封面一起提交。", "",
  ].join("\n");
  await fs.writeFile(path.join(root, "docs/LOCAL-DEMO-COVER-SOURCES.md"), credits, "utf8");
  console.log(JSON.stringify(results, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  db.close();
}
