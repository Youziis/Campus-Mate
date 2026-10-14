# Campus Mate API 接口文档

面向前端开发与联调。文档按当前 `server/index.js` 实现整理；接口变更后请同步更新本文档。

## 1. 基本约定

| 配置项       | 值                                                       |
| ------------ | -------------------------------------------------------- |
| 本地后端地址 | `http://localhost:3002`                                  |
| API 前缀     | `/api`                                                   |
| 前端开发环境 | 请求 `/api/...`，Vite 会代理到后端                       |
| JSON 请求头  | `Content-Type: application/json`                         |
| 登录凭证     | `Authorization: Bearer <token>`                          |
| Token 有效期 | 7 天                                                     |
| 时间格式     | ISO 8601，建议包含时区，例如 `2026-11-01T10:00:00+08:00` |

除上传接口使用 `multipart/form-data` 外，请求和响应均使用 JSON。业务错误通常为 `{ "error": "错误说明" }`。未登录时返回 `401`；无权操作时返回 `403`。

### 权限标记

- **公开**：无需登录。
- **登录**：需要有效 Token。
- **创建者/管理员**：当前用户是活动创建者或管理员。
- **已通过成员**：当前用户在该活动的申请状态是 `approved`。
- **管理员**：当前用户的 `role` 是 `admin`。

### 通用对象

#### 用户对象

```json
{
  "id": 1,
  "email": "alice@campus.test",
  "name": "林同学",
  "avatar": null,
  "bio": "喜欢徒步和周末探索城市",
  "campus": "星河大学",
  "major": "设计学院",
  "year": "大二",
  "role": "user",
  "created_at": "2026-10-14 13:43:36"
}
```

未特别说明时，密码字段不会出现在响应中。用户资料详情接口会另外返回 `interests` 和 `review_count`。

#### 活动对象

活动列表、活动详情和创建/修改接口返回此对象（`image` 和 `ends_at` 可为 `null`）：

```json
{
  "id": 1,
  "creator_id": 2,
  "title": "周末环湖徒步",
  "description": "慢节奏徒步，欢迎新手",
  "category": "户外",
  "location": "南门集合",
  "starts_at": "2026-11-01T10:00:00+08:00",
  "ends_at": "2026-11-01T12:00:00+08:00",
  "capacity": 6,
  "image": null,
  "status": "open",
  "contact": null,
  "created_at": "2026-10-14 13:43:36",
  "creator_name": "林同学",
  "creator_avatar": null,
  "member_count": 1,
  "pending_count": 0,
  "is_favorite": false,
  "is_member": false,
  "interests": ["徒步", "摄影"]
}
```

### 错误码说明

| HTTP 状态码 | 含义                                                 |
| ----------- | ---------------------------------------------------- |
| 400         | 参数缺失、业务规则不允许，或服务端捕获到请求处理错误 |
| 401         | 未登录、Token 无效或账号密码错误                     |
| 403         | 已登录，但没有操作权限                               |
| 404         | 目标资源不存在或活动不可用                           |
| 409         | 数据重复、名额冲突或重复评价                         |

下文每个接口分别列出可能的业务错误码。`500` 代表未处理的服务端错误。

## 2. 健康检查与认证

### 2.1 `GET /api/health` — 服务健康检查

**权限：** 公开

**参数：** 无。

**返回结果（200）：**

```json
{ "ok": true, "service": "Campus Mate API" }
```

**报错代码：** 无业务错误码。

### 2.2 `POST /api/auth/register` — 注册

**权限：** 公开

**参数：** JSON Body

| 字段       | 类型   | 必填 | 说明      |
| ---------- | ------ | ---- | --------- |
| `email`    | string | 是   | 邮箱      |
| `password` | string | 是   | 至少 8 位 |
| `name`     | string | 是   | 用户昵称  |

**返回结果（201）：** `{ "token": "JWT_TOKEN", "user": 用户对象 }`。

**报错代码：** `400` 缺少字段或密码不足 8 位；`409` 邮箱已注册。

### 2.3 `POST /api/auth/login` — 登录

**权限：** 公开

**参数：** JSON Body：`email`（string，必填）、`password`（string，必填）。邮箱匹配不区分大小写。

**返回结果（200）：** `{ "token": "JWT_TOKEN", "user": 用户对象 }`。

**报错代码：** `401` 邮箱或密码不正确。

### 2.4 `GET /api/auth/me` — 获取当前用户

**权限：** 登录

**参数：** Header：`Authorization: Bearer <token>`。

**返回结果（200）：** 当前用户对象。

**报错代码：** `401` Token 缺失、无效或过期。

## 3. 兴趣与用户资料

### 3.1 `GET /api/interests` — 获取兴趣标签

**权限：** 公开

**参数：** 无。

