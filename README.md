# Campus Mate 校园搭子

本地演示用的校园活动搭子平台。前端使用 Vue 3、Vite、Element Plus；后端使用 Node.js、Express、Node 内置 SQLite、JWT。无需单独安装数据库。

## 快速启动

需要 Node.js 22.13 或更新版本，以及 npm。Windows 用户可以双击 `start.bat`；也可以在项目目录运行：

```powershell
npm install
npm run db:seed
npm run dev
```

打开 <http://localhost:5173/>。API 默认运行在端口 3002，Vite 会自动代理 API 和图片请求。若端口冲突，可修改 `.env` 中的 `PORT`，并同步修改 `vite.config.js` 中的代理端口。

演示账号：`alice@campus.test / mate1234`、`bo@campus.test / mate1234`、`mei@campus.test / mate1234`；管理员：`admin@campus.test / admin123`。图片活动用户：`chenxi@campus.test`、`linan@campus.test`、`yueyue@campus.test`、`shiyu@campus.test`、`haoran@campus.test`、`qinghe@campus.test`，初始密码均为 `12345678`。

请勿在公开部署时使用演示账号或默认 JWT 密钥。复制 `.env.example` 为 `.env` 并设置随机 `JWT_SECRET`。数据库默认写入 `server/data/campus-mate.db`，上传图片位于 `server/uploads/`。

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
- `server/seed.js`：兴趣标签、演示账号和 50 条推荐活动。演示活动会在重复执行时刷新到未来日期，不会重复插入；种子账号使用 `INSERT OR IGNORE`，不会覆盖已有用户密码。
- `src/App.vue`：前端页面状态、交互处理和 API 请求调用。

数据库默认路径为 `server/data/campus-mate.db`，也可以通过 `.env` 中的 `DATABASE_FILE` 指定其他位置。

运行 `npm test` 执行 API 集成测试，运行 `npm run build` 构建前端。测试覆盖登录、报名审核、成员隐私、收藏、通知、统计和管理员权限。

## 演示限制

图片保存在本地磁盘，适合单机演示。联系方式目前返回有权限查看的成员名单，没有私信功能或个人联系方式字段。每周偏好用于推荐匹配提示，不会自动排期。评价开放时间以活动开始时间作为门槛。
