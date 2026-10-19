import "dotenv/config";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { db, notify } from "./db.js";
import { registerAi } from "./ai.js";
import { normalizeInterests, replaceInterests } from "./interests.js";
const app = express(),
  secret = process.env.JWT_SECRET || "campus-mate-local-demo-secret-change-me";

// 全局中间件：开放本地跨域请求、解析 JSON，并静态提供上传的图片。
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(path.resolve("server/uploads")));
const auth = (req, res, next) => {
  try {
    req.user = jwt.verify(
      (req.headers.authorization || "").replace(/^Bearer /, ""),
      secret,
    );
    next();
  } catch {
    return res.status(401).json({ error: "请先登录" });
  }
};
// 管理员路由先经过 auth 验证 JWT，再检查用户角色。
const admin = (req, res, next) =>
  req.user.role === "admin"
    ? next()
    : res.status(403).json({ error: "需要管理员权限" });
const token = (u) =>
  jwt.sign({ id: u.id, email: u.email, name: u.name, role: u.role }, secret, {
    expiresIn: "7d",
  });
const userSafe = (u) => {
  if (!u) return null;
  const { password, ...x } = u;
  return x;
};

// 活动的统一查询格式：附加组织者、成员数、兴趣及当前查看者的状态。
function activity(id, viewer) {
  const a = db
    .prepare(
      `SELECT a.*,COALESCE(c.name,a.category) category,c.cover category_cover,c.icon category_icon,u.name creator_name,u.avatar creator_avatar,(SELECT count(*) FROM applications x WHERE x.activity_id=a.id AND x.status='approved') member_count,(SELECT count(*) FROM applications x WHERE x.activity_id=a.id AND x.status='pending') pending_count,EXISTS(SELECT 1 FROM favorites f WHERE f.activity_id=a.id AND f.user_id=?) is_favorite,(SELECT x.status FROM applications x WHERE x.activity_id=a.id AND x.user_id=? ORDER BY x.created_at DESC LIMIT 1) application_status FROM activities a LEFT JOIN activity_categories c ON c.id=a.category_id JOIN users u ON u.id=a.creator_id WHERE a.id=?`,
    )
    .get(viewer || 0, viewer || 0, id);
  if (a) {
    a.interests = db
      .prepare(
        "SELECT i.name FROM interests i JOIN activity_interests ai ON ai.interest_id=i.id WHERE ai.activity_id=?",
      )
      .all(id)
      .map((x) => x.name);
    a.is_favorite = !!a.is_favorite;
    a.is_member = !!db
      .prepare(
        "SELECT 1 FROM applications WHERE activity_id=? AND user_id=? AND status='approved'",
      )
      .get(id, viewer || 0);
    if (a.is_member || a.creator_id === viewer) {
      a.creator_contact = db.prepare("SELECT contact FROM users WHERE id=?").get(a.creator_id)?.contact || "";
    }
  }
  return a;
}

// 健康检查和账号认证。注册密码会哈希保存；登录后签发 7 天 JWT。
app.get("/api/health", (_, res) =>
  res.json({ ok: true, service: "Campus Mate API" }),
);
app.post("/api/auth/register", async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || password.length < 8 || !name)
    return res.status(400).json({ error: "请填写姓名、邮箱和至少 8 位密码" });
  try {
    const r = db
      .prepare("INSERT INTO users(email,password,name) VALUES(?,?,?)")
      .run(email.toLowerCase(), await bcrypt.hash(password, 10), name);
    const u = db
      .prepare("SELECT * FROM users WHERE id=?")
      .get(r.lastInsertRowid);
    res.status(201).json({ token: token(u), user: userSafe(u) });
  } catch {
    res.status(409).json({ error: "邮箱已注册" });
  }
});
app.post("/api/auth/login", async (req, res) => {
  const u = db
    .prepare("SELECT * FROM users WHERE email=?")
    .get((req.body.email || "").toLowerCase());
  if (!u || !(await bcrypt.compare(req.body.password || "", u.password)))
    return res.status(401).json({ error: "邮箱或密码不正确" });
  res.json({ token: token(u), user: userSafe(u) });
});
app.get("/api/auth/me", auth, (req, res) =>
  res.json(
    userSafe(db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id)),
  ),
);
app.get("/api/interests", (_, res) =>
  res.json(db.prepare("SELECT * FROM interests ORDER BY name").all()),
);
app.get("/api/categories", (_, res) =>
  res.json(
    db
      .prepare("SELECT id,name,cover,icon,sort_order FROM activity_categories WHERE enabled=1 ORDER BY sort_order,id")
      .all(),
  ),
);