**返回结果（200）：** 兴趣对象数组：`[{ "id": 1, "name": "徒步" }]`。

**报错代码：** 无业务错误码。

### 3.2 `GET /api/users/:id` — 获取用户资料

**权限：** 登录

**参数：** Path：`id`（number，用户 ID）；Header：Bearer Token。

**返回结果（200）：** 用户公开资料对象，字段为 `id`、`name`、`avatar`、`bio`、`campus`、`major`、`year`、`created_at`、`interests`（string[]）、`review_count`（number）。

**报错代码：** `401` 未登录；`404` 用户不存在（Express 默认空状态响应，不保证 JSON 格式）。

### 3.3 `PATCH /api/users/me` — 更新本人资料

**权限：** 登录

**参数：** Header：Bearer Token；JSON Body（所有字段均可选）：

| 字段                                               | 类型     | 说明                           |
| -------------------------------------------------- | -------- | ------------------------------ |
| `name`、`bio`、`campus`、`major`、`year`、`avatar` | string   | 更新对应资料                   |
| `interests`                                        | string[] | 传入数组时整体替换兴趣标签     |
| `availability`                                     | object[] | 传入数组时整体替换每周空闲时间 |

`availability` 项格式：`{ "weekday": 6, "period": "下午" }`。`weekday` 为 `0` 至 `6`（周日到周六）；`period` 当前使用“上午”“下午”“晚上”。不传 `interests` 或 `availability` 时，不修改对应数据。

示例：

```json
{
  "name": "林同学",
  "bio": "喜欢徒步和摄影",
  "interests": ["徒步", "摄影"],
  "availability": [{ "weekday": 6, "period": "下午" }]
}
```

**返回结果（200）：** 更新后的当前用户对象。

**报错代码：** `401` 未登录；`400` 数据库约束或请求处理错误。

### 3.4 `GET /api/users/me/availability` — 获取本人空闲时间

**权限：** 登录

**参数：** Header：Bearer Token。

**返回结果（200）：** `[{ "weekday": 6, "period": "下午" }]`。

**报错代码：** `401` 未登录。

### 3.5 `GET /api/users/me/stats` — 获取个人统计

**权限：** 登录

**参数：** Header：Bearer Token。

**返回结果（200）：**

```json
{
  "published": 2,
  "joined": 1,
  "hostedMembers": 3,
  "reviews": 2,
  "favorites": 4,
  "averageRating": 4.5
}
```

字段依次表示发布活动数、已通过的参与数、组织活动的已通过成员数、收到评价数、收藏数、平均评分。

**报错代码：** `401` 未登录。

## 4. 活动

### 4.1 `GET /api/activities` — 搜索活动

**权限：** 公开

**参数：** Query 参数均可选：

| 参数       | 类型   | 说明                                           |
| ---------- | ------ | ---------------------------------------------- |
| `q`        | string | 在标题、描述、地点中模糊搜索                   |
| `category` | string | 按分类筛选；`全部` 表示不筛选                  |
| `date`     | string | 按日期筛选，格式 `YYYY-MM-DD`                  |
| `interest` | string | 按兴趣名称筛选                                 |
| `sort`     | string | `popular` 按已通过人数排序；默认按开始时间排序 |

示例：`GET /api/activities?q=徒步&category=户外&sort=soon`

