import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "./db.js";

// 使用 INSERT OR IGNORE 可重复初始化，不覆盖已有账号和资料。
const interests = [
  "羽毛球",
  "徒步",
  "桌游",
  "咖啡",
  "电影",
  "摄影",
  "跑步",
  "编程",
  "音乐",
  "读书",
  "美食",
  "篮球",
];
const add = db.prepare("INSERT OR IGNORE INTO interests(name) VALUES(?)");
interests.forEach((x) => add.run(x));
const create = db.prepare(
  "INSERT OR IGNORE INTO users(email,password,name,bio,campus,major,year,role) VALUES(?,?,?,?,?,?,?,?)",
);

// 本地演示账号；更新密码时也请同步更新 README.md。
for (const u of [
  [
    "admin@campus.test",
    "admin123",
    "校园管理员",
    "一起让校园更友好",
    "星河大学",
    "计算机学院",
    "大四",
    "admin",
  ],
  [
    "alice@campus.test",
    "mate1234",
    "林同学",
    "喜欢运动和周末探索城市",
    "星河大学",
    "设计学院",
    "大二",
    "user",
  ],
  [
    "bo@campus.test",
    "mate1234",
    "陈同学",
    "羽毛球爱好者，欢迎约球",
    "星河大学",
    "信息学院",
    "大三",
    "user",
  ],
  [
    "mei@campus.test",
    "mate1234",
    "周同学",
    "寻找一起自习和喝咖啡的朋友",
    "星河大学",
    "商学院",
    "大一",
    "user",
  ],
])
  create.run(u[0], await bcrypt.hash(u[1], 10), ...u.slice(2));

// 兴趣用于演示个人资料和活动推荐。
const uid = (e) => db.prepare("SELECT id FROM users WHERE email=?").get(e).id;
const iid = (n) =>
  db.prepare("SELECT id FROM interests WHERE name=?").get(n).id;
for (const [e, names] of [
  ["alice@campus.test", ["徒步", "摄影", "咖啡"]],
  ["bo@campus.test", ["羽毛球", "篮球"]],
  ["mei@campus.test", ["咖啡", "读书"]],
])
  for (const n of names)
    db.prepare("INSERT OR IGNORE INTO user_interests VALUES(?,?)").run(
      uid(e),
      iid(n),
    );
const count = db.prepare("SELECT count(*) c FROM activities").get().c;
// 仅在活动表为空时插入示例活动，避免重复运行时产生重复数据。
if (!count) {
  const ins = db.prepare(
    "INSERT INTO activities(creator_id,title,description,category,location,starts_at,ends_at,capacity,image) VALUES(?,?,?,?,?,?,?,?,?)",
  );
  const now = new Date();
  const addHours = (h) => new Date(now.getTime() + h * 3600000).toISOString();
  for (const a of [
    [
      uid("bo@campus.test"),
      "周五晚羽毛球双打",
      "缺两位球友，水平不限，轻松出汗。球拍可借。",
      "运动",
      "体育馆 2 号馆",
      addHours(30),
      addHours(32),
      4,
      null,
    ],
    [
      uid("alice@campus.test"),
      "周末环湖徒步与拍照",
      "走校园后山环湖步道，慢节奏，带上相机一起记录秋色。",
      "户外",
      "南门集合",
      addHours(72),
      addHours(76),
      6,
      null,
    ],
    [
      uid("mei@campus.test"),
      "图书馆期中复习搭子",
      "一起在图书馆专注学习，中间休息喝咖啡。",
      "学习",
      "图书馆三楼",
      addHours(5),
      addHours(8),
      5,
      null,
    ],
    [
      uid("alice@campus.test"),
      "新店探店：手冲咖啡",
      "找两三位同学尝试学校附近新开的咖啡馆。",
      "生活",
      "北门咖啡街",
      addHours(50),
      addHours(52),
      4,
      null,
    ],
  ])
    ins.run(...a);
}

