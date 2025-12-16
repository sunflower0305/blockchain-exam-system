# 部署指南 - 区块链试卷加密系统

> 本指南帮助你在新电脑上部署该项目

## 目录

1. [环境要求](#1-环境要求)
2. [方式一：Docker 一键部署（推荐）](#2-方式一docker-一键部署推荐)
3. [方式二：本地开发部署](#3-方式二本地开发部署)
4. [初始化数据](#4-初始化数据)
5. [验证部署](#5-验证部署)
6. [常见问题](#6-常见问题)

---

## 1. 环境要求

### 必需软件

| 软件 | 版本要求 | 用途 |
|------|---------|------|
| **Git** | 任意版本 | 克隆代码 |
| **Docker** | 20.10+ | 容器运行 |
| **Docker Compose** | v2.0+ | 容器编排 |

### 可选软件（本地开发）

| 软件 | 版本要求 | 用途 |
|------|---------|------|
| Python | 3.11+ | 后端开发 |
| Node.js | 18+ | 前端开发 |
| PostgreSQL | 15+ | 数据库 |

### 硬件要求

- CPU: 2核+
- 内存: 4GB+ (推荐 8GB)
- 硬盘: 10GB+ 可用空间

---

## 2. 方式一：Docker 一键部署（推荐）

### 2.1 安装 Docker

#### Windows

1. 下载 [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
2. 安装并重启电脑
3. 打开 Docker Desktop，等待启动完成

#### macOS

```bash
# 使用 Homebrew
brew install --cask docker

# 或下载 Docker Desktop for Mac
# https://www.docker.com/products/docker-desktop/
```

#### Linux (Ubuntu/Debian)

```bash
# 安装 Docker
curl -fsSL https://get.docker.com | sh

# 将当前用户添加到 docker 组
sudo usermod -aG docker $USER

# 重新登录或执行
newgrp docker

# 验证安装
docker --version
docker compose version
```

### 2.2 获取项目代码

```bash
# 方式1: Git 克隆（如果有仓库地址）
git clone <仓库地址>
cd blockchain-exam-system

# 方式2: 直接复制项目文件夹到目标电脑
```

### 2.3 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置（可选，默认配置即可运行）
# 如需修改，编辑 .env 文件
```

默认配置已经可以直接使用，无需修改。

### 2.4 启动服务

```bash
# 进入项目目录
cd blockchain-exam-system

# 构建并启动所有服务（首次需要下载镜像，约 5-10 分钟）
docker compose up -d

# 查看服务状态
docker compose ps
```

### 2.5 初始化数据库

```bash
# 等待数据库完全启动（约 10 秒）
sleep 10

# 执行数据库迁移
docker compose exec backend python manage.py migrate

# 创建超级管理员账户
docker compose exec backend python manage.py createsuperuser
# 按提示输入用户名、邮箱、密码
```

### 2.6 访问系统

| 服务 | 地址 | 说明 |
|------|------|------|
| **前端** | http://localhost:3000 | 主界面 |
| **后端 API** | http://localhost:8000/api/v1/ | REST API |
| **Django Admin** | http://localhost:8000/admin/ | 后台管理 |
| **IPFS WebUI** | http://localhost:5001/webui | IPFS 管理 |

### 2.7 停止/重启服务

```bash
# 停止所有服务
docker compose down

# 重启所有服务
docker compose restart

# 查看日志
docker compose logs -f

# 查看特定服务日志
docker compose logs -f backend
docker compose logs -f frontend
```

---

## 3. 方式二：本地开发部署

适合需要修改代码的开发场景。

### 3.1 启动依赖服务

先用 Docker 启动数据库和 Redis：

```bash
# 只启动 postgres, redis, ipfs
docker compose up -d postgres redis ipfs

# 验证服务状态
docker compose ps
```

### 3.2 后端部署

```bash
cd backend

# 创建 Python 虚拟环境
python -m venv venv

# 激活虚拟环境
# Linux/macOS:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 复制环境变量配置
cp .env.example .env

# 数据库迁移
python manage.py migrate

# 创建超级用户
python manage.py createsuperuser

# 启动开发服务器
python manage.py runserver 0.0.0.0:8000
```

### 3.3 前端部署

新开一个终端：

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 3.4 启动 Celery（异步任务）

新开一个终端：

```bash
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate

# 启动 Celery Worker
celery -A exam_system worker -l info
```

---

## 4. 初始化数据

### 4.1 创建测试用户

可以通过 Django Admin 或 API 创建用户。

#### 方式1: Django Admin

1. 访问 http://localhost:8000/admin/
2. 使用超级管理员账户登录
3. 在 Users 表中添加用户

#### 方式2: 使用管理命令

```bash
# Docker 方式
docker compose exec backend python manage.py shell

# 本地方式
python manage.py shell
```

在 shell 中执行：

```python
from apps.users.models import User

# 创建 COE (考试中心) 用户
User.objects.create_user(
    username='coe1',
    password='Coe@123456',
    email='coe@exam.com',
    role='coe',
    department='考试中心'
)

# 创建教师用户
User.objects.create_user(
    username='teacher1',
    password='Teacher@123',
    email='teacher@exam.com',
    role='teacher',
    department='计算机系'
)

# 创建监考用户
User.objects.create_user(
    username='super1',
    password='Super@123',
    email='super@exam.com',
    role='superintendent',
    department='教务处'
)

exit()
```

### 4.2 预置账户（如果存在）

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | Admin@123456 |
| 教师 | teacher1 | Teacher@123 |

---

## 5. 验证部署

### 5.1 检查服务状态

```bash
# 查看所有容器
docker compose ps

# 期望输出：所有服务状态为 Up
NAME            STATUS
exam-postgres   Up (healthy)
exam-redis      Up
exam-ipfs       Up
exam-backend    Up
exam-frontend   Up
exam-celery     Up
exam-nginx      Up
```

### 5.2 测试 API

```bash
# 测试后端健康检查
curl http://localhost:8000/api/v1/

# 测试用户登录
curl -X POST http://localhost:8000/api/v1/users/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123456"}'
```

### 5.3 访问前端

打开浏览器访问 http://localhost:3000，应该看到登录页面。

---

## 6. 常见问题

### Q1: 端口被占用

```bash
# 查看端口占用
# Linux/macOS:
lsof -i :3000
lsof -i :8000

# Windows:
netstat -ano | findstr :3000

# 解决方案：修改 docker-compose.yml 中的端口映射
# 例如将 "3000:3000" 改为 "3001:3000"
```

### Q2: Docker 构建失败

```bash
# 清理并重新构建
docker compose down -v
docker system prune -f
docker compose build --no-cache
docker compose up -d
```

### Q3: 数据库连接失败

```bash
# 检查数据库容器
docker compose logs postgres

# 重启数据库
docker compose restart postgres

# 等待 10 秒后重试
```

### Q4: 前端无法连接后端

检查 `.env` 文件中的 API 地址配置：

```bash
# frontend/.env 或 docker-compose.yml 中
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

如果在局域网内访问，需要改成实际 IP：

```bash
NEXT_PUBLIC_API_URL=http://192.168.x.x:8000/api/v1
```

### Q5: IPFS 连接失败

```bash
# 检查 IPFS 容器
docker compose logs ipfs

# 如果无法使用真实 IPFS，可以使用模拟模式
# 在 docker-compose.yml 的 backend 服务中设置：
IPFS_USE_MOCK=True
```

### Q6: Windows 下 Docker 启动慢

1. 确保启用了 WSL2
2. 在 Docker Desktop 设置中分配足够的内存（建议 4GB+）
3. 将项目放在 WSL 文件系统中可提高性能

### Q7: 如何重置所有数据

```bash
# 停止并删除所有容器和数据卷
docker compose down -v

# 重新启动
docker compose up -d

# 重新初始化数据库
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
```

---

## 7. 快速命令参考

```bash
# ===== 服务管理 =====
docker compose up -d          # 启动所有服务
docker compose down           # 停止所有服务
docker compose restart        # 重启所有服务
docker compose ps             # 查看服务状态
docker compose logs -f        # 查看实时日志

# ===== 数据库操作 =====
docker compose exec backend python manage.py migrate           # 迁移
docker compose exec backend python manage.py createsuperuser   # 创建管理员
docker compose exec backend python manage.py shell             # Django Shell

# ===== 数据库直连 =====
docker exec -it exam-postgres psql -U postgres -d exam_system

# ===== 清理 =====
docker compose down -v                 # 停止并删除数据
docker system prune -f                 # 清理未使用的资源
```

---

## 8. 网络部署（局域网访问）

如果需要让局域网内其他电脑访问：

### 8.1 修改配置

编辑 `docker-compose.yml`，将 frontend 服务的环境变量改为实际 IP：

```yaml
frontend:
  environment:
    - NEXT_PUBLIC_API_URL=http://192.168.1.100:8000/api/v1  # 改为实际IP
```

编辑 backend 配置，允许跨域：

```yaml
backend:
  environment:
    - ALLOWED_HOSTS=*
```

### 8.2 重新构建并启动

```bash
docker compose down
docker compose build frontend
docker compose up -d
```

### 8.3 防火墙设置

确保以下端口开放：
- 3000 (前端)
- 8000 (后端API)
- 5432 (数据库，可选)

---

## 联系方式

如有问题，请联系项目维护者或提交 Issue。