// 用户资料：需要登录后才能查看；PATCH 只修改当前登录用户自己的资料。
app.get("/api/users/:id", auth, (req, res) => {
  const u = userSafe(
    db
      .prepare(
        "SELECT id,name,avatar,bio,campus,major,year,created_at FROM users WHERE id=?",
      )
      .get(req.params.id),
  );
  if (!u) return res.sendStatus(404);
  if (Number(req.params.id) === req.user.id) {
    u.contact = db.prepare("SELECT contact FROM users WHERE id=?").get(req.user.id)?.contact || "";
  }
  u.interests = db
    .prepare(
      "SELECT i.name FROM interests i JOIN user_interests x ON x.interest_id=i.id WHERE x.user_id=?",
    )
    .all(req.params.id)
    .map((x) => x.name);
  u.review_count = db
    .prepare("SELECT count(*) n FROM reviews WHERE reviewee_id=?")
    .get(req.params.id).n;
  res.json(u);
});
app.patch("/api/users/me", auth, (req, res) => {
  const tags = req.body.interests === undefined ? null : normalizeInterests(req.body.interests);
  const fields = ["name", "bio", "campus", "major", "year", "avatar", "contact"];
  const updates = fields.filter((k) => req.body[k] !== undefined);
  if (updates.length)
    db.prepare(
      `UPDATE users SET ${updates.map((k) => `${k}=?`).join(",")} WHERE id=?`,
    ).run(...updates.map((k) => req.body[k]), req.user.id);
  if (tags !== null) replaceInterests(db, "user", req.user.id, tags);
  if (Array.isArray(req.body.availability)) {
    db.prepare("DELETE FROM availability WHERE user_id=?").run(req.user.id);
    const q = db.prepare(
      "INSERT INTO availability(user_id,weekday,period) VALUES(?,?,?)",
    );
    req.body.availability.forEach((x) =>
      q.run(req.user.id, x.weekday, x.period),
    );
  }
  res.json(
    userSafe(db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id)),
  );
});
app.get("/api/users/me/availability", auth, (req, res) =>
  res.json(
    db
      .prepare(
        "SELECT weekday,period FROM availability WHERE user_id=? ORDER BY weekday,period",
      )
      .all(req.user.id),
  ),
);
app.get("/api/users/me/stats", auth, (req, res) => {
  const id = req.user.id;
  res.json({
    published: db
      .prepare("SELECT count(*) n FROM activities WHERE creator_id=?")
      .get(id).n,
    joined: db
      .prepare(
        "SELECT count(*) n FROM applications WHERE user_id=? AND status='approved'",
      )
      .get(id).n,
    hostedMembers: db
      .prepare(
        "SELECT count(*) n FROM applications x JOIN activities a ON a.id=x.activity_id WHERE a.creator_id=? AND x.status='approved'",
      )
      .get(id).n,
    reviews: db
      .prepare("SELECT count(*) n FROM reviews WHERE reviewee_id=?")
      .get(id).n,
    favorites: db
      .prepare("SELECT count(*) n FROM favorites WHERE user_id=?")
      .get(id).n,
    averageRating:
      db
        .prepare(
          "SELECT round(avg(rating),1) n FROM reviews WHERE reviewee_id=?",
        )
        .get(id).n || 0,
  });
});

