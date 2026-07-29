# Ricky Twin 知识库与 Agent 轻量运行闭环实施计划

> **目标：** 在现有公开前台和内容后台之上，完成可维护的 Markdown 知识库、有限检索、统一 Agent 行为协议、可替换模型连接和真实会客厅调用，同时保留未来替换 PostgreSQL/pgvector 的窄接口。

## 设计边界

- V1 使用本地原子 JSON 与文件目录，所有持久化通过 Store 接口隔离；部署时可替换为 PostgreSQL/对象存储。
- 只接收 Markdown；不自动读取任意服务器路径，不允许模型修改知识库。
- 权限在检索前过滤，检索结果返回后再次校验。
- 每轮只召回少量片段并受字符预算约束，不把完整知识库加载给模型。
- 只运行一个 Ricky 数字接待 Agent；模型连接与 Agent 规则分离。
- 未配置模型时返回明确的演示模式，不伪装为真实大模型回答。

## Task 1：知识资产协议、解析和有限检索

**Files**

- `src/server/knowledge/knowledge-types.ts`
- `src/server/knowledge/markdown-chunker.ts`
- `src/server/knowledge/knowledge-store.ts`
- `src/server/knowledge/file-knowledge-store.ts`
- `src/server/knowledge/knowledge-retriever.ts`
- 对应单元测试

- [x] 定义知识库、文档、片段、访问级别和索引状态。
- [x] 按 Markdown 标题和字符预算稳定分块，保留标题路径。
- [x] 原子保存知识库元数据、文档原件和索引片段。
- [x] 使用中英文词项、标题加权和去重实现有限召回。
- [x] 验证权限过滤发生在评分前，最终上下文不超过预算。

## Task 2：知识库管理 API 与后台

**Files**

- `src/app/api/admin/knowledge/**`
- `src/components/admin/knowledge/knowledge-manager.tsx`
- `src/components/admin/knowledge/*.tsx`
- `src/app/admin/admin-workspace.tsx`
- `src/components/admin/admin-shell.tsx`

- [x] 新建、修改知识库，维护语义名称、说明、RAG 开关和默认权限。
- [x] 上传或替换 `.md` 文档，展示解析、分块、索引和失败状态。
- [x] 现有知识库提供明确“更新内容”入口。
- [x] 后台导航从占位文字升级为可用模块。

## Task 3：Agent 协议、工具策略与模型连接

**Files**

- `src/server/agent/agent-types.ts`
- `src/server/agent/agent-store.ts`
- `src/server/agent/model-adapter.ts`
- `src/server/agent/agent-orchestrator.ts`
- `src/app/api/admin/agent/**`
- `src/app/api/admin/models/**`
- 对应单元测试

- [x] 将身份、范围、风格、知识规则、边界、结构、转化和禁止事项结构化。
- [x] 工具只允许从注册白名单开启；权限与额度检查为强制工具。
- [x] 模型连接只维护 OpenAI 兼容连接、模型 ID、密钥、启用状态和当前选择。
- [x] API Key 只在服务端保存，管理端仅返回掩码。
- [x] 模型适配器把统一消息协议转换为当前连接格式。

## Task 4：Agent/模型后台与测试台

- [x] 提供结构化 Agent 编辑页、工具权限、知识库关联和默认额度。
- [x] 提供轻量模型连接页、连接测试和设为当前模型。
- [x] 提供标准问题测试台，显示回答模式、召回片段数、耗时和边界动作。
- [x] 保存与发布 Agent 配置分离，保留版本信息。

## Task 5：接通 AI 会客厅

- [x] 新增 `/api/chat`，依次执行输入检查、额度检查、权限计算、有限检索、模型调用和输出边界。
- [x] 匿名访客只使用公开且启用 RAG 的知识库。
- [x] 前台会客厅改为服务端回答；未配置模型时明确显示演示模式。
- [x] 不向前台返回真实路径、内部提示词或原始片段 ID。
- [x] 受限问题返回登录/权限申请动作，适合继续沟通时返回留资动作。

## Task 6：完成运行记录与验收

- [x] 记录匿名会话额度、请求状态、模型、召回数量、Token/耗时和动作。
- [x] 后台可查看基础运行日志，不展示 API Key。
- [x] 单元测试、类型检查、构建全部通过。
- [x] 浏览器完成知识库创建、Markdown 上传、Agent 测试和前台提问闭环。
