# Earthworm 项目技术栈与核心代码分析文档

## 一、 项目概览

**Earthworm** 是一个旨在通过造句和连词帮助用户更好学习英语的开源项目。该项目采用了现代化的前后端分离架构，基于 **Node.js** 生态，并使用 **pnpm workspace** 实现了 Monorepo（单体仓库）的多包管理模式。

## 二、 整体技术栈梳理

### 1. 基础设施与工具
*   **包管理器**: `pnpm` (版本 >= 8)。利用 workspace 管理 `apps/`（应用）和 `packages/`（共享依赖包）。
*   **语言**: 全栈 **TypeScript**。
*   **代码规范与格式化**: `Prettier` (配合 `@ianvs/prettier-plugin-sort-imports`, `prettier-plugin-tailwindcss`)，以及 `lint-staged` 用于提交前检查。
*   **构建打包**: Frontend 使用 `Vite` (Nuxt内建)，Backend 使用 `NestJS CLI` (基于 Webpack/swc)，共享包使用 `tsup`。

### 2. 前端技术栈 (`apps/client`)
前端应用是一个现代化的 SSR/SPA 应用。
*   **核心框架**: **Nuxt 3** (基于 **Vue 3** 和 **Vite**)。
*   **状态管理**: **Pinia** (例如 `useUserStore` 用于管理用户登录状态等全局状态)。
*   **样式方案**: **Tailwind CSS**，组件库搭配了 **daisyUI** 和 **@nuxt/ui**，图标使用 `@iconify-json` (通过 Nuxt 模块)。
*   **表单与校验**: `vee-validate` 结合 `yup`。
*   **请求库**: Nuxt 内置的 `ofetch`，并封装了通用的 `getHttp()` 钩子处理 API 调用。
*   **测试**: **Vitest** (用于组件和逻辑的单元测试)、**Cypress** (用于端到端 E2E 测试)、`@vue/test-utils`。
*   **工具库**: `VueUse` (Vue 组合式 API 实用工具集)、`lodash-es`、`dayjs`。
*   **其他特性**: 包含 `canvas-confetti` (撒花动画)、`vue-sonner` (Toast 弹窗提示)。

### 3. 后端技术栈 (`apps/api`)
后端应用是一个提供 RESTful/GraphQL API 的 Node.js 服务。
*   **核心框架**: **NestJS 10** (基于 `Express` 底层)。
*   **参数校验**: `class-validator` 与 `class-transformer` 用于 DTO (Data Transfer Object) 验证。
*   **认证鉴权**: 使用 `@nestjs/jwt`, `jose` 进行 JWT 签发与验证，使用 `argon2` 进行密码哈希加密。
*   **定时任务**: `@nestjs/schedule` 用于执行后台 Cron Job。
*   **文档生成**: `@nestjs/swagger` 自动生成 API 接口文档。
*   **测试**: **Jest** 与 `supertest` (用于单元测试和 E2E 测试)。

### 4. 数据库与持久化层 (`packages/db`, `packages/schema`)
数据库相关的逻辑被抽离成了独立且共享的 packages。
*   **数据库系统**: **SQLite** (通过高性能的 C++ 插件 **`better-sqlite3`** 驱动)。
*   **ORM 框架**: **Drizzle ORM** (一个轻量、Type-Safe 的 TypeScript ORM)。用于管理数据结构、生成 SQL 并在后端进行增删改查。
*   **Schema 定义**: 在 `@earthworm/schema` 包中统一定义了所有的表结构。
*   *(注：原先依赖过的 Redis 现已被移除，转为使用轻量级的内存缓存)*

### 5. 文档网站 (`packages/docs`)
*   **框架**: 基于 **VitePress** 的静态文档站点生成器。

---

## 三、 项目关键目录与代码说明

项目根目录核心被划分为 `apps`（应用层）和 `packages`（公共包/业务组件）。

### 1. Backend API (`apps/api/src`)
NestJS 严格按照模块化划分代码，关键模块包含：
*   **`main.ts`**: 服务启动入口，配置全局拦截器、管道、Swagger 以及监听端口等。
*   **`app/`**: 根模块配置。
*   **`auth/`**: 认证模块，处理用户的注册、登录、Token 发放等逻辑。
*   **`user/`**: 用户中心，处理用户个人信息。
*   **`course/` & `course-pack/`**: 核心业务——课程与课程包的管理。根据 Schema，课程内容要求必须存在 `chinese`, `english`, `soundmark`（音标）字段。
*   **`user-course-progress/` & `course-history/`**: 用户学习进度跟踪以及历史记录管理模块。
*   **`cron-job/`**: 处理定时任务（如数据清理、定时统计）。

### 2. Frontend Client (`apps/client`)
标准的 Nuxt 3 目录结构：
*   **`pages/`**: 路由页面组件。
*   **`components/`**: 可复用的 Vue 组件（避免在此处写纯逻辑或状态请求）。
*   **`composables/`**: Vue 组合式 API 钩子。规范要求将非 UI 逻辑（如状态请求、通用业务逻辑）封装于此。
*   **`store/`**: 基于 Pinia 的全局状态管理，例如存放当前的认证用户等。
*   **`api/` 或 `services/`**: 请求后端的网络接口封装，通过统一的 HTTP 实例调用。
*   **`middleware/`**: Nuxt 路由中间件，例如鉴权路由拦截。

### 3. Database Layer (`packages/schema/src` & `packages/db/src`)
*   **`packages/schema/src/schema/`**: Drizzle 的 Schema 定义所在地，所有的表字段（如用户表、课程表）均以 TypeScript 对象方式在此定义。
*   **`packages/db/src/migrate.ts`**: 用于执行数据库的初始化和表结构的迁移同步。

---

## 四、 开发环境运行流程

根据 `README.md` 的指引，典型的开发工作流如下：

1.  **依赖安装**: 在根目录执行 `pnpm install`。
2.  **环境变量配置**: 将 `apps/api/.env.example` 和 `apps/client/.env.example` 分别复制为 `.env`。
3.  **数据库初始化与填充**:
    *   执行 `pnpm db:init` 初始化 SQLite 数据库的表结构。
    *   执行 `pnpm db:upload` 初始化/导入测试的课程数据。
4.  **启动服务**:
    *   后端开发服务器: `pnpm dev:serve`
    *   前端开发服务器: `pnpm dev:client`
    *   或使用 Docker 一键启动全栈：`docker-compose up -d`
5.  **代码提交**: 开发完成后，必须通过 `pnpm test` (触发 api 与 client 的测试) 以及 `pnpm format-check`，方可成功提交代码。