// 活动发现、详情、创建和修改。只有创建者或管理员能编辑、取消活动。
app.get("/api/activities", (req, res) => {
  const { q, category, date, interest, sort = "soon" } = req.query;
  let sql = `SELECT a.id FROM activities a WHERE a.status='open'`;
  const args = [];
  if (q) {
    sql += " AND (a.title LIKE ? OR a.description LIKE ? OR a.location LIKE ?)";
    args.push(...Array(3).fill(`%${q}%`));
  }
  if (category && category !== "全部") {
    sql += " AND a.category=?";
    args.push(category);
  }
  if (date) {
    sql += " AND date(a.starts_at)=date(?)";
    args.push(date);
  }
  if (interest) {
    sql +=
      " AND EXISTS(SELECT 1 FROM activity_interests ai JOIN interests i ON i.id=ai.interest_id WHERE ai.activity_id=a.id AND i.name=?)";
    args.push(interest);
  }
  sql +=
    sort === "popular"
      ? ' ORDER BY (SELECT count(*) FROM applications x WHERE x.activity_id=a.id AND x.status="approved") DESC'
      : " ORDER BY a.starts_at ASC";
  res.json(
    db
      .prepare(sql)
      .all(...args)
      .map((x) => activity(x.id, req.user?.id)),
  );
});
app.get("/api/activities/:id", auth, (req, res) => {
  const a = activity(req.params.id, req.user?.id);
  a ? res.json(a) : res.sendStatus(404);
});
app.post("/api/activities", auth, (req, res) => {
  const tags = normalizeInterests(req.body.interests ?? []);
  const {
    title,
    description,
    category,
    location,
    starts_at,
    ends_at,
    capacity,
    interests = [],
  } = req.body;
  if (
    !title ||
    !description ||
    !category ||
    !location ||
    !starts_at ||
    new Date(starts_at) <= new Date()
  )
    return res.status(400).json({ error: "请填写完整信息并选择未来时间" });
  const categoryRecord = db
    .prepare("SELECT id,name FROM activity_categories WHERE name=? AND enabled=1")
    .get(category);
  if (!categoryRecord)
    return res.status(400).json({ error: "活动种类不存在或已停用" });
  const r = db
    .prepare(
      "INSERT INTO activities(creator_id,title,description,category,category_id,location,starts_at,ends_at,capacity,image) VALUES(?,?,?,?,?,?,?,?,?,?)",
    )
    .run(
      req.user.id,
      title,
      description,
      categoryRecord.name,
      categoryRecord.id,
      location,
      starts_at,
      ends_at || null,
      Math.max(2, Number(capacity) || 6),
      req.body.image || null,
    );
  replaceInterests(db, "activity", r.lastInsertRowid, tags);
  db.prepare(
    "INSERT INTO applications(activity_id,user_id,status,message) VALUES(?,?,'approved','组织者')",
  ).run(r.lastInsertRowid, req.user.id);
  res.status(201).json(activity(r.lastInsertRowid, req.user.id));
});
app.patch("/api/activities/:id", auth, (req, res) => {
  const a = db
    .prepare("SELECT * FROM activities WHERE id=?")
    .get(req.params.id);
  if (!a) return res.sendStatus(404);
  if (a.creator_id !== req.user.id && req.user.role !== "admin")
    return res.sendStatus(403);
  const tags = req.body.interests === undefined ? null : normalizeInterests(req.body.interests);
  const keys = [
    "title",
    "description",
    "location",
    "starts_at",
    "ends_at",
    "capacity",
    "image",
    "status",
  ];
  const set = keys.filter((k) => req.body[k] !== undefined);
  if (req.body.category !== undefined) {
    const categoryRecord = db
      .prepare("SELECT id,name FROM activity_categories WHERE name=? AND enabled=1")
      .get(req.body.category);
    if (!categoryRecord)
      return res.status(400).json({ error: "活动种类不存在或已停用" });
    db.prepare("UPDATE activities SET category=?,category_id=? WHERE id=?").run(
      categoryRecord.name,
      categoryRecord.id,
      a.id,
    );
  }
  if (set.length)
    db.prepare(
      `UPDATE activities SET ${set.map((k) => `${k}=?`).join(",")} WHERE id=?`,
    ).run(...set.map((k) => req.body[k]), a.id);
  if (tags !== null) replaceInterests(db, "activity", a.id, tags);
  res.json(activity(a.id, req.user.id));
});
app.delete("/api/activities/:id", auth, (req, res) => {
  const a = db
    .prepare("SELECT * FROM activities WHERE id=?")
    .get(req.params.id);
  if (!a) return res.sendStatus(404);
  if (a.creator_id !== req.user.id && req.user.role !== "admin")
    return res.sendStatus(403);
  db.prepare('UPDATE activities SET status="cancelled" WHERE id=?').run(a.id);
  db.prepare(
    'SELECT user_id FROM applications WHERE activity_id=? AND status="approved"',
  )
    .all(a.id)
    .forEach((x) => notify(x.user_id, "活动已取消", a.title));
  res.json({ ok: true });
});

