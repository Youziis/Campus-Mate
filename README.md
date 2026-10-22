# Campus Mate 校园搭子

本地演示用的校园活动搭子平台。前端使用 Vue 3、Vite、Element Plus；后端使用 Node.js、Express、Node 内置 SQLite、JWT。无需单独安装数据库。

## 快速启动

需要 Node.js 22.13 或更新版本，以及 npm。Windows 用户可以双击 `start.bat`；也可以在项目目录运行：

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

打开 <http://localhost:5173/>。API 默认运行在端口 3002，Vite 会自动代理 API 和图片请求。若端口冲突，可修改 `.env` 中的 `PORT`，并同步修改 `vite.config.js` 中的代理端口。

首次启动会自动从 Git 内的 `server/data/campus-mate.snapshot.db` 恢复当前项目的完整数据，包括账号、资料、活动、报名、通知和关联记录。活动图片与头像位于 `server/uploads/`，也随项目下载。已存在的本地数据库不会被自动覆盖。

快照保留导出时的账号密码；当前测试账号可使用 `alice@campus.test`、`bo@campus.test`、`mei@campus.test`。当前快照管理员为 `admin@campus.test / 123456`。历史 `db:seed` 命令生成的账号密码与当前快照可能不同，优先使用团队已约定的测试密码。

请勿在公开部署时使用演示账号或默认 JWT 密钥。复制 `.env.example` 为 `.env` 并设置随机 `JWT_SECRET`。数据库默认写入 `server/data/campus-mate.db`，上传图片位于 `server/uploads/`。

## 多人协作：同步当前数据与图片

### 已经启动过项目，但没有数据的成员

先停止前后端服务，在 GitHub Desktop 拉取包含本次修改的分支，再运行：

```powershell
npm install
npm run data:import
npm run dev
```

`data:import` 会先把原来的运行数据库及 WAL/SHM 文件备份到 `server/data/backups/`，再导入仓库快照。导入会替换本地数据，请先提交或另行保留需要共享的本地修改。服务未停止时，命令会拒绝导入。

### 将自己新增的数据共享给其他成员

```powershell
npm run data:export
git add .
git commit -m "更新共享数据和活动图片"
git push
```

`data:export` 从当前数据库生成一致快照，包含 WAL 中已经提交的最新数据，可在服务运行时执行。提交快照时同时提交 `server/uploads/`，避免其他成员看到活动但图片丢失。

Git 同步的是数据快照，不会实时合并每个人的本地数据库。成员拉取最新快照后，需要停止服务并运行 `npm run data:import` 才会替换自己的已有数据；避免两人同时改动快照，建议由一人统一导出。

版本管理包含完整源码、文档、模型、默认封面、上传资源和共享数据库快照。`.env` 保留在每台电脑上，通过 `.env.example` 配置；依赖由 `npm install` 安装，构建产物由 `npm run build` 生成。

## 功能

- 邮箱注册登录、用户资料、兴趣标签、每周空闲时间偏好
- 活动创建、编辑、取消、分类和关键词搜索、兴趣推荐、图片上传
- 报名申请、组织者审核、成员退出、收藏、站内通知
- 组织者和已通过成员访问成员信息；活动结束后互评
- 举报、管理员处理举报和下架活动
- 个人统计：发起、参与、结识成员、评价和收藏

## API 简表

认证使用 `Authorization: Bearer <token>`。错误响应为 `{ "error": "..." }`。

完整请求参数、响应示例和权限说明见 [接口文档](docs/API.md)。