**返回结果（200）：** 活动对象数组，见[活动对象](#活动对象)。此列表仅返回 `status` 为 `open` 的活动。

**报错代码：** 无业务错误码。

### 4.2 `GET /api/activities/:id` — 获取活动详情

**权限：** 公开

**参数：** Path：`id`（number，活动 ID）。

**返回结果（200）：** 活动对象，见[活动对象](#活动对象)。

**报错代码：** `404` 活动不存在（Express 默认空状态响应，不保证 JSON 格式）。

### 4.3 `POST /api/activities` — 发布活动

**权限：** 登录

**参数：** Header：Bearer Token；JSON Body：

| 字段          | 类型           | 必填 | 说明                       |
| ------------- | -------------- | ---- | -------------------------- |
| `title`       | string         | 是   | 活动标题                   |
| `description` | string         | 是   | 活动介绍                   |
| `category`    | string         | 是   | 分类                       |
| `location`    | string         | 是   | 活动地点                   |
| `starts_at`   | string         | 是   | 开始时间，必须晚于当前时间 |
| `ends_at`     | string \| null | 否   | 结束时间                   |
| `capacity`    | number         | 否   | 人数上限；默认 6，最小 2   |
| `interests`   | string[]       | 否   | 兴趣标签名称数组           |
| `image`       | string \| null | 否   | 图片 URL 或相对路径        |

**返回结果（201）：** 新建活动对象。创建者会自动成为已通过成员。

**报错代码：** `400` 缺少必填字段或开始时间不是未来时间；`401` 未登录。

### 4.4 `PATCH /api/activities/:id` — 修改活动

**权限：** 创建者/管理员

**参数：** Path：`id`（活动 ID）；Header：Bearer Token；JSON Body 可包含：`title`、`description`、`category`、`location`、`starts_at`、`ends_at`、`capacity`、`image`、`status`。只更新传入字段。

**返回结果（200）：** 修改后的活动对象。

**报错代码：** `401` 未登录；`403` 不是创建者或管理员；`404` 活动不存在（Express 默认空状态响应）；`400` 数据库约束或请求处理错误。

### 4.5 `DELETE /api/activities/:id` — 取消活动

**权限：** 创建者/管理员

**参数：** Path：`id`（活动 ID）；Header：Bearer Token。

**返回结果（200）：** `{ "ok": true }`。活动被标记为 `cancelled`，记录不会物理删除，已通过成员会收到通知。

**报错代码：** `401` 未登录；`403` 不是创建者或管理员；`404` 活动不存在（Express 默认空状态响应）。

## 5. 报名、成员与收藏

### 5.1 `POST /api/activities/:id/applications` — 报名活动

**权限：** 登录

**参数：** Path：`id`（活动 ID）；Header：Bearer Token；JSON Body：`{ "message": "给组织者的留言" }`，`message` 可省略。

**返回结果（201）：** `{ "ok": true, "status": "pending" }`。

**报错代码：** `400` 不能报名自己的活动；`401` 未登录；`404` 活动不存在或已关闭；`409` 名额已满或已经报名。

### 5.2 `GET /api/activities/:id/applications` — 查看活动申请

**权限：** 创建者/管理员

**参数：** Path：`id`（活动 ID）；Header：Bearer Token。

**返回结果（200）：** 申请对象数组，每项包括申请表字段以及申请者的 `name`、`avatar`、`major`、`year`。

**报错代码：** `401` 未登录；`403` 不是创建者或管理员；`404` 活动不存在（Express 默认空状态响应）。

### 5.3 `PATCH /api/applications/:id` — 审核申请

**权限：** 创建者/管理员

**参数：** Path：`id`（申请 ID）；Header：Bearer Token；JSON Body：`{ "status": "approved" }`。`status` 只能是 `approved` 或 `rejected`。

**返回结果（200）：** `{ "ok": true }`。申请者会收到审核通知。

**报错代码：** `400` 状态值无效；`401` 未登录；`403` 不是该活动创建者或管理员；`404` 申请不存在；`409` 活动名额已满。

### 5.4 `DELETE /api/activities/:id/applications/me` — 撤销申请/退出活动

**权限：** 登录

**参数：** Path：`id`（活动 ID）；Header：Bearer Token。

**返回结果（200）：** `{ "ok": true }`。

**报错代码：** `400` 组织者不能退出自己创建的活动；`401` 未登录；`404` 没有对应申请。

### 5.5 `GET /api/users/me/activities` — 获取我发布的活动

**权限：** 登录

**参数：** Header：Bearer Token。

**返回结果（200）：** 当前用户创建的活动对象数组。

**报错代码：** `401` 未登录。

### 5.6 `GET /api/users/me/applications` — 获取我的报名记录

**权限：** 登录

**参数：** Header：Bearer Token。

**返回结果（200）：** 报名记录数组，每项字段为 `id`、`creator_id`、`title`、`starts_at`、`location`、`status`、`application_id`。

**报错代码：** `401` 未登录。

### 5.7 `GET /api/favorites` — 获取我的收藏

**权限：** 登录

**参数：** Header：Bearer Token。

**返回结果（200）：** 当前用户收藏的活动对象数组。

**报错代码：** `401` 未登录。

### 5.8 `POST /api/activities/:id/favorite` — 切换收藏状态

**权限：** 登录

**参数：** Path：`id`（活动 ID）；Header：Bearer Token；无 Body。

**返回结果（200）：** `{ "favorite": true }` 表示已收藏；`false` 表示已取消收藏。

**报错代码：** `401` 未登录；`400` 活动 ID 无效或数据库约束错误。

### 5.9 `GET /api/activities/:id/contact` — 获取活动成员

**权限：** 创建者/已通过成员

**参数：** Path：`id`（活动 ID）；Header：Bearer Token。

**返回结果（200）：** `{ "members": [...] }`。成员字段包括 `id`、`name`、`avatar`、`major`、`status`，只包含已通过成员。

**报错代码：** `401` 未登录；`403` 不是创建者或已通过成员；`404` 活动不存在。

## 6. 评价、推荐与通知

### 6.1 `POST /api/activities/:id/reviews` — 提交活动评价

**权限：** 已通过成员

**参数：** Path：`id`（活动 ID）；Header：Bearer Token；JSON Body：

```json
{
  "reviewee_id": 2,
  "rating": 5,
  "comment": "友善守时，活动体验很好"
}
```

`rating` 范围为 1 至 5；`comment` 可省略。评价者和被评价者必须都是该活动已通过成员，且不能评价自己。活动开始前不能评价。

**返回结果（201）：** `{ "ok": true }`。

**报错代码：** `400` 活动不存在或活动尚未开始；`401` 未登录；`403` 不是活动成员或试图评价自己；`409` 已评价过或评分值违反数据库约束。

### 6.2 `GET /api/users/:id/reviews` — 获取用户评价

**权限：** 登录

**参数：** Path：`id`（用户 ID）；Header：Bearer Token。

**返回结果（200）：** 评价数组，每项包含评价表字段和 `reviewer_name`。

**报错代码：** `401` 未登录。

### 6.3 `GET /api/recommendations` — 获取个性化推荐

**权限：** 登录

**参数：** Header：Bearer Token。

**返回结果（200）：** 活动对象数组，每项附加 `recommendationScore`（兴趣匹配数量）及 `matchedAvailability`（是否匹配空闲星期；未填写空闲时间时为 `null`）。只推荐尚未开始且由其他用户创建的开放活动。

**报错代码：** `401` 未登录。

### 6.4 `GET /api/notifications` — 获取我的通知

**权限：** 登录

**参数：** Header：Bearer Token。最多返回最近 100 条。

**返回结果（200）：** 通知对象数组。`read` 为 `0`（未读）或 `1`（已读）。

**报错代码：** `401` 未登录。

### 6.5 `PATCH /api/notifications/:id/read` — 标记单条通知已读

**权限：** 登录

**参数：** Path：`id`（通知 ID）；Header：Bearer Token；无 Body。

**返回结果（200）：** `{ "ok": true }`。

**报错代码：** `401` 未登录。若通知不属于当前用户或不存在，接口仍返回成功，但不会更新记录。

### 6.6 `POST /api/notifications/read-all` — 全部标记已读

**权限：** 登录

**参数：** Header：Bearer Token；无 Body。

**返回结果（200）：** `{ "ok": true }`。

**报错代码：** `401` 未登录。

## 7. 举报、管理员与图片上传

### 7.1 `POST /api/reports` — 提交举报

**权限：** 登录

**参数：** Header：Bearer Token；JSON Body：`target_type`（string）、`target_id`（number）、`reason`（string），三项必填。

```json
{
  "target_type": "activity",
  "target_id": 12,
  "reason": "活动信息不实"
}
```

**返回结果（201）：** `{ "ok": true }`。

**报错代码：** `400` 必填字段缺失；`401` 未登录。

### 7.2 `GET /api/admin/reports` — 获取举报列表

**权限：** 管理员

**参数：** Header：Bearer Token。

**返回结果（200）：** 举报对象数组，每项附加 `reporter_name`。

**报错代码：** `401` 未登录；`403` 非管理员。

### 7.3 `PATCH /api/admin/reports/:id` — 处理举报

**权限：** 管理员

**参数：** Path：`id`（举报 ID）；Header：Bearer Token；JSON Body：`{ "status": "resolved" }`。传 `resolved` 会设为已处理，其他值会设为 `dismissed`。

**返回结果（200）：** `{ "ok": true }`，并写入管理员操作记录。

**报错代码：** `401` 未登录；`403` 非管理员。当前实现对不存在的举报 ID 也返回成功。

### 7.4 `GET /api/admin/activities` — 获取全部活动

**权限：** 管理员

**参数：** Header：Bearer Token。

**返回结果（200）：** 全部活动对象数组，包括已取消或下架的活动。

**报错代码：** `401` 未登录；`403` 非管理员。

### 7.5 `DELETE /api/admin/activities/:id` — 下架活动

**权限：** 管理员

**参数：** Path：`id`（活动 ID）；Header：Bearer Token。

**返回结果（200）：** `{ "ok": true }`；活动 `status` 会设置为 `removed`，并记录管理员操作。

**报错代码：** `401` 未登录；`403` 非管理员。当前实现对不存在的活动 ID 也返回成功。

### 7.6 `POST /api/uploads` — 上传活动图片

**权限：** 登录

**参数：** Header：Bearer Token；Body 类型：`multipart/form-data`；文件字段名：`image`。

仅接受 JPG、PNG、WebP 图片，最大 5 MB。不要手动设置 multipart 的 `Content-Type`，由浏览器自动添加 boundary。

**返回结果（201）：** `{ "url": "/uploads/1730000000000-ab12cd.webp" }`。URL 为相对路径，可拼接当前站点地址显示图片。

**报错代码：** `400` 未选择文件、文件类型不支持、文件超过限制或上传失败；`401` 未登录。