// 报名和审核：检查重复申请、名额，并给相关用户发送站内通知。
app.post("/api/activities/:id/applications", auth, (req, res) => {
  const a = db
    .prepare("SELECT * FROM activities WHERE id=?")
    .get(req.params.id);
  if (!a || a.status !== "open")
    return res.status(404).json({ error: "活动不存在或已关闭" });
  if (a.creator_id === req.user.id)
    return res.status(400).json({ error: "不能报名自己的活动" });
  const count = db
    .prepare(
      "SELECT count(*) n FROM applications WHERE activity_id=? AND status='approved'",
    )
    .get(a.id).n;
  if (count >= a.capacity)
    return res.status(409).json({ error: "活动名额已满" });
  try {
    db.prepare(
      "INSERT INTO applications(activity_id,user_id,message) VALUES(?,?,?)",
    ).run(a.id, req.user.id, req.body.message || "");
    notify(
      a.creator_id,
      "收到新的报名",
      `${req.user.name} 报名了「${a.title}」`,
    );
    res.status(201).json({ ok: true, status: "pending" });
  } catch {
    res.status(409).json({ error: "你已经报名过" });
  }
});
app.get("/api/activities/:id/applications", auth, (req, res) => {
  const a = db
    .prepare("SELECT * FROM activities WHERE id=?")
    .get(req.params.id);
  if (!a) return res.sendStatus(404);
  if (a.creator_id !== req.user.id && req.user.role !== "admin")
    return res.sendStatus(403);
  res.json(
    db
      .prepare(
        "SELECT x.*,u.name,u.avatar,u.major,u.year,u.contact FROM applications x JOIN users u ON u.id=x.user_id JOIN activities a ON a.id=x.activity_id WHERE x.activity_id=? AND x.user_id<>a.creator_id ORDER BY x.created_at DESC",
      )
      .all(a.id),
  );
});
app.patch("/api/applications/:id", auth, (req, res) => {
  const x = db
    .prepare(
      "SELECT x.*,a.creator_id,a.title,a.capacity FROM applications x JOIN activities a ON a.id=x.activity_id WHERE x.id=?",
    )
    .get(req.params.id);
  if (!x) return res.sendStatus(404);
  if (x.creator_id !== req.user.id && req.user.role !== "admin")
    return res.sendStatus(403);
  if (!["approved", "rejected"].includes(req.body.status))
    return res.status(400).json({ error: "状态无效" });
  if (
    req.body.status === "approved" &&
    db
      .prepare(
        "SELECT count(*) n FROM applications WHERE activity_id=? AND status='approved'",
      )
      .get(x.activity_id).n >= x.capacity
  )
    return res.status(409).json({ error: "名额已满" });
  db.prepare("UPDATE applications SET status=? WHERE id=?").run(
    req.body.status,
    x.id,
  );
  notify(
    x.user_id,
    req.body.status === "approved" ? "报名已通过" : "报名未通过",
    `你申请参加的「${x.title}」审核结果已更新`,
  );
  res.json({ ok: true });
});
app.delete("/api/activities/:id/applications/me", auth, (req, res) => {
  const x = db
    .prepare("SELECT * FROM applications WHERE activity_id=? AND user_id=?")
    .get(req.params.id, req.user.id);
  if (!x) return res.sendStatus(404);
  if (
    x.status === "approved" &&
    db
      .prepare("SELECT creator_id FROM activities WHERE id=?")
      .get(req.params.id).creator_id === req.user.id
  )
    return res.status(400).json({ error: "组织者不能退出活动" });
  db.prepare("DELETE FROM applications WHERE id=?").run(x.id);
  res.json({ ok: true });
});
app.get("/api/users/me/activities", auth, (req, res) =>
  res.json(
    db
      .prepare(
        "SELECT id FROM activities WHERE creator_id=? ORDER BY created_at DESC",
      )
      .all(req.user.id)
      .map((x) => activity(x.id, req.user.id)),
  ),
);
app.get("/api/users/me/applications", auth, (req, res) =>
  res.json(
    db
      .prepare(
        "SELECT a.id,a.creator_id,a.title,a.starts_at,a.location,x.status,x.id application_id FROM applications x JOIN activities a ON a.id=x.activity_id WHERE x.user_id=? AND a.creator_id<>? ORDER BY a.starts_at",
      )
      .all(req.user.id, req.user.id)
      .map((row) => {
        const details = activity(row.id, req.user.id);
        return { ...details, ...row, activity_status: details.status };
      }),
  ),
);
app.get("/api/favorites", auth, (req, res) =>
  res.json(
    db
      .prepare(
        "SELECT activity_id id FROM favorites WHERE user_id=? ORDER BY created_at DESC",
      )
      .all(req.user.id)
      .map((x) => activity(x.id, req.user.id)),
  ),
);
app.post("/api/activities/:id/favorite", auth, (req, res) => {
  const exists = db
    .prepare("SELECT 1 FROM favorites WHERE user_id=? AND activity_id=?")
    .get(req.user.id, req.params.id);
  exists
    ? db
        .prepare("DELETE FROM favorites WHERE user_id=? AND activity_id=?")
        .run(req.user.id, req.params.id)
    : db
        .prepare("INSERT INTO favorites(user_id,activity_id) VALUES(?,?)")
        .run(req.user.id, req.params.id);
  res.json({ favorite: !exists });
});

