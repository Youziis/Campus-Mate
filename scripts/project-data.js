import "dotenv/config";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  configuredDatabaseFile,
  sharedDatabaseFile,
} from "../server/data-files.js";

const [action, ...options] = process.argv.slice(2);
const optionName = action === "export" ? "--output" : "--input";
if (
  !["export", "import"].includes(action) ||
  (options.length && (options.length !== 2 || options[0] !== optionName || !options[1]))
) {
  console.error("用法：npm run data:export [-- --output 文件] 或 npm run data:import [-- --input 文件]");
  process.exit(1);
}

const databaseFile = configuredDatabaseFile();
const snapshotFile = options.length ? path.resolve(options[1]) : sharedDatabaseFile;
if (path.resolve(snapshotFile).toLowerCase() === path.resolve(databaseFile).toLowerCase()) {
  throw Error("数据快照不能与运行数据库使用同一个文件。");
}

function inspectDatabase(file) {
  const connection = new DatabaseSync(file, { readOnly: true });
  try {
    const integrity = connection.prepare("PRAGMA integrity_check").get();
    if (Object.values(integrity)[0] !== "ok") throw Error("数据库完整性检查失败。");
    if (connection.prepare("PRAGMA foreign_key_check").all().length) {
      throw Error("数据库存在外键错误，未导出或导入。");
    }
    return {
      users: connection.prepare("SELECT count(*) AS total FROM users").get().total,
      activities: connection.prepare("SELECT count(*) AS total FROM activities").get().total,
    };
  } finally {
    connection.close();
  }
}

// VACUUM INTO 取得包含 WAL 最新事务的一致副本，避免直接复制正在写入的 .db。
function exportDatabase() {
  if (!fs.existsSync(databaseFile)) throw Error("本地数据库不存在，请先启动项目。");
  fs.mkdirSync(path.dirname(snapshotFile), { recursive: true });
  const temporaryFile = `${snapshotFile}.${process.pid}.tmp`;
  const connection = new DatabaseSync(databaseFile, { readOnly: true });
  try {
    connection.prepare("VACUUM INTO ?").run(temporaryFile);
    const snapshot = new DatabaseSync(temporaryFile);
    try { snapshot.exec("PRAGMA journal_mode = DELETE;"); } finally { snapshot.close(); }
    const counts = inspectDatabase(temporaryFile);
    fs.renameSync(temporaryFile, snapshotFile);
    console.log(`数据快照已导出：${snapshotFile}`);
    console.log(`包含 ${counts.users} 个账号、${counts.activities} 条活动，以及全部关联数据。`);
    console.log("请将快照与 server/uploads 图片一起提交到 Git。");
  } finally {
    connection.close();
    fs.rmSync(temporaryFile, { force: true });
  }
}

function apiIsRunning() {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "localhost", port: Number(process.env.PORT || 3002) });
    const finish = (running) => { socket.destroy(); resolve(running); };
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    socket.setTimeout(1500, () => finish(true));
  });
}

async function importDatabase() {
  if (!fs.existsSync(snapshotFile)) throw Error("仓库数据快照不存在，请先拉取最新代码。");
  const counts = inspectDatabase(snapshotFile);
  if (await apiIsRunning()) throw Error("请先停止 npm run dev / API 服务，再导入数据。");

  fs.mkdirSync(path.dirname(databaseFile), { recursive: true });
  const existingFiles = [databaseFile, `${databaseFile}-wal`, `${databaseFile}-shm`]
    .filter((file) => fs.existsSync(file));
  const backupDirectory = path.join(path.dirname(databaseFile), "backups", `${Date.now()}-${process.pid}`);
  const temporaryFile = `${databaseFile}.import-${process.pid}.tmp`;
  const movedFiles = [];
  try {
    // 先完整复制到临时文件，避免中途复制失败而留下半个运行数据库。
    fs.copyFileSync(snapshotFile, temporaryFile, fs.constants.COPYFILE_EXCL);
    if (existingFiles.length) {
      fs.mkdirSync(backupDirectory, { recursive: true });
      for (const source of existingFiles) {
        const destination = path.join(backupDirectory, path.basename(source));
        fs.renameSync(source, destination);
        movedFiles.push({ source, destination });
      }
    }
    fs.renameSync(temporaryFile, databaseFile);
  } catch (error) {
    // 导入失败时恢复原来的数据库及 WAL 文件，不丢失成员的本地数据。
    for (const { source, destination } of movedFiles.reverse()) fs.renameSync(destination, source);
    throw error;
  } finally {
    fs.rmSync(temporaryFile, { force: true });
  }
  console.log(`已导入 ${counts.users} 个账号、${counts.activities} 条活动。`);
  if (existingFiles.length) console.log(`原本地数据已备份到：${backupDirectory}`);
  console.log("现在可运行 npm run dev。");
}

try {
  if (action === "export") exportDatabase();
  else await importDatabase();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