// 生成 50 条可重复使用的推荐演示活动。
// 使用固定标题识别演示数据：首次运行插入，之后运行会刷新时间和内容，避免活动过期或重复累积。
const demoBlueprints = [
  { title: "晨光羽毛球局", category: "运动", location: "体育馆羽毛球场", capacity: 6, hours: [8, 10], interests: ["羽毛球"], description: "轻松热身加双打轮换，新手也可以参加，现场可借备用球拍。" },
  { title: "环湖慢跑计划", category: "运动", location: "东区操场入口", capacity: 8, hours: [18, 20], interests: ["跑步"], description: "按轻松配速完成校园环湖路线，途中互相照应，不追求竞速。" },
  { title: "周末篮球拼场", category: "运动", location: "西区篮球场", capacity: 10, hours: [16, 18], interests: ["篮球"], description: "半场友谊赛，随机分队轮换上场，欢迎不同水平的同学。" },
  { title: "城市街头摄影散步", category: "户外", location: "学校南门集合", capacity: 7, hours: [15, 18], interests: ["摄影", "徒步"], description: "沿老街边走边拍，交流构图和调色，手机与相机都可以。" },
  { title: "后山轻徒步", category: "户外", location: "北门公交站", capacity: 9, hours: [9, 13], interests: ["徒步", "摄影"], description: "选择入门路线慢慢走，途中安排观景和合照，请自备饮用水。" },
  { title: "期末专注自习室", category: "学习", location: "图书馆四楼", capacity: 12, hours: [19, 22], interests: ["读书"], description: "采用五十分钟专注加十分钟休息的节奏，一起完成本周学习目标。" },
  { title: "前端编程结对练习", category: "学习", location: "信息楼共享空间", capacity: 6, hours: [19, 21], interests: ["编程"], description: "围绕一个小页面结对编程，互相讲解思路，适合有基础的同学。" },
  { title: "校园读书交换会", category: "文化", location: "大学生活动中心", capacity: 10, hours: [14, 16], interests: ["读书"], description: "带一本愿意分享的书，介绍推荐理由并和同学交换阅读。" },
  { title: "露天电影夜", category: "文化", location: "中心草坪", capacity: 20, hours: [19, 22], interests: ["电影"], description: "一起观看轻松的经典电影，映后可以留下交流喜欢的片段。" },
  { title: "手冲咖啡体验", category: "生活", location: "北门咖啡实验室", capacity: 6, hours: [14, 16], interests: ["咖啡", "美食"], description: "认识不同产区豆子的风味，并在指导下完成一杯自己的手冲咖啡。" },
];
const demoLabels = ["春日场", "进阶场", "新友场", "周末场", "限定场"];
const demoCreators = [uid("bo@campus.test"), uid("mei@campus.test"), uid("admin@campus.test")];
const findDemo = db.prepare("SELECT id FROM activities WHERE title=? ORDER BY id LIMIT 1");
const insertDemo = db.prepare("INSERT INTO activities(creator_id,title,description,category,location,starts_at,ends_at,capacity,image,status,contact) VALUES(?,?,?,?,?,?,?,?,?,'open',?)");
const updateDemo = db.prepare("UPDATE activities SET creator_id=?,description=?,category=?,location=?,starts_at=?,ends_at=?,capacity=?,image=NULL,status='open',contact=? WHERE id=?");
const linkInterest = db.prepare("INSERT OR IGNORE INTO activity_interests(activity_id,interest_id) VALUES(?,?)");
const clearActivityInterests = db.prepare("DELETE FROM activity_interests WHERE activity_id=?");
const seedNow = new Date();

db.exec("BEGIN");
try {
  // 旧版 50 条无封面推荐活动已停用，保留蓝图仅方便查看历史数据结构。
  if (false) demoBlueprints.forEach((blueprint, blueprintIndex) => {
    demoLabels.forEach((label, labelIndex) => {
      const sequence = blueprintIndex * demoLabels.length + labelIndex;
      const title = `${blueprint.title} · ${label}`;
      const dayOffset = 1 + (sequence % 25);
      const start = new Date(seedNow);
      start.setDate(seedNow.getDate() + dayOffset);
      start.setHours(blueprint.hours[0], labelIndex * 10, 0, 0);
      const end = new Date(start);
      end.setHours(blueprint.hours[1]);
      const creatorId = demoCreators[sequence % demoCreators.length];
      const description = `${blueprint.description} 本场为第 ${labelIndex + 1} 组演示活动。`;
      const contact = `campus-demo-${String(sequence + 1).padStart(2, "0")}`;
      const existing = findDemo.get(title);
      let activityId;

      if (existing) {
        updateDemo.run(creatorId, description, blueprint.category, blueprint.location, start.toISOString(), end.toISOString(), blueprint.capacity + (labelIndex % 3), contact, existing.id);
        activityId = existing.id;
      } else {
        activityId = Number(insertDemo.run(creatorId, title, description, blueprint.category, blueprint.location, start.toISOString(), end.toISOString(), blueprint.capacity + (labelIndex % 3), null, contact).lastInsertRowid);
      }

      clearActivityInterests.run(activityId);
      blueprint.interests.forEach((interest) => linkInterest.run(activityId, iid(interest)));
    });
  });
  db.exec("COMMIT");
} catch (error) {
  db.exec("ROLLBACK");
  throw error;
}

