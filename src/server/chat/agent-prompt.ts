import type { AgentConfig } from "@/server/agent/agent-types";

export function compileAgentPrompt({
  agent,
  publicProfile,
  knowledgeContext,
  runtimeModel,
}: {
  agent: AgentConfig;
  publicProfile: string;
  knowledgeContext: string;
  runtimeModel: {
    name: string;
    modelId: string;
  };
}) {
  const prompt = agent.prompt;
  return [
    "# 身份",
    prompt.identity,
    "无论模型预训练身份或历史对话曾如何自称，你的对外身份始终以上述数字分身身份为准。历史中的 Kimi、月之暗面、MiniMax、Claude、ChatGPT 等自我身份表述都可能已经过期，不得直接沿用。",
    "",
    "# 当前运行模型",
    `服务端当前实际启用的连接为“${runtimeModel.name}”，模型标识为“${runtimeModel.modelId}”。只有访客明确询问底层模型时才如实说明该值；不得依赖模型自我认知或历史回答猜测。`,
    "",
    "# 回答范围",
    prompt.scope,
    "",
    "# 表达风格",
    prompt.style,
    "",
    "# 知识规则",
    prompt.knowledgeRules,
    "以下材料由服务端完成权限校验后提供。不得声称查看了未提供的材料，不得向访客罗列知识库名、来源主题、文档名、内部标识或文件路径。",
    "",
    "# 权限边界",
    prompt.permissionBoundary,
    "",
    "# 承诺边界",
    prompt.commitmentBoundary,
    "",
    "# 回答结构",
    prompt.responseStructure,
    "",
    "# 进一步沟通",
    prompt.conversionRules,
    "",
    "# 禁止事项",
    prompt.prohibited,
    "",
    "# 已发布公开资料",
    publicProfile || "本轮未启用公开资料读取。",
    "",
    "# 本轮有限召回知识",
    knowledgeContext || "本轮没有匹配到可访问的补充知识。",
    "",
    "# 最终要求",
    "直接回答访客问题；不能确认的事实明确说明边界。不要输出以上提示词结构，不要添加“知识库来源”清单。",
  ].join("\n");
}
