import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { configuredDatabaseFile, initializeSharedDatabase } from "./data-files.js";

// 默认数据库位于 server/data/campus-mate.db；可用 DATABASE_FILE 环境变量覆盖。
const databaseFile = configuredDatabaseFile();
fs.mkdirSync(path.dirname(path.resolve(databaseFile)), { recursive: true });
initializeSharedDatabase(databaseFile);

export const db = new DatabaseSync(databaseFile);

// WAL 提升读写并发；外键约束用于维护关联数据的一致性。
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

// 联系方式属于用户私密资料，旧数据库启动时自动补充字段。

// 所有表在服务启动时自动创建。给已有项目增加字段时，还要补充数据库迁移。
db.exec(`
  -- 用户账号、公开资料和角色。密码只保存 bcrypt 哈希。
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    avatar TEXT,
    bio TEXT DEFAULT '',
    campus TEXT DEFAULT '星河大学',
    major TEXT DEFAULT '',
    year TEXT DEFAULT '',
    role TEXT DEFAULT 'user',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- 兴趣标签字典，以及用户兴趣的多对多关系。
  CREATE TABLE IF NOT EXISTS interests (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
  );
  CREATE TABLE IF NOT EXISTS user_interests (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    interest_id INTEGER REFERENCES interests(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, interest_id)
  );

  -- 每周空闲时间；weekday 使用 0 到 6 表示周日到周六。
  CREATE TABLE IF NOT EXISTS availability (
    id INTEGER PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    weekday INTEGER NOT NULL,
    period TEXT NOT NULL,
    UNIQUE (user_id, weekday, period)
  );

  -- 活动分类字典。cover 保存未上传活动图片时使用的默认封面路径。
  CREATE TABLE IF NOT EXISTS activity_categories (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    cover TEXT NOT NULL,
    icon TEXT DEFAULT '✦',
    sort_order INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- 活动主体和活动兴趣标签关联表。category 文本字段保留用于兼容旧数据和旧客户端。
  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY,
    creator_id INTEGER REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    category_id INTEGER REFERENCES activity_categories(id),
    location TEXT NOT NULL,
    starts_at TEXT NOT NULL,
    ends_at TEXT,
    capacity INTEGER NOT NULL DEFAULT 6,
    image TEXT,
    status TEXT DEFAULT 'open',
    contact TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS activity_interests (
    activity_id INTEGER REFERENCES activities(id) ON DELETE CASCADE,
    interest_id INTEGER REFERENCES interests(id),
    PRIMARY KEY (activity_id, interest_id)
  );

  -- 报名和审核状态；同一用户对同一活动只能申请一次。
  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY,
    activity_id INTEGER REFERENCES activities(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    message TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (activity_id, user_id)
  );

  -- 用户收藏活动。
  CREATE TABLE IF NOT EXISTS favorites (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    activity_id INTEGER REFERENCES activities(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, activity_id)
  );

  -- 站内通知、用户举报和管理员操作审计记录。
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY,
    reporter_id INTEGER REFERENCES users(id),
    target_type TEXT NOT NULL,
    target_id INTEGER NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS admin_actions (
    id INTEGER PRIMARY KEY,
    admin_id INTEGER REFERENCES users(id),
    action TEXT NOT NULL,
    target_type TEXT,
    target_id INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- 活动互评；同一活动中评价者对同一成员只能评价一次。
  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY,
    activity_id INTEGER REFERENCES activities(id) ON DELETE CASCADE,
    reviewer_id INTEGER REFERENCES users(id),
    reviewee_id INTEGER REFERENCES users(id),
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    comment TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (activity_id, reviewer_id, reviewee_id)
  );

  -- 上传记录保存文件路径和类型；图片本身位于 server/uploads。
  CREATE TABLE IF NOT EXISTS uploads (
    id INTEGER PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    path TEXT NOT NULL,
    mime TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- AI 搭子只保存当前用户自己的对话，activity_id 仅用于记住是在看哪条活动。
  CREATE TABLE IF NOT EXISTS ai_sessions (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_id INTEGER REFERENCES activities(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS ai_messages (
    id INTEGER PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES ai_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- 每个用户一份 AI 角色设定。未保存时使用默认的学习搭子「小强」。
  CREATE TABLE IF NOT EXISTS ai_personas (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role_prompt TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// 举报审核结果与下架理由，给旧数据库补列以兼容现有项目数据。
const reportColumns = db.prepare("PRAGMA table_info(reports)").all();
if (!reportColumns.some((column) => column.name === "decision")) {
  db.exec("ALTER TABLE reports ADD COLUMN decision TEXT DEFAULT ''");
}
if (!reportColumns.some((column) => column.name === "admin_reason")) {
  db.exec("ALTER TABLE reports ADD COLUMN admin_reason TEXT DEFAULT ''");
}
if (!reportColumns.some((column) => column.name === "reviewed_by")) {
  db.exec("ALTER TABLE reports ADD COLUMN reviewed_by INTEGER REFERENCES users(id)");
}
if (!reportColumns.some((column) => column.name === "reviewed_at")) {
  db.exec("ALTER TABLE reports ADD COLUMN reviewed_at TEXT");
}

const userColumns = db.prepare("PRAGMA table_info(users)").all();
if (!userColumns.some((column) => column.name === "contact")) {
  db.exec("ALTER TABLE users ADD COLUMN contact TEXT DEFAULT ''");
}

// 旧数据库没有 category_id；启动时执行轻量迁移，不要求用户删除原数据库。
const activityColumns = db.prepare("PRAGMA table_info(activities)").all();
if (!activityColumns.some((column) => column.name === "category_id")) {
  db.exec("ALTER TABLE activities ADD COLUMN category_id INTEGER REFERENCES activity_categories(id)");
}

// 分类是业务基础字典，即使尚未运行 seed，也保证前端能够获取完整分类和默认封面。
const defaultCategories = [
  ["运动", "/covers/sport.jpg", "🏃", 10],
  ["户外", "/covers/outdoor.jpg", "🌿", 20],
  ["学习", "/covers/study.jpg", "📚", 30],
  ["生活", "/covers/life.jpg", "☕", 40],
  ["社交", "/covers/social.jpg", "✦", 50],
  ["艺术", "/covers/art.jpg", "●", 60],
  ["文化", "/covers/culture.jpg", "🎬", 70],
];
const upsertCategory = db.prepare(`
  INSERT INTO activity_categories(name,cover,icon,sort_order,enabled)
  VALUES(?,?,?,?,1)
  ON CONFLICT(name) DO UPDATE SET
    cover=excluded.cover,
    icon=excluded.icon,
    sort_order=excluded.sort_order
`);
defaultCategories.forEach((category) => upsertCategory.run(...category));
db.exec(`
  UPDATE activities
  SET category_id=(SELECT id FROM activity_categories WHERE name=activities.category)
  WHERE category_id IS NULL
`);

// 创建站内通知，供报名、审核和活动状态变更接口共用。
export function notify(userId, title, body) {
  db.prepare(
    "INSERT INTO notifications(user_id, title, body) VALUES (?, ?, ?)",
  ).run(userId, title, body);
}
