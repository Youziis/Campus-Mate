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
    console.log(
      "Core API flow verified: health, login, activity list, application approval, contact privacy, favorites, notifications, stats and admin guard.",
    );
  } finally {
    server.kill();
    await new Promise((r) => setTimeout(r, 200));
    rmSync(dir, { recursive: true, force: true });
  }
});
