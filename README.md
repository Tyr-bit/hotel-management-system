# 酒店管理系统 - 权限管理模块

> 基于 React + Flask 的全栈 Web 应用，负责系统权限管理、用户认证与角色控制

## 模块概述

本模块是酒店管理系统的**权限管理模块**（模块A），是保证系统安全运行的基础模块。面向系统管理员、前台人员和普通用户，不同用户登录系统后，根据其角色权限进入对应的功能页面，防止越权操作。

系统采用前后端分离架构：
- **前端**：React 19 + Vite + React Router + Axios
- **后端**：Flask + PyMySQL + JWT 认证
- **数据库**：MySQL 8.0

---

## 核心功能

### 1. 用户注册（Register）
- 填写用户名、密码、联系电话进行账号注册
- 注册成功后自动分配 `USER`（普通用户）角色
- 后端对用户名做唯一性校验

### 2. 用户登录（Login）
- 输入用户名和密码进行身份认证
- 后端使用 **JWT（JSON Web Token）** 进行身份验证
- 登录成功后 Token 存入 `localStorage`，有效期 24 小时
- 登录页面采用蓝白配色 + 玻璃拟态设计，视觉效果优雅

### 3. 权限控制与路由守卫
- 实现多种路由守卫组件：
  - `LoginRoute`：未登录用户拦截到登录页
  - `AdminRoute`：仅管理员可访问后台管理
  - `ManagerRoute` / `StaffRoute`：按角色控制页面访问权限
- 无权限访问时展示 `403` 友好提示页面（`NoPermission.jsx`）

### 4. 用户列表与权限管理（UserManage）
- **用户列表展示**：显示用户名、手机号、角色、状态，支持角色标签彩色区分
- **角色管理**：支持 5 种角色切换（管理员/前台经理/前台员工/入住办理/普通用户），每种角色有专属标签颜色
- **账号状态管理**：管理员可一键启用/禁用账号
- **新增用户**：弹窗表单，支持设置用户名、密码、手机号、角色、状态
- **编辑用户**：修改用户信息，密码可选修改
- **删除用户**：逻辑删除，保护数据安全

## 后端 API 接口

| 接口 | 方法 | 功能 |
|------|------|------|
| `/api/auth/register` | POST | 用户注册 |
| `/api/auth/login` | POST | 用户登录（返回 JWT Token） |
| `/api/users` | GET | 获取用户列表 |
| `/api/users` | POST | 新增用户 |
| `/api/users/{id}` | PUT | 编辑用户信息 |
| `/api/users/{id}` | DELETE | 删除用户 |
| `/api/users/{id}/role` | PUT | 修改用户角色 |
| `/api/users/{id}/status` | PUT | 修改用户状态 |

## 角色定义与权限

| 角色代码 | 中文名称 | 标签颜色 | 权限说明 |
|----------|----------|----------|----------|
| ADMIN | 管理员 | 红色 | 可访问所有页面，管理用户权限 |
| MANAGER | 前台经理 | 蓝色 | 管理客房、查看客户信息 |
| STAFF | 前台员工 | 灰色 | 前台日常操作 |
| CHECKIN | 入住办理 | 青色 | 办理入住、换房、结账 |
| USER | 普通用户 | 默认色 | 查看个人信息、预订房间 |

---

## 技术栈

### 前端
- React 19
- Vite（构建工具）
- React Router DOM（路由管理）
- Axios（HTTP 请求）
- React Icons（图标库）

### 后端
- Python 3.13+
- Flask（Web 框架）
- Flask-CORS（跨域支持）
- PyMySQL（MySQL 驱动）
- python-dotenv（环境变量管理）
- PyJWT（JWT 认证）

### 数据库
- MySQL 8.0
- 数据库名：`hotel_system`

---

## 项目结构

```
hotel-management-system/
├── hotel-frontend/          # React 前端项目
│   ├── src/
│   │   ├── api/
│   │   │   └── request.js       # API 请求封装
│   │   ├── components/
│   │   │   ├── AdminRoute.jsx   # 管理员路由守卫
│   │   │   ├── LoginRoute.jsx   # 登录路由守卫
│   │   │   ├── ManagerRoute.jsx # 经理路由守卫
│   │   │   └── StaffRoute.jsx   # 员工路由守卫
│   │   ├── pages/
│   │   │   ├── Login.jsx        # 登录页
│   │   │   ├── Register.jsx     # 注册页
│   │   │   ├── UserManage.jsx   # 用户管理页
│   │   │   ├── Admin.jsx        # 管理员控制台
│   │   │   └── NoPermission.jsx # 无权限提示页
│   │   ├── router/
│   │   │   └── index.jsx        # 路由配置
│   │   ├── App.jsx
│   │   ├── App.css              # 全局样式（含角色标签样式）
│   │   └── main.jsx
│   ├── package.json
│   └── index.html
│
├── hotel-backend/           # Flask 后端项目
│   ├── app.py               # 后端主程序
│   ├── init.sql             # 数据库初始化脚本
│   └── .env                 # 环境变量配置
│
└── README.md
```

---

## 运行方式

### 1. 初始化数据库

```bash
cd hotel-backend
mysql -u root -p < init.sql
```

### 2. 启动后端服务

```bash
cd hotel-backend
pip install flask flask-cors pymysql python-dotenv
python app.py
```

后端服务默认运行在 `http://127.0.0.1:5000`

### 3. 启动前端服务

```bash
cd hotel-frontend
npm install
npm run dev
```

前端服务默认运行在 `http://localhost:5173`

---

## 数据库表结构

### 用户表（user）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT AUTO_INCREMENT | 主键 |
| username | VARCHAR(50) | 用户名（唯一） |
| password | VARCHAR(100) | 密码 |
| phone | VARCHAR(20) | 联系电话 |
| role | ENUM | 角色：ADMIN/MANAGER/STAFF/CHECKIN/USER |
| status | TINYINT | 状态：1启用/0禁用 |
| deleted | TINYINT | 逻辑删除标记 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

---

## 我的工作总结

本模块为酒店管理系统课程设计中的**权限管理模块**，由我（屠韵如）独立完成开发，包括：

1. **前端页面**：登录页、注册页、管理员控制台、用户管理页、无权限提示页
2. **后端接口**：用户注册、登录认证（JWT）、用户信息 CRUD、角色管理、状态管理
3. **路由守卫**：多层级权限控制，确保不同角色只能访问其授权页面
4. **界面设计**：蓝白配色 + 玻璃拟态风格，视觉效果优雅统一
5. **数据库设计**：用户账号管理 E-R 图及用户表结构设计

系统实现了完整的权限控制体系，为酒店业务的安全运行提供了基础保障。
