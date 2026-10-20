import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const defaultDatabaseFile = fileURLToPath(
  new URL("./data/campus-mate.db", import.meta.url),
);
export const sharedDatabaseFile = fileURLToPath(
  new URL("./data/campus-mate.snapshot.db", import.meta.url),
);

export function configuredDatabaseFile() {
  return path.resolve(process.env.DATABASE_FILE || defaultDatabaseFile);
}

// 首次克隆恢复仓库中的完整快照；已有数据库和测试用自定义数据库不受影响。
export function initializeSharedDatabase(databaseFile) {
  const normalize = (file) =>
    process.platform === "win32" ? path.resolve(file).toLowerCase() : path.resolve(file);
  if (
    normalize(databaseFile) !== normalize(defaultDatabaseFile) ||
    fs.existsSync(databaseFile) ||
    !fs.existsSync(sharedDatabaseFile)
  ) return false;

  fs.mkdirSync(path.dirname(databaseFile), { recursive: true });
  try {
    fs.copyFileSync(sharedDatabaseFile, databaseFile, fs.constants.COPYFILE_EXCL);
    console.log("已从仓库数据快照初始化本地数据库。");
    return true;
  } catch (error) {
    if (error.code === "EEXIST") return false;
    throw error;
  }
}