// 联系信息只向活动创建者和审核通过的成员开放。
app.get("/api/activities/:id/contact", auth, (req, res) => {
  const a = db
    .prepare("SELECT creator_id,status FROM activities WHERE id=?")
    .get(req.params.id);
  if (!a) return res.sendStatus(404);
  const member = db
    .prepare(
      "SELECT 1 FROM applications WHERE activity_id=? AND user_id=? AND status='approved'",
    )
    .get(req.params.id, req.user.id);
  if (a.creator_id !== req.user.id && !member)
    return res
      .status(403)
      .json({ error: "仅活动组织者和已通过成员可查看联系信息" });
  res.json({
    organizer: db
      .prepare("SELECT id,name,avatar,major,year,contact FROM users WHERE id=?")
      .get(a.creator_id),
    members: db
      .prepare(
        "SELECT u.id,u.name,u.avatar,u.major,u.contact,x.status FROM applications x JOIN users u ON u.id=x.user_id JOIN activities a ON a.id=x.activity_id WHERE x.activity_id=? AND x.status='approved' AND x.user_id<>a.creator_id",
      )
      .all(req.params.id),
  });
});

// 评价只能在活动开始后由已通过的活动成员互相提交。
app.post("/api/activities/:id/reviews", auth, (req, res) => {
  const a = db
    .prepare("SELECT * FROM activities WHERE id=?")
    .get(req.params.id);
  if (!a || new Date(a.starts_at) > new Date())
    return res.status(400).json({ error: "活动结束后才能评价" });
  const peer = Number(req.body.reviewee_id);
  const allowed =
    db
      .prepare(
        "SELECT 1 FROM applications WHERE activity_id=? AND user_id=? AND status='approved'",
      )
      .get(a.id, req.user.id) &&
    db
      .prepare(
        "SELECT 1 FROM applications WHERE activity_id=? AND user_id=? AND status='approved'",
      )
      .get(a.id, peer);
  if (!allowed || peer === req.user.id)
    return res.status(403).json({ error: "仅活动成员可以互相评价" });
  try {
    db.prepare(
      "INSERT INTO reviews(activity_id,reviewer_id,reviewee_id,rating,comment) VALUES(?,?,?,?,?)",
    ).run(
      a.id,
      req.user.id,
      peer,
      Math.min(5, Math.max(1, Number(req.body.rating))),
      req.body.comment || "",
    );
    res.status(201).json({ ok: true });
  } catch {
    res.status(409).json({ error: "已经评价过该成员" });
  }
});
app.get("/api/users/:id/reviews", auth, (req, res) =>
  res.json(
    db
      .prepare(
        "SELECT r.*,u.name reviewer_name FROM reviews r JOIN users u ON u.id=r.reviewer_id WHERE r.reviewee_id=? ORDER BY r.created_at DESC",
      )
      .all(req.params.id),
  ),
);

