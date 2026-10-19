const recent = new Map();
export const DEFAULT_PERSONA = {
  name: "小强",
  rolePrompt:
    "你是 AI 学习搭子，名字叫小强。你陪用户把一件学习的事弄懂：先讲重点，再出题，也可以一起计时。语气清楚、耐心，回答简短。",
};

function localReply(name, topic, text) {
  const subject = topic || "这次学习";
  const who = name || DEFAULT_PERSONA.name;
  if (/出题|三题|考我|题目|测验|复习/.test(text)) {
    return `${who}：围绕「${subject}」，先做这三题：\n1. 用自己的话写出核心概念。\n2. 举一个你在校园里能碰到的例子。\n3. 指出一个容易混淆的地方，并说明怎么区分。`;
  }
  if (/25|计时|番茄/.test(text)) {
    return `${who}：好，从现在开始专注 25 分钟。先看「${subject}」里最不清楚的一节，到点再用一句话告诉我你看懂了什么。`;
  }
  return `${who}：我们先看「${subject}」。可以按这三步：\n1. 用一句话写出这次要搞懂的目标。\n2. 标出两个还不懂的词。\n3. 各用一个例子把它们讲清楚。\n你现在卡在哪一步？`;
}

function allow(userId) {
  const now = Date.now();
  const stamps = (recent.get(userId) || []).filter((time) => now - time < 60_000);
  if (stamps.length >= 20) return false;
  stamps.push(now);
  recent.set(userId, stamps);
  return true;
}

