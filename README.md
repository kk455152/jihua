# 计划 · Jihua

一个仿滴答清单（TickTick）的本地待办事项管理系统，全栈开源、一键 Docker 部署。

## 功能

- **多视图**：今天、最近 7 天、收件箱、已完成、按清单、按标签
- **任务管理**：创建/编辑/删除/勾选完成、子任务、备注、优先级（高/中/低/无）
- **截止日期与提醒**：精确到分钟
- **清单（项目）**：自定义颜色，未完成数量徽标
- **标签**：彩色标签，多对多关联任务
- **搜索**：按标题/描述全文模糊搜索
- **多用户**：JWT 注册登录，数据按账号隔离
- **响应式 UI**：左中右三栏布局，桌面/平板友好
- **本地部署**：Docker Compose 一键启动，数据持久化在本机

## 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | React 18 + Vite + TailwindCSS + Zustand + React Router + lucide-react + date-fns |
| 后端 | FastAPI + SQLAlchemy 2.0 + Pydantic v2 + JWT (python-jose) + bcrypt |
| 数据库 | PostgreSQL 16 |
| 部署 | Docker + Docker Compose + Nginx |

## 目录结构

```
jihua/
├─ backend/              FastAPI 后端
│  ├─ app/
│  │  ├─ main.py         应用入口（自动建表 + 路由注册）
│  │  ├─ config.py       配置（环境变量）
│  │  ├─ database.py     SQLAlchemy 引擎/Session
│  │  ├─ models.py       ORM 模型
│  │  ├─ schemas.py      Pydantic schema
│  │  ├─ security.py     密码哈希 + JWT
│  │  └─ routers/        auth/projects/tags/tasks 路由
│  ├─ Dockerfile
│  └─ requirements.txt
├─ frontend/             React 前端
│  ├─ src/
│  │  ├─ pages/          Login / Layout
│  │  ├─ components/     Sidebar / TaskList / TaskItem / TaskDetail
│  │  ├─ api.js          axios 实例（自动附带 token）
│  │  ├─ store.js        Zustand 全局状态
│  │  └─ main.jsx
│  ├─ Dockerfile         多阶段构建（node 构建 + nginx 托管）
│  ├─ nginx.conf         反代 /api 到后端
│  └─ package.json
├─ docker-compose.yml    一键启动
├─ .env.example          环境变量示例
└─ README.md
```

## 一键启动

确保已安装 [Docker Desktop](https://www.docker.com/products/docker-desktop/)。

```bash
cd c:/Users/32545/Desktop/plan/jihua
cp .env.example .env      # 修改 SECRET_KEY 为随机字符串
docker compose up -d --build
```

启动完成后访问：

- 前端：<http://localhost:8080>
- 后端 API 文档：<http://localhost:8000/docs>
- PostgreSQL：localhost:5432（用户 `jihua`，密码 `jihua`，库 `jihua`）

第一次访问注册一个账号即可使用。注册时会自动创建「收件箱」「今天」两个默认清单。

## 常用命令

```bash
docker compose up -d --build      # 构建并启动
docker compose logs -f backend    # 看后端日志
docker compose down               # 停止（保留数据）
docker compose down -v            # 停止并清空数据库（慎用）
docker compose restart backend    # 仅重启后端
```

## 本地开发（不用 Docker）

后端：

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # PowerShell：.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
# 需要先有可用 PostgreSQL，或把 DATABASE_URL 改成 sqlite，例如：
# set DATABASE_URL=sqlite:///./jihua.db
uvicorn app.main:app --reload
```

前端：

```bash
cd frontend
npm install
npm run dev
# 默认 dev server: http://localhost:5173, 已配置代理 /api -> http://backend:8000
# 单机调试时把 vite.config.js 中 target 改成 http://localhost:8000
```

## API 概览

所有接口前缀 `/api`，除 `auth/register`、`auth/login`、`health` 外都需要 `Authorization: Bearer <token>`。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | /api/auth/register | 注册 |
| POST | /api/auth/login | 登录 |
| GET | /api/auth/me | 当前用户 |
| GET/POST | /api/projects | 清单列表/新建 |
| PATCH/DELETE | /api/projects/{id} | 更新/删除清单 |
| GET/POST | /api/tags | 标签列表/新建 |
| DELETE | /api/tags/{id} | 删除标签 |
| GET | /api/tasks?view=today\|week\|inbox & project_id & tag_id & search & completed & archived | 任务列表 |
| POST | /api/tasks | 新建任务 |
| GET/PATCH/DELETE | /api/tasks/{id} | 单任务 CRUD |
| POST | /api/tasks/{id}/toggle | 一键切换完成状态 |

## 数据存储

PostgreSQL 数据持久化在 Docker volume `jihua-db-data` 中。卸载需要保留数据时只用 `docker compose down`，不要带 `-v` 参数。

## 安全提醒

- 上线前务必修改 `.env` 中的 `SECRET_KEY`
- 默认 CORS 为 `*`，生产环境请改为前端域名
- 默认数据库密码弱，仅用于本地开发，公网部署请修改 `docker-compose.yml`

## License

MIT