// 个性化推荐综合用户兴趣和填写的每周空闲时间。
app.get("/api/recommendations", auth, (req, res) => {
  const mode = req.query.mode === "try" ? "try" : "same";
  const names = db
    .prepare(
      "SELECT i.name FROM user_interests x JOIN interests i ON i.id=x.interest_id WHERE x.user_id=?",
    )
    .all(req.user.id)
    .map((x) => x.name);
  const days = db
    .prepare("SELECT weekday,period FROM availability WHERE user_id=?")
    .all(req.user.id);
  const ownNames = new Set(names);
  const ownDays = new Set(days.map((item) => `${item.weekday}:${item.period}`));
  const rows = db
    .prepare("SELECT id FROM activities WHERE status='open' AND creator_id<>? AND datetime(starts_at)>datetime('now') ORDER BY starts_at")
    .all(req.user.id)
    .map(({ id }) => activity(id, req.user.id))
    .map((item) => {
      const itemNames = new Set(item.interests || []);
      const sharedInterests = [...itemNames].filter((name) => ownNames.has(name)).length;
      const start = new Date(item.starts_at);
      const weekday = start.getDay();
      const hour = start.getHours() + start.getMinutes() / 60;
      const period = hour >= 8.2 && hour < 9.95 ? "1-2"
        : hour >= 10.25 && hour < 11.84 ? "3-4"
          : hour >= 14.33 && hour < 15.92 ? "5-6"
            : hour >= 16.25 && hour < 17.84 ? "7-8"
              : hour >= 19 && hour < 21 ? "19:00-21:00"
                : hour >= 21 && hour < 23 ? "21:00-23:00" : null;
      const matchedAvailability = period ? ownDays.has(`${weekday}:${period}`) : false;
      const score = mode === "same"
        ? sharedInterests * 5 + (matchedAvailability ? 4 : 0)
        : (sharedInterests === 0 ? 5 : Math.max(0, 4 - sharedInterests)) + (!ownNames.has(item.category) ? 2 : 0) + (matchedAvailability ? 1 : 0);
      return { ...item, recommendationScore: score, sharedInterests, matchedAvailability, matchMode: mode };
    })
    .filter((item) => mode === "try" || item.recommendationScore > 0)
    .sort((a, b) => b.recommendationScore - a.recommendationScore || new Date(a.starts_at) - new Date(b.starts_at));
  res.json(rows);
});

