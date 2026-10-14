import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

// 默认数据库位于 server/data/campus-mate.db；可用 DATABASE_FILE 环境变量覆盖。
const databaseFile =
  process.env.DATABASE_FILE || "./server/data/campus-mate.db";
fs.mkdirSync(path.dirname(path.resolve(databaseFile)), { recursive: true });

export const db = new DatabaseSync(databaseFile);

// WAL 提升读写并发；外键约束用于维护关联数据的一致性。
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

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

  -- 活动主体和活动兴趣标签关联表。
  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY,
    creator_id INTEGER REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
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
`);

// 创建站内通知，供报名、审核和活动状态变更接口共用。
export function notify(userId, title, body) {
  db.prepare(
    "INSERT INTO notifications(user_id, title, body) VALUES (?, ?, ?)",
  ).run(userId, title, body);
}
