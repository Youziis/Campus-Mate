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
console.log(
  "Seed data ready. Demo accounts: alice@campus.test / mate1234, bo@campus.test / mate1234, admin@campus.test / admin123",
);
