# 数据库与加密算法分析报告

> 生成时间: 2025-12-16

## 1. 数据库配置

### 1.1 基本信息

| 项目 | 值 |
|------|-----|
| **数据库类型** | PostgreSQL 15 |
| **容器名称** | exam-postgres |
| **端口** | 5432 |
| **数据库名** | exam_system |
| **用户名** | postgres |
| **密码** | postgres |
| **Docker镜像** | postgres:15-alpine |

### 1.2 配置文件位置

- Django 配置: `backend/exam_system/settings.py`
- Docker 配置: `docker-compose.yml`
- 环境变量模板: `.env.example`

### 1.3 启动命令

```bash
# 仅启动数据库
docker compose up -d postgres

# 启动全部服务
docker compose up -d
```

---

## 2. 数据库表结构

### 2.1 表清单

| 表名 | 描述 |
|------|------|
| `users` | 用户表 |
| `user_keypairs` | 用户密钥对表 |
| `subjects` | 科目表 |
| `exams` | 考试表 |
| `exam_papers` | 试卷表 |
| `paper_access_logs` | 试卷访问日志表 |

### 2.2 用户表 (users)

```sql
CREATE TABLE users (
    id              BIGINT PRIMARY KEY,
    username        VARCHAR(150) UNIQUE NOT NULL,
    password        VARCHAR(128) NOT NULL,
    email           VARCHAR(254) NOT NULL,
    role            VARCHAR(20) NOT NULL,      -- admin/coe/teacher/superintendent/student
    employee_id     VARCHAR(50) UNIQUE,
    department      VARCHAR(100) NOT NULL,
    phone           VARCHAR(20) NOT NULL,
    sm2_public_key  TEXT NOT NULL,             -- SM2 公钥 (hex格式)
    key_created_at  TIMESTAMP WITH TIME ZONE,  -- 密钥创建时间
    is_superuser    BOOLEAN NOT NULL,
    is_staff        BOOLEAN NOT NULL,
    is_active       BOOLEAN NOT NULL,
    last_login      TIMESTAMP WITH TIME ZONE,
    date_joined     TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL
);
```

### 2.3 用户密钥对表 (user_keypairs)

```sql
CREATE TABLE user_keypairs (
    id                    BIGINT PRIMARY KEY,
    user_id               BIGINT UNIQUE REFERENCES users(id),
    encrypted_private_key TEXT NOT NULL,             -- 加密的 SM2 私钥
    salt                  BYTEA NOT NULL,            -- 32字节盐值 (PBKDF2)
    version               INTEGER NOT NULL CHECK (version >= 0),
    created_at            TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at            TIMESTAMP WITH TIME ZONE NOT NULL
);
```

### 2.4 试卷表 (exam_papers)

```sql
CREATE TABLE exam_papers (
    id                UUID PRIMARY KEY,
    exam_id           UUID REFERENCES exams(id),
    version           INTEGER NOT NULL CHECK (version >= 0),
    original_filename VARCHAR(255) NOT NULL,
    file_size         BIGINT NOT NULL CHECK (file_size >= 0),
    file_hash         VARCHAR(128) NOT NULL,       -- 原始文件 SM3 哈希
    ipfs_hash         VARCHAR(100) NOT NULL,       -- IPFS CID (加密文件)
    encrypted_key     TEXT NOT NULL,               -- SM2 加密的 SM4 密钥
    encryption_iv     VARCHAR(64) NOT NULL,        -- SM4 初始化向量
    unlock_time       TIMESTAMP WITH TIME ZONE,    -- 时间锁 (解密时间)
    blockchain_tx_id  VARCHAR(128) NOT NULL,       -- 区块链交易ID
    block_number      BIGINT CHECK (block_number >= 0),
    status            VARCHAR(20) NOT NULL,        -- draft/uploaded/encrypted/on_chain/selected/decrypted
    uploaded_by_id    BIGINT REFERENCES users(id),
    created_at        TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at        TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE (exam_id, version)
);
```

### 2.5 试卷访问日志表 (paper_access_logs)

```sql
CREATE TABLE paper_access_logs (
    id          BIGINT PRIMARY KEY,
    paper_id    UUID REFERENCES exam_papers(id),
    user_id     BIGINT REFERENCES users(id),
    action      VARCHAR(20) NOT NULL,          -- upload/encrypt/chain/view/download/decrypt
    ip_address  VARCHAR(45),
    user_agent  TEXT,
    details     JSONB,                         -- 详细操作信息
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL
);
```

