import "dotenv/config";
import { db } from "./db.js";
import { bulkActivities } from "./bulk-activities.js";
import { replaceInterests } from "./interests.js";

const creators = db.prepare("SELECT id FROM users WHERE role='user' ORDER BY id").all();
if (!creators.length) throw new Error("没有可用于发布演示活动的普通用户，请先运行 npm run db:seed");

const findActivity = db.prepare("SELECT id FROM activities WHERE title=? LIMIT 1");
const findCategory = db.prepare("SELECT id FROM activity_categories WHERE name=? AND enabled=1");
const insertActivity = db.prepare(`
  INSERT INTO activities(
    creator_id,title,description,category,category_id,location,starts_at,ends_at,capacity,image,status,contact
  ) VALUES(?,?,?,?,?,?,?,?,?,?,'open',?)
`);
const updateActivity = db.prepare(`
  UPDATE activities SET
    creator_id=?,description=?,category=?,category_id=?,location=?,starts_at=?,ends_at=?,capacity=?,image=?,status='open',contact=?
  WHERE id=?
`);
const addOrganizer = db.prepare("INSERT OR IGNORE INTO applications(activity_id,user_id,status,message) VALUES(?,?,'approved','组织者')");

function futureTime(dayOffset, hour, duration) {
  const beijingNow = new Date(Date.now() + 8 * 3600000);
  const start = new Date(Date.UTC(
    beijingNow.getUTCFullYear(),
    beijingNow.getUTCMonth(),
    beijingNow.getUTCDate() + dayOffset,
    hour - 8,
    0,
  ));
  return [start.toISOString(), new Date(start.getTime() + duration * 3600000).toISOString()];
}

db.exec("BEGIN");
try {
  bulkActivities.forEach((activity, index) => {
    const category = findCategory.get(activity.category);
    if (!category) throw new Error(`活动分类不存在：${activity.category}`);
    const creatorId = creators[index % creators.length].id;
    const [startsAt, endsAt] = futureTime(activity.dayOffset, activity.hour, activity.duration);
    const image = `/uploads/bulk-covers/${activity.cover}`;
    const contact = `bulk-demo-${String(index + 1).padStart(2, "0")}`;
    const existing = findActivity.get(activity.title);
    let activityId;
    if (existing) {
      updateActivity.run(
        creatorId, activity.description, activity.category, category.id, activity.location,
        startsAt, endsAt, activity.capacity, image, contact, existing.id,
      );
      activityId = existing.id;
    } else {
      activityId = Number(insertActivity.run(
        creatorId, activity.title, activity.description, activity.category, category.id,
        activity.location, startsAt, endsAt, activity.capacity, image, contact,
      ).lastInsertRowid);
    }
    replaceInterests(db, "activity", activityId, activity.tags);
    addOrganizer.run(activityId, creatorId);
  });
  db.exec("COMMIT");
  console.log(`已写入或更新 ${bulkActivities.length} 条批量演示活动。`);
} catch (error) {
  db.exec("ROLLBACK");
  throw error;
}