// 为旧活动和本次插入的演示活动补齐分类外键。
db.exec(`
  UPDATE activities
  SET category_id=(SELECT id FROM activity_categories WHERE name=activities.category)
  WHERE category_id IS NULL
`);

// Additional demo users and image based activities are seeded below.
const extraUsers = [
  ["chenxi@campus.test", "晨曦同学", "喜欢晨跑、游泳和用相机记录校园生活。", "体育教育", "大二", ["跑步", "摄影", "游泳"]],
  ["linan@campus.test", "林安同学", "周末喜欢去海边看日出，也愿意认识新的旅行搭子。", "环境设计", "大三", ["旅行", "摄影", "户外"]],
  ["yueyue@campus.test", "悦悦同学", "猫咪爱好者，想和同学一起探店、撸猫和分享好吃的。", "市场营销", "大一", ["猫咖", "美食", "摄影"]],
  ["shiyu@campus.test", "诗雨同学", "喜欢安静学习，也会在周末参加轻松的球类活动。", "软件工程", "大二", ["学习", "羽毛球", "读书"]],
  ["haoran@campus.test", "浩然同学", "喜欢网球和户外运动，寻找固定运动伙伴。", "机械工程", "大三", ["网球", "运动", "晨跑"]],
  ["qinghe@campus.test", "清禾同学", "喜欢在城市和校园里散步，记录日常的小确幸。", "新闻传播", "大一", ["散步", "摄影", "旅行"]],
];
const extraCreate = db.prepare("INSERT OR IGNORE INTO users(email,password,name,bio,campus,major,year,role) VALUES(?,?,?,?,?,?,?,?)");
const extraUserIds = {};
for (const [email, name, bio, major, year, tags] of extraUsers) {
  extraCreate.run(email, await bcrypt.hash("12345678", 10), name, bio, "厦门大学附属校园", major, year, "user");
  const id = uid(email);
  extraUserIds[email] = id;
  for (const tag of tags) {
    db.prepare("INSERT OR IGNORE INTO interests(name) VALUES(?)").run(tag);
    db.prepare("INSERT OR IGNORE INTO user_interests(user_id,interest_id) VALUES(?,?)").run(id, iid(tag));
  }
}
const extraAvailability = db.prepare("INSERT OR IGNORE INTO availability(user_id,weekday,period) VALUES(?,?,?)");
Object.values(extraUserIds).forEach((id, index) => {
  extraAvailability.run(id, (index + 1) % 7, index % 2 ? "19:00-21:00" : "5-6");
  extraAvailability.run(id, (index + 3) % 7, index % 2 ? "21:00-23:00" : "7-8");
});
const imageActivities = [
  ["chenxi@campus.test", "清晨一起去五缘湾跑步", "沿着五缘湾海边慢跑，节奏轻松，欢迎想养成晨跑习惯的同学。", "运动", "五缘湾海堤入口", "五缘湾-晨跑.jpg", ["跑步", "户外"]],
  ["chenxi@campus.test", "体育馆夜间游泳搭子", "晚间一起去体育馆游泳，按自己的节奏练习，结束后交流训练心得。", "运动", "体育馆游泳馆", "体育馆游泳1.jpg", ["游泳", "运动"]],
  ["linan@campus.test", "黄厝海岸看日出", "周末早起去黄厝海岸看日出，拍照、散步，给忙碌的学习生活留一点浪漫。", "户外", "黄厝海岸集合点", "黄厝海岸-看日出.jpg", ["旅行", "摄影"]],
  ["linan@campus.test", "鼓浪屿猫咖半日游", "一起坐船去鼓浪屿逛逛，在猫咖休息聊天，适合喜欢慢旅行的同学。", "生活", "鼓浪屿三丘田码头", "鼓浪屿-猫咖1.jpg", ["旅行", "猫咖"]],
  ["yueyue@campus.test", "周末狗咖放松局", "寻找喜欢小动物的同学，一起去狗咖吸狗、聊天，给自己安排一个治愈下午。", "生活", "校外狗咖集合", "狗咖.jpg", ["美食", "户外"]],
  ["yueyue@campus.test", "猫咖探店分享会", "打卡两家不同风格的猫咖，拍照并分享店里的猫咪故事。", "生活", "岛内猫咖集合", "猫咖2.jpg", ["猫咖", "摄影"]],
  ["shiyu@campus.test", "图书馆安静自习局", "找几位同学一起完成本周学习计划，中途可以短暂休息但不打扰彼此。", "学习", "图书馆三楼", "study1.jpg", ["学习", "读书"]],
  ["shiyu@campus.test", "期中复习资料交换", "带上自己的复习笔记和资料，一起整理重点、互相补充知识盲区。", "学习", "教学楼共享空间", "study2.jpg", ["学习", "读书"]],
  ["haoran@campus.test", "体育馆网球新手练习", "从基础挥拍和对拉开始，欢迎新手，现场可以互相借用球拍。", "运动", "体育馆网球场", "体育馆网球1.jpg", ["网球", "运动"]],
  ["haoran@campus.test", "周末羽毛球双打约球", "约固定搭子练习双打配合，强度适中，欢迎不同水平的同学加入。", "运动", "体育馆羽毛球场", "体育馆羽毛球1.jpg", ["羽毛球", "运动"]],
  ["qinghe@campus.test", "校园宿舍附近晨跑", "从宿舍附近出发慢跑三公里，不追求速度，主要是一起坚持。", "运动", "宿舍区北门", "学校宿舍附近-晨跑.jpg", ["晨跑", "运动"]],
  ["qinghe@campus.test", "猫咖街区摄影记录", "沿着猫咖街区散步，用手机记录店铺、街景和路上遇见的猫咪。", "文化", "猫咖街区入口", "猫咖3.jpg", ["摄影", "散步"]],
];
const extraFind = db.prepare("SELECT id FROM activities WHERE title=? LIMIT 1");
const extraInsert = db.prepare("INSERT INTO activities(creator_id,title,description,category,location,starts_at,ends_at,capacity,image,status,contact) VALUES(?,?,?,?,?,?,?,?,?,'open',?)");
const extraLink = db.prepare("INSERT OR IGNORE INTO activity_interests(activity_id,interest_id) VALUES(?,?)");
const extraStart = new Date();
imageActivities.forEach(([email, title, description, category, location, image, tags], index) => {
  const start = new Date(extraStart);
  start.setDate(start.getDate() + 2 + index);
  start.setHours(index % 2 ? 19 : 16, 0, 0, 0);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const existing = extraFind.get(title);
  const activityId = existing ? existing.id : Number(extraInsert.run(extraUserIds[email], title, description, category, location, start.toISOString(), end.toISOString(), 6 + (index % 3), `/uploads/${image}`, `demo-${email}-${index}`).lastInsertRowid);
  if (existing) db.prepare("UPDATE activities SET image=?,description=?,starts_at=?,ends_at=?,status='open' WHERE id=?").run(`/uploads/${image}`, description, start.toISOString(), end.toISOString(), activityId);
  db.prepare("DELETE FROM activity_interests WHERE activity_id=?").run(activityId);
  tags.forEach((tag) => { db.prepare("INSERT OR IGNORE INTO interests(name) VALUES(?)").run(tag); extraLink.run(activityId, iid(tag)); });
});

console.log(
  "Seed data ready with image-based demo activities. Demo accounts: alice@campus.test / mate1234, bo@campus.test / mate1234, admin@campus.test / admin123",
);