---

## 3. 加密算法分析

### 3.1 核心结论

| 问题 | 答案 |
|------|------|
| **是否使用 RSA?** | ❌ 否 |
| **实际使用的算法** | ✅ 国密算法 (SM2/SM4/SM3) |

### 3.2 国密算法说明

| 算法 | 类型 | 用途 | 对应国际算法 |
|------|------|------|-------------|
| **SM2** | 非对称加密 (256位椭圆曲线) | 密钥交换、数字签名、加密对称密钥 | RSA/ECDSA |
| **SM4** | 对称加密 (128位分组) | 试卷文件加密、私钥存储加密 | AES |
| **SM3** | 哈希函数 (256位输出) | 文件完整性验证 | SHA-256 |

### 3.3 加密模块位置

```
backend/utils/crypto.py (464行)
├── GMCrypto 类
│   ├── SM2 非对称加密
│   │   ├── generate_sm2_keypair()    # 生成密钥对
│   │   ├── sm2_encrypt()             # 公钥加密
│   │   ├── sm2_decrypt()             # 私钥解密
│   │   ├── sm2_sign()                # 数字签名
│   │   └── sm2_verify()              # 签名验证
│   ├── SM4 对称加密
│   │   ├── generate_sm4_key()        # 生成128位密钥
│   │   ├── generate_iv()             # 生成初始化向量
│   │   ├── sm4_encrypt()             # CBC模式加密
│   │   └── sm4_decrypt()             # CBC模式解密
│   ├── SM3 哈希
│   │   └── sm3_hash()                # 计算哈希值
│   └── 密钥管理
│       ├── derive_key_from_password() # PBKDF2 密钥派生
│       ├── encrypt_private_key()      # 加密私钥
│       ├── decrypt_private_key()      # 解密私钥
│       ├── generate_keypair_for_user() # 为用户生成密钥对
│       └── get_user_private_key()     # 获取用户私钥
├── encrypt_file()                     # 文件加密便捷函数
└── decrypt_file()                     # 文件解密便捷函数
```

### 3.4 依赖库

```
# requirements.txt
gmssl>=3.2.2           # 国密算法实现
pycryptodome>=3.19.0   # 加密原语
cryptography>=41.0.0   # 密码学库 (fallback)
```

---

## 4. 加密流程详解

### 4.1 试卷上传加密流程

```
┌─────────────────────────────────────────────────────────────────┐
│                        试卷上传加密流程                           │
└─────────────────────────────────────────────────────────────────┘

1. 教师上传试卷 PDF
         │
         ▼
┌─────────────────┐
│  原始试卷文件    │
└─────────────────┘
         │
         ├──────────────────────┐
         │                      │
         ▼                      ▼
┌─────────────────┐    ┌─────────────────┐
│ SM3 计算哈希     │    │ 生成随机 SM4    │
│ → file_hash     │    │ 密钥 + IV       │
└─────────────────┘    └─────────────────┘
                               │
                               ▼
                       ┌─────────────────┐
                       │ SM4 CBC 加密    │
                       │ 试卷文件        │
                       └─────────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
         ▼                     ▼                     ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ SM2 公钥加密    │   │ 加密文件上传    │   │ IV 存储到      │
│ SM4 密钥        │   │ 到 IPFS         │   │ 数据库         │
│ → encrypted_key │   │ → ipfs_hash     │   │ → encryption_iv │
└─────────────────┘   └─────────────────┘   └─────────────────┘
         │                     │                     │
         └─────────────────────┼─────────────────────┘
                               │
                               ▼
                       ┌─────────────────┐
                       │ 元数据写入      │
                       │ 区块链 (Fabric) │
                       └─────────────────┘
```

### 4.2 试卷解密流程

