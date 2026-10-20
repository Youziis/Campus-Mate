import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
test("core campus activity flow respects login, approval, privacy and admin access", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "campus-mate-"));
  const db = path.join(dir, "test.db");
  const port = 34000 + Math.floor(Math.random() * 10000);
  const env = {
    ...process.env,
    PORT: String(port),
    DATABASE_FILE: db,
    JWT_SECRET: "test-secret",
  };
  const seeded = spawn(process.execPath, ["server/seed.js"], {
    env,
    stdio: "ignore",
  });
  await new Promise((resolve, reject) => {
    seeded.once("error", reject);
    seeded.once("exit", (code) =>
      code === 0 ? resolve() : reject(Error(`seed exited ${code}`)),
    );
  });
  const server = spawn(process.execPath, ["server/index.js"], {
    env,
    stdio: "ignore",
  });
  const base = `http://127.0.0.1:${port}/api`;
  async function req(url, opts = {}) {
    for (let i = 0; i < 30; i++) {
      try {
        return await fetch(base + url, opts);
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    throw Error("API did not start");
  }
  async function login(email, password) {
    const r = await req("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(r.status, 200);
    return (await r.json()).token;
  }
  async function call(url, token, opts = {}) {
    return req(url, {
      ...opts,
      headers: {
        authorization: `Bearer ${token}`,
        ...opts.headers,
        ...(opts.body ? { "content-type": "application/json" } : {}),
      },
    });
  }
  try {
    assert.equal((await req("/health")).status, 200);
    const alice = await login("alice@campus.test", "mate1234"),
      bo = await login("bo@campus.test", "mate1234"),
      mei = await login("mei@campus.test", "mate1234");
    const a = (await (await call("/activities", alice)).json()).find(
      (x) => x.creator_name === "陈同学",
    );
    assert.ok(a);
    // Seeded activities have no organizer application; the organizer still counts.
    assert.equal(a.member_count, 1);
    assert.equal((await call(`/activities/${a.id}`, bo, { method: "PATCH", body: JSON.stringify({ capacity: 2 }) })).status, 200);
    assert.equal((await call(`/activities/${a.id}/contact`, mei)).status, 403);
    let r = await call(`/activities/${a.id}/applications`, mei, {
      method: "POST",
      body: JSON.stringify({ message: "一起运动" }),
    });
    assert.equal(r.status, 201);
    const adminList = await call(`/activities/${a.id}/applications`, bo);
    assert.equal(adminList.status, 200);
    const app = (await adminList.json()).find((x) => x.user_id);
    assert.ok(app);
    assert.equal(
      (
        await call(`/applications/${app.id}`, bo, {
          method: "PATCH",
          body: JSON.stringify({ status: "approved" }),
        })
      ).status,
      200,
    );
    assert.equal((await call(`/activities/${a.id}/contact`, mei)).status, 200);
    assert.equal((await (await call(`/activities/${a.id}`, mei)).json()).member_count, 2);
    assert.equal((await call(`/activities/${a.id}/applications`, alice, { method: "POST", body: JSON.stringify({ message: "已满员测试" }) })).status, 409);
    assert.equal(
      (await call(`/activities/${a.id}/favorite`, mei, { method: "POST" }))
        .status,
      200,
    );
    assert.equal((await call("/notifications", mei)).status, 200);
    assert.equal((await call("/users/me/stats", mei)).status, 200);
    assert.equal((await call("/activities", alice)).status, 200);
    const admin = await login("admin@campus.test", "admin123");
    assert.equal((await call("/admin/reports", admin)).status, 200);
    assert.equal((await call("/admin/reports", alice)).status, 403);
    // Persist new tags, deduplicate them, and retain data after invalid input.
    const self = await (await call("/auth/me", alice)).json();
    const updateTags = (interests) => call("/users/me", alice, {
      method: "PATCH", body: JSON.stringify({ interests }),
    });
    assert.equal((await updateTags("奶龙打卡  星空摄影\t奶龙打卡")).status, 200);
    const profileTags = (await (await call(`/users/${self.id}`, alice)).json()).interests;
    assert.deepEqual([...profileTags].sort(), ["奶龙打卡", "星空摄影"].sort());
    const catalog = await (await req("/interests")).json();
    assert.equal(catalog.filter((tag) => tag.name === "奶龙打卡").length, 1);
    assert.equal((await updateTags([123])).status, 400);
    assert.deepEqual((await (await call(`/users/${self.id}`, alice)).json()).interests, profileTags);
    const created = await call("/activities", alice, {
      method: "POST", body: JSON.stringify({ title: "Custom tags", description: "Test", category: "学习", location: "Library", starts_at: "2099-01-01T00:30", interests: ["奶龙打卡", "新活动标签"] }),
    });
    assert.equal(created.status, 201);
    const taggedActivity = await created.json();
    // User-created activities contain an organizer application: count them once.
    assert.equal(taggedActivity.member_count, 1);
    assert.equal(taggedActivity.starts_at, "2098-12-31T16:30:00.000Z");
    const dateFiltered = await (await call("/activities?date=2099-01-01", alice)).json();
    assert.ok(dateFiltered.some((item) => item.id === taggedActivity.id));
    assert.ok(taggedActivity.interests.includes("新活动标签"));
    const edited = await call(`/activities/${taggedActivity.id}`, alice, {
      method: "PATCH", body: JSON.stringify({ interests: "自定义编辑标签 自定义编辑标签", starts_at: "2099-01-02T19:00" }),
    });
    assert.equal(edited.status, 200);
    const editedActivity = await edited.json();
    assert.deepEqual(editedActivity.interests, ["自定义编辑标签"]);
    assert.equal(editedActivity.starts_at, "2099-01-02T11:00:00.000Z");
    assert.equal((await updateTags([])).status, 200);
    assert.deepEqual((await (await call(`/users/${self.id}`, alice)).json()).interests, []);
    // Cancellation preserves ownership checks and notifies approved members once.
    assert.equal((await call(`/activities/${a.id}`, alice, { method: "DELETE" })).status, 403);
    const beforeCancellation = await (await call("/notifications", mei)).json();
    assert.equal((await call(`/activities/${a.id}`, bo, { method: "DELETE" })).status, 400);
    assert.equal((await call(`/activities/${a.id}`, mei)).status, 200);
    const cancelled = await call(`/activities/${a.id}`, bo, { method: "DELETE", body: JSON.stringify({ reason: "场馆临时关闭", announcement: "本次取消，请勿前往集合点。" }) });
    assert.equal(cancelled.status, 200, await cancelled.text());
    assert.equal((await call(`/activities/${a.id}`, mei)).status, 404);
    assert.ok(!(await (await call("/users/me/applications", mei)).json()).some((item) => item.id === a.id));
    const afterCancellation = await (await call("/notifications", mei)).json();
    assert.equal(afterCancellation.length, beforeCancellation.length + 1);
    assert.ok(afterCancellation.some((item) => item.title === "活动已取消" && item.body.includes(a.title) && item.body.includes("场馆临时关闭") && item.body.includes("请勿前往集合点")));
    assert.equal((await call(`/activities/${a.id}`, bo, { method: "DELETE" })).status, 404);
    assert.equal((await (await call("/notifications", mei)).json()).length, afterCancellation.length);
    const deletionTarget = afterCancellation.find((item) => item.title === "活动已取消");
    assert.equal((await call(`/notifications/${deletionTarget.id}`, alice, { method: "DELETE" })).status, 404);
    assert.ok((await (await call("/notifications", mei)).json()).some((item) => item.id === deletionTarget.id));
    assert.equal((await call(`/notifications/${deletionTarget.id}`, mei, { method: "DELETE" })).status, 200);
    assert.ok(!(await (await call("/notifications", mei)).json()).some((item) => item.id === deletionTarget.id));
    assert.equal((await call(`/notifications/${deletionTarget.id}`, mei, { method: "DELETE" })).status, 404);
    console.log(
      "Core API flow verified: health, login, activity list, application approval, contact privacy, favorites, notifications, stats and admin guard.",
    );
  } finally {
    server.kill();
    await new Promise((r) => setTimeout(r, 200));
    rmSync(dir, { recursive: true, force: true });
  }
});