async function askModel(messages) {
  const key = (process.env.AI_API_KEY || "").trim();
  if (!key) return null;
  const base = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.AI_MODEL || "gpt-4o-mini";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, temperature: 0.6, messages }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function registerAi(app, { auth, db }) {
  const messagesOf = (sessionId) =>
    db.prepare("SELECT role, content, created_at FROM ai_messages WHERE session_id=? ORDER BY id").all(sessionId);

  function personaOf(userId) {
    const row = db.prepare("SELECT name, role_prompt FROM ai_personas WHERE user_id=?").get(userId);
    return {
      name: row?.name || DEFAULT_PERSONA.name,
      rolePrompt: row?.role_prompt || DEFAULT_PERSONA.rolePrompt,
    };
  }

  app.get("/api/ai/persona", auth, (req, res) => {
    res.json(personaOf(req.user.id));
  });

  app.put("/api/ai/persona", auth, (req, res) => {
    if (req.body?.reset) {
      db.prepare("DELETE FROM ai_personas WHERE user_id=?").run(req.user.id);
      return res.json(DEFAULT_PERSONA);
    }
    const name = String(req.body?.name || "").trim();
    const rolePrompt = String(req.body?.rolePrompt || "").trim();
    if (!name || name.length > 20) return res.status(400).json({ error: "名字请控制在 1 到 20 字" });
    if (!rolePrompt || rolePrompt.length > 800) return res.status(400).json({ error: "角色定义请控制在 1 到 800 字" });
    db.prepare(
      `INSERT INTO ai_personas(user_id, name, role_prompt, updated_at)
       VALUES(?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id) DO UPDATE SET name=excluded.name, role_prompt=excluded.role_prompt, updated_at=CURRENT_TIMESTAMP`,
    ).run(req.user.id, name, rolePrompt);
    res.json({ name, rolePrompt });
  });

  const sessionList = db.prepare(`
    SELECT s.id, s.created_at, s.activity_id,
      COALESCE(
        a.title,
        (SELECT content FROM ai_messages m WHERE m.session_id=s.id AND m.role='user' ORDER BY m.id LIMIT 1),
        '新的学习对话'
      ) AS title
    FROM ai_sessions s
    LEFT JOIN activities a ON a.id=s.activity_id
    WHERE s.user_id=?
    ORDER BY s.id DESC
    LIMIT 30
  `);

  app.get("/api/ai/sessions", auth, (req, res) => {
    res.json(sessionList.all(req.user.id));
  });

  app.get("/api/ai/sessions/:id", auth, (req, res) => {
    const session = db.prepare("SELECT id, activity_id FROM ai_sessions WHERE id=? AND user_id=?").get(req.params.id, req.user.id);
    if (!session) return res.status(404).json({ error: "没有找到这段对话" });
    res.json({ id: session.id, messages: messagesOf(session.id), persona: personaOf(req.user.id) });
  });

  app.post("/api/ai/sessions", auth, (req, res) => {
    const activityId = Number(req.body?.activityId) || null;
    const fresh = !!req.body?.fresh;
    let topic = "自主学习";
    if (activityId) {
      const row = db.prepare("SELECT id, title, description, category FROM activities WHERE id=?").get(activityId);
      if (!row) return res.status(404).json({ error: "没有找到活动" });
      if (row.category !== "学习") return res.status(400).json({ error: "只有学习活动可以使用 AI 搭子" });
      topic = row.title;
      if (!fresh) {
        const existing = db
          .prepare("SELECT id FROM ai_sessions WHERE user_id=? AND activity_id=? ORDER BY id DESC LIMIT 1")
          .get(req.user.id, activityId);
        if (existing) return res.json({ id: existing.id, topic, messages: messagesOf(existing.id), persona: personaOf(req.user.id) });
      }
    } else if (!fresh) {
      const existing = db
        .prepare("SELECT id FROM ai_sessions WHERE user_id=? AND activity_id IS NULL ORDER BY id DESC LIMIT 1")
        .get(req.user.id);
      if (existing) return res.json({ id: existing.id, topic, messages: messagesOf(existing.id), persona: personaOf(req.user.id) });
    }
    const created = db.prepare("INSERT INTO ai_sessions(user_id, activity_id) VALUES(?, ?)").run(req.user.id, activityId);
    res.status(201).json({ id: Number(created.lastInsertRowid), topic, messages: [], persona: personaOf(req.user.id) });
  });

  app.post("/api/ai/sessions/:id/messages", auth, async (req, res) => {
    if (!allow(req.user.id)) return res.status(429).json({ error: "发送太频繁，请稍后再试" });
    const content = String(req.body?.content || "").trim();
    if (!content || content.length > 500) return res.status(400).json({ error: "请输入 1 到 500 字" });
    const session = db.prepare("SELECT * FROM ai_sessions WHERE id=? AND user_id=?").get(req.params.id, req.user.id);
    if (!session) return res.status(404).json({ error: "没有找到这段对话" });

    let topic = "自主学习";
    let brief = "";
    if (session.activity_id) {
      const row = db.prepare("SELECT title, description, category FROM activities WHERE id=?").get(session.activity_id);
      if (row) {
        topic = row.title;
        brief = String(row.description || "").slice(0, 500);
      }
    }
    db.prepare("INSERT INTO ai_messages(session_id, role, content) VALUES(?, 'user', ?)").run(session.id, content);
    const history = db
      .prepare("SELECT role, content FROM ai_messages WHERE session_id=? ORDER BY id DESC LIMIT 12")
      .all(session.id)
      .reverse();
    const persona = personaOf(req.user.id);
    const prompt = [
      {
        role: "system",
        content: `${persona.rolePrompt}\n你的名字是「${persona.name}」。你不是活动成员，不要报名，不要编造联系方式。当前学习主题：${topic}。简介：${brief || "用户还没有指定具体活动。"}`,
      },
      ...history,
    ];
    const modelReply = await askModel(prompt);
    const reply = modelReply || localReply(persona.name, topic, content);
    db.prepare("INSERT INTO ai_messages(session_id, role, content) VALUES(?, 'assistant', ?)").run(session.id, reply);
    res.json({ reply, fallback: !modelReply, messages: messagesOf(session.id) });
  });
}