```
┌─────────────────────────────────────────────────────────────────┐
│                        试卷解密流程                              │
└─────────────────────────────────────────────────────────────────┘

1. 监考人员请求解密
         │
         ▼
┌─────────────────┐
│ 检查时间锁      │ ← 必须 >= unlock_time
│ (unlock_time)   │
└─────────────────┘
         │ 通过
         ▼
┌─────────────────┐
│ 验证用户密码    │
└─────────────────┘
         │
         ▼
┌─────────────────┐    ┌─────────────────┐
│ PBKDF2 派生密钥 │ ←  │ salt (数据库)   │
└─────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐    ┌─────────────────────┐
│ SM4 解密私钥    │ ←  │ encrypted_private_key│
└─────────────────┘    └─────────────────────┘
         │
         ▼
┌─────────────────┐    ┌─────────────────┐
│ SM2 私钥解密    │ ←  │ encrypted_key    │
│ SM4 密钥        │    │ (数据库)         │
└─────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐    ┌─────────────────┐
│ 从 IPFS 下载    │ ←  │ ipfs_hash       │
│ 加密文件        │    │ (数据库)         │
└─────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐    ┌─────────────────┐
│ SM4 CBC 解密    │ ←  │ encryption_iv    │
│ 试卷文件        │    │ (数据库)         │
└─────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐    ┌─────────────────┐
│ SM3 验证哈希    │ ←  │ file_hash       │
│ (完整性检查)    │    │ (区块链)         │
└─────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐
│ 返回解密试卷    │
│ 记录访问日志    │
└─────────────────┘
```

---

## 5. 私钥安全存储机制

### 5.1 存储流程

```python
# 1. 生成 SM2 密钥对
private_key, public_key = generate_sm2_keypair()

# 2. 生成随机盐值 (32字节)
salt = os.urandom(32)

# 3. 使用 PBKDF2 从用户密码派生加密密钥
derived_key = PBKDF2(password, salt, iterations=100000)

# 4. 将派生密钥拆分
sm4_key = derived_key[:16]  # 前16字节作为SM4密钥
iv = derived_key[16:32]     # 后16字节作为IV

# 5. 使用 SM4 加密私钥
encrypted_private_key = SM4_CBC_Encrypt(private_key, sm4_key, iv)

# 6. 存储到数据库
KeyPair.objects.create(
    user=user,
    encrypted_private_key=encrypted_private_key.hex(),
    salt=salt,
    version=1
)
```

### 5.2 安全特性

| 特性 | 实现 |
|------|------|
| **密钥派生** | PBKDF2-HMAC-SHA256, 100,000次迭代 |
| **盐值** | 每用户独立32字节随机盐 |
| **私钥加密** | SM4-CBC |
| **版本控制** | 支持密钥轮换 |

---

## 6. 数据库查询示例

### 6.1 连接数据库

```bash
# 通过 Docker 进入 psql
docker exec -it exam-postgres psql -U postgres -d exam_system

# 或使用外部客户端
psql -h localhost -p 5432 -U postgres -d exam_system
```

### 6.2 常用查询

```sql
-- 查看所有表
\dt

-- 查看表结构
\d users
\d exam_papers
\d user_keypairs

-- 查询用户及其密钥信息
SELECT u.id, u.username, u.role,
       LEFT(u.sm2_public_key, 32) || '...' as public_key_preview,
       k.version as key_version
FROM users u
LEFT JOIN user_keypairs k ON u.id = k.user_id;

-- 查询试卷加密信息
SELECT id, original_filename, status,
       LEFT(file_hash, 16) || '...' as hash_preview,
       LEFT(encrypted_key, 32) || '...' as enc_key_preview,
       unlock_time
FROM exam_papers;

-- 查询试卷访问日志
SELECT p.original_filename, u.username, l.action, l.created_at
FROM paper_access_logs l
JOIN exam_papers p ON l.paper_id = p.id
JOIN users u ON l.user_id = u.id
ORDER BY l.created_at DESC;
```

---

## 7. 总结

### 7.1 关键技术点

1. **国密算法**: 使用 SM2/SM4/SM3 替代 RSA/AES/SHA256，符合中国国家密码标准
2. **混合加密**: SM4 对称加密文件内容，SM2 非对称加密密钥
3. **密钥保护**: 用户私钥使用密码派生密钥加密存储
4. **时间锁**: 试卷仅在设定时间后可解密
5. **完整性验证**: SM3 哈希确保文件未被篡改
6. **审计追踪**: 所有操作记录在数据库和区块链

### 7.2 存储层次

| 存储位置 | 内容 |
|---------|------|
| **PostgreSQL** | 用户信息、密钥对、试卷元数据、访问日志 |
| **IPFS** | 加密后的试卷文件 |
| **Hyperledger Fabric** | 试卷哈希、时间锁、操作记录 (不可篡改) |
| **Redis** | 会话缓存、异步任务队列 |