// 通知接口始终按当前用户过滤，避免访问或修改其他人的通知。
app.get("/api/notifications", auth, (req, res) =>
  res.json(
    db
      .prepare(
        "SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 100",
      )
      .all(req.user.id),
  ),
);
app.patch("/api/notifications/:id/read", auth, (req, res) => {
  db.prepare("UPDATE notifications SET read=1 WHERE id=? AND user_id=?").run(
    req.params.id,
    req.user.id,
  );
  res.json({ ok: true });
});
app.post("/api/notifications/read-all", auth, (req, res) => {
  db.prepare("UPDATE notifications SET read=1 WHERE user_id=?").run(
    req.user.id,
  );
  res.json({ ok: true });
});

// 举报及管理员后台接口。管理员操作会记录到 admin_actions 审计表。
app.post("/api/reports", auth, (req, res) => {
  const { target_type, target_id, reason } = req.body;
  if (!target_type || !target_id || !reason)
    return res.status(400).json({ error: "请填写举报原因" });
  db.prepare(
    "INSERT INTO reports(reporter_id,target_type,target_id,reason) VALUES(?,?,?,?)",
  ).run(req.user.id, target_type, target_id, reason);
  res.status(201).json({ ok: true });
});
app.get("/api/admin/reports", auth, admin, (_, res) =>
  res.json(
    db
      .prepare(
        "SELECT r.*,u.name reporter_name FROM reports r JOIN users u ON u.id=r.reporter_id ORDER BY r.created_at DESC",
      )
      .all(),
  ),
);
app.patch("/api/admin/reports/:id", auth, admin, (req, res) => {
  db.prepare("UPDATE reports SET status=? WHERE id=?").run(
    req.body.status === "resolved" ? "resolved" : "dismissed",
    req.params.id,
  );
  db.prepare(
    "INSERT INTO admin_actions(admin_id,action,target_type,target_id) VALUES(?,?,?,?)",
  ).run(req.user.id, "处理举报", "report", req.params.id);
  res.json({ ok: true });
});
app.get("/api/admin/activities", auth, admin, (_, res) =>
  res.json(
    db
      .prepare("SELECT id FROM activities ORDER BY created_at DESC")
      .all()
      .map((x) => activity(x.id)),
  ),
);
app.delete("/api/admin/activities/:id", auth, admin, (req, res) => {
  db.prepare('UPDATE activities SET status="removed" WHERE id=?').run(
    req.params.id,
  );
  db.prepare(
    "INSERT INTO admin_actions(admin_id,action,target_type,target_id) VALUES(?,?,?,?)",
  ).run(req.user.id, "下架活动", "activity", req.params.id);
  res.json({ ok: true });
});
const uploadDir = path.resolve("server/uploads");
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_, f, cb) =>
      cb(
        null,
        `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(f.originalname).toLowerCase()}`,
      ),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, f, cb) =>
    cb(null, ["image/jpeg", "image/png", "image/webp"].includes(f.mimetype)),
});
app.post("/api/uploads", auth, upload.single("image"), (req, res) => {
  if (!req.file)
    return res
      .status(400)
      .json({ error: "请选择 JPG、PNG 或 WebP 图片（最大 5MB）" });
  const url = `/uploads/${req.file.filename}`;
  db.prepare("INSERT INTO uploads(user_id,path,mime) VALUES(?,?,?)").run(
    req.user.id,
    url,
    req.file.mimetype,
  );
  res.status(201).json({ url });
});

registerAi(app, { auth, db });

// 统一错误响应，避免把服务端堆栈信息暴露给前端。
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(400).json({ error: err.message || "请求失败" });
});
const port = process.env.PORT || 3002;
app.listen(port, () =>
  console.log(`Campus Mate API running at http://localhost:${port}`),
);
