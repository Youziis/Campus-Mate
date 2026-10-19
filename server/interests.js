// Both profile and activity APIs accept existing arrays or space-separated text.
export function normalizeInterests(input) {
  if (typeof input !== "string" && !Array.isArray(input)) {
    throw new Error("兴趣标签必须是文字或字符串数组");
  }
  const values = Array.isArray(input) ? input : [input];
  if (values.some((value) => typeof value !== "string")) {
    throw new Error("兴趣标签必须为文字");
  }
  const tags = [...new Set(values.flatMap((value) => value.trim().split(/\s+/u)).filter(Boolean))];
  if (tags.length > 30) throw new Error("最多填写 30 个兴趣标签");
  if (tags.some((tag) => [...tag].length > 30)) throw new Error("每个兴趣标签最多 30 个字符");
  return tags;
}

export function replaceInterests(db, ownerType, ownerId, tags) {
  const table = ownerType === "user" ? "user_interests" : "activity_interests";
  const column = ownerType === "user" ? "user_id" : "activity_id";
  db.exec("SAVEPOINT replace_interests");
  try {
    db.prepare(`DELETE FROM ${table} WHERE ${column}=?`).run(ownerId);
    const create = db.prepare("INSERT OR IGNORE INTO interests(name) VALUES(?)");
    const link = db.prepare(`INSERT OR IGNORE INTO ${table}(${column},interest_id) SELECT ?,id FROM interests WHERE name=?`);
    for (const tag of tags) {
      create.run(tag);
      link.run(ownerId, tag);
    }
    db.exec("RELEASE replace_interests");
  } catch (error) {
    db.exec("ROLLBACK TO replace_interests; RELEASE replace_interests");
    throw error;
  }
}