| 方法与路径                                                                                        | 权限                           | 说明                                             |
| ------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------ |
| `POST /api/auth/register`、`POST /api/auth/login`                                                 | 公开                           | 注册、登录                                       |
| `GET /api/auth/me`                                                                                | 登录                           | 当前用户                                         |
| `GET /api/interests`                                                                              | 公开                           | 兴趣标签                                         |
| `GET /api/categories`                                                                             | 公开                           | 活动种类、图标、排序和默认封面                   |
| `GET/PATCH /api/users/:id`、`PATCH /api/users/me`                                                 | 登录                           | 公开资料、更新本人资料                           |
| `GET /api/users/me/availability`、`GET /api/users/me/stats`                                       | 登录                           | 空闲时间、统计                                   |
| `GET/POST /api/activities`                                                                        | 查询公开、创建需登录           | 活动列表与发布；支持关键词、分类、日期、兴趣筛选 |
| `GET/PATCH/DELETE /api/activities/:id`                                                            | 查询公开，管理需创建者或管理员 | 详情、编辑、取消                                 |
| `POST /api/activities/:id/applications`                                                           | 登录                           | 报名                                             |
| `GET /api/activities/:id/applications`、`PATCH /api/applications/:id`                             | 创建者/管理员                  | 查看并审核报名                                   |
| `DELETE /api/activities/:id/applications/me`                                                      | 登录                           | 退出活动                                         |
| `GET /api/users/me/activities`、`GET /api/users/me/applications`                                  | 登录                           | 我发起、我申请的活动                             |
| `GET /api/favorites`、`POST /api/activities/:id/favorite`                                         | 登录                           | 收藏                                             |
| `GET /api/activities/:id/contact`                                                                 | 创建者/已通过成员              | 查看活动成员                                     |
| `POST /api/activities/:id/reviews`、`GET /api/users/:id/reviews`                                  | 活动成员                       | 提交、查看评价                                   |
| `GET /api/recommendations`                                                                        | 登录                           | 兴趣推荐和空闲时间匹配提示                       |
| `GET /api/notifications`、`PATCH /api/notifications/:id/read`、`POST /api/notifications/read-all` | 登录                           | 站内通知                                         |
| `POST /api/reports`                                                                               | 登录                           | 举报                                             |
| `GET /api/admin/reports`、`PATCH /api/admin/reports/:id`、`GET/DELETE /api/admin/activities/:id`  | 管理员                         | 举报和活动管理                                   |
| `POST /api/uploads`                                                                               | 登录                           | 上传活动封面或头像，支持 JPG/PNG/WebP，最大 5 MB |

## 数据表与验证

自动建表共 14 张：`users`、`interests`、`user_interests`、`availability`、`activity_categories`、`activities`、`activity_interests`、`applications`、`favorites`、`notifications`、`reports`、`reviews`、`uploads`、`admin_actions`。活动种类表保存默认封面、图标、排序和启用状态。

### 接口和数据库代码位置

- `server/index.js`：Express 接口路由。认证和权限中间件位于文件顶部，路由按认证、用户、活动、报名、评价、通知和管理功能分组。
- `server/db.js`：SQLite 文件位置、连接设置和 13 张表的结构。新增字段时请注意，`CREATE TABLE IF NOT EXISTS` 不会给已有数据库自动加列；需要配套数据库迁移。
- `server/seed.js`：可选的历史演示种子，用于生成预设账号和图片活动，与当前共享快照不同；已有数据时不建议重复运行，以免重新插入已删除活动或改变活动日期。
- `server/seed-bulk-activities.js`：为 8 个活动分类各写入 4 条演示活动；相同标题会更新，不会重复插入。
- `server/data-files.js`：首次启动恢复共享快照，已有运行库保持不变。
- `scripts/project-data.js`：导出当前数据快照、备份并导入团队共享数据。
- `scripts/fetch-activity-covers.mjs`：从 Wikimedia Commons 下载批量活动封面并生成图片来源与许可清单。
- `src/App.vue`：前端页面状态、交互处理和 API 请求调用。

数据库默认路径为 `server/data/campus-mate.db`，也可以通过 `.env` 中的 `DATABASE_FILE` 指定其他位置。

批量补充活动时依次运行：

```bash
npm run covers:fetch
npm run db:seed:bulk
npm run data:export
```

封面保存在 `server/uploads/bulk-covers/`，来源与许可记录见 `docs/ACTIVITY-COVER-CREDITS.md`。

运行 `npm test` 执行 API 集成测试，运行 `npm run build` 构建前端。测试覆盖登录、报名审核、成员隐私、收藏、通知、统计和管理员权限。

## 演示限制

图片保存在本地磁盘，适合单机演示。联系方式目前返回有权限查看的成员名单，没有私信功能或个人联系方式字段。每周偏好用于推荐匹配提示，不会自动排期。评价开放时间以活动开始时间作为门槛。
