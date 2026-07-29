# Ricky 会客厅

`ricky.twin` 是 Ricky 的公开职业主页、数字分身会客厅和轻量管理后台。项目当前已经打通：

- 紫黑视觉前台、职业路线、能力雷达、代表项目和实践入口；
- 前台内容配置、草稿实时预览、保存与正式发布；
- Markdown 知识库、权限标记、有限 RAG 检索和存量文档更新；
- Agent 行为规范、知识库关联、工具权限和使用量限制；
- OpenAI 兼容模型连接、加密保存 API Key、连接测试与主模型切换；
- AI 会客厅、访客浏览、沟通线索和运行记录。

## 本地打开

需要 Node.js 20.9 及以上版本和 pnpm。

```bash
pnpm install
pnpm dev
```

- 前台：`http://localhost:3000`
- 后台：`http://localhost:3000/admin`
- 本地未配置环境变量时，后台密码为 `ricky-local`。

正式环境请将 `.env.example` 复制为 `.env.local`，至少配置：

```text
RICKY_ADMIN_PASSWORD=自定义后台密码
RICKY_ADMIN_SESSION_SECRET=足够长且稳定的会话密钥
RICKY_SECRETS_KEY=足够长且稳定的数据加密密钥
RICKY_CONTENT_DATA_DIR=.ricky-twin-data
```

`RICKY_SECRETS_KEY` 用于加密模型 API Key 和访客联系方式。上线后不要随意更换，否则已有密文将无法解密。

## 推荐配置顺序

1. 在“前台内容”中修改文案、职业阶段、项目和实践入口，右侧会立即显示最终组件效果。
2. 保存草稿，确认桌面、平板和手机预览后发布正式版本。
3. 在“知识库”中新建语义知识库，配置公开/授权/本人权限、是否参与 RAG、是否在会客厅展示。
4. 上传 Markdown；存量资料变化时，在文档旁点击“更新内容”，系统会重新解析和索引。
5. 在“Agent 管理”中关联允许使用的知识库，调整回答规范、可选工具和使用量上限，保存并发布。
6. 在“模型连接”中填写 OpenAI 兼容接口，测试成功后设为会客厅主模型。
7. 用 Agent 测试台验证标准问题，再到公开前台完成一次真实提问。
8. 在“访客与运行”中查看浏览、AI 调用、Token 和沟通线索。

未设置主模型时，前台会明确显示“透明演示”，不会伪装成真实 AI 回答。

## 数据与权限

- V1 数据保存在 `RICKY_CONTENT_DATA_DIR` 指定目录，默认是 `.ricky-twin-data`。
- 原始 Markdown、索引、草稿、正式版本、模型配置和运行记录均不会提交到 Git。
- 匿名访客只能检索公开且已启用 RAG、同时被已发布 Agent 关联的知识库。
- 权限过滤发生在检索之前；模型不会收到访客无权访问的片段。
- 前台不会返回真实文件路径、内部知识库 ID、系统提示词或 API Key。
- 运行记录只保留问题短预览、模式、召回数量、Token、耗时和下一步动作，不保存完整模型回答。

## 当前边界

- 邀请注册、邮箱验证码和按账号授权知识库已预留角色与权限数据结构，但 V1 暂未接入登录服务。
- V1 使用本地文件持久化与轻量词项检索；正式多实例部署时可替换为 PostgreSQL、对象存储和向量检索，前台交互无需重做。
- 当前只支持 Markdown 知识文件，避免复杂格式解析降低知识质量。
- 生产环境需要自行配置真实模型 API Key 和稳定的持久化磁盘。

更详细的运行逻辑见 [Agent 与 RAG 架构说明](docs/architecture/agent-rag-v1.md)。

## 验证

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm test:e2e
```
