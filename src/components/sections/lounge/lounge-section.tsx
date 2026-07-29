"use client";

import {
  ArrowRight,
  Check,
  Database,
  LockKeyhole,
  MessageCircle,
  Send,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import {
  useEffect,
  useReducer,
  useState,
  type FormEvent,
} from "react";

import { CharacterVideo } from "@/components/character/character-video";
import { MagicRings } from "@/components/motion/magic-rings";
import type { KnowledgeBadge, LoungeContent } from "@/content/types";
import { useIntersectionActive } from "@/hooks/use-intersection-active";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

import {
  initialLoungeState,
  loungeReducer,
  type LoungeMessage,
} from "./lounge-model";

interface LoungeSectionProps {
  content: LoungeContent;
}

function KnowledgeStatus({
  knowledge,
  onRequestAccess,
}: {
  knowledge: KnowledgeBadge;
  onRequestAccess: () => void;
}) {
  return (
    <article className="knowledge-status">
      <div className="knowledge-status__icon">
        {knowledge.access === "request" ? (
          <LockKeyhole aria-hidden size={17} />
        ) : (
          <Database aria-hidden size={17} />
        )}
      </div>
      <div>
        <strong>{knowledge.name}</strong>
        <p>{knowledge.description}</p>
      </div>
      {knowledge.access === "request" ? (
        <button
          aria-label={`申请访问：${knowledge.name}`}
          onClick={onRequestAccess}
          type="button"
        >
          {knowledge.accessLabel}
        </button>
      ) : (
        <span data-access={knowledge.access}>
          <i aria-hidden="true" />
          {knowledge.accessLabel}
        </span>
      )}
    </article>
  );
}

function ChatMessage({
  message,
  onRequestAccess,
  onLeaveContact,
}: {
  message: LoungeMessage;
  onRequestAccess: () => void;
  onLeaveContact: () => void;
}) {
  return (
    <article
      className="lounge-message"
      data-role={message.role}
      data-testid={
        message.role === "assistant" && message.id !== "welcome"
          ? "lounge-answer"
          : `lounge-message-${message.role}`
      }
    >
      <span className="lounge-message__avatar">
        {message.role === "assistant" ? "R" : <UserRound aria-hidden size={14} />}
      </span>
      <div>
        <p>{message.text}</p>
        {message.boundary ? (
          <small>
            <ShieldCheck aria-hidden size={13} />
            {message.boundary}
          </small>
        ) : null}
        {message.nextAction === "request-access" ? (
          <button onClick={onRequestAccess} type="button">
            申请更多知识权限
            <ArrowRight aria-hidden size={14} />
          </button>
        ) : null}
        {message.nextAction === "leave-contact" ? (
          <button onClick={onLeaveContact} type="button">
            进一步沟通
            <ArrowRight aria-hidden size={14} />
          </button>
        ) : null}
      </div>
    </article>
  );
}

function PermissionDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="lounge-modal-overlay" role="presentation">
      <dialog aria-label="申请更多知识权限" className="lounge-modal" open>
        <button
          aria-label="关闭权限申请"
          className="lounge-modal__close"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden size={18} />
        </button>
        <span className="lounge-modal__eyebrow">KNOWLEDGE ACCESS</span>
        <h2>申请更多知识权限</h2>
        <p>
          深度能力、方法和案例会按账号授权。正式流程将在受邀登录后选择知识库并提交申请原因。
        </p>
        <label>
          希望了解的方向
          <select defaultValue="金融产品与机构业务">
            <option>金融产品与机构业务</option>
            <option>AI 应用与知识资产化</option>
            <option>合作与职业交流</option>
          </select>
        </label>
        <label>
          申请说明
          <textarea placeholder="简单说明你的身份和希望了解的内容" />
        </label>
        <button className="button-primary" onClick={onClose} type="button">
          受邀登录后申请
          <ArrowRight aria-hidden size={16} />
        </button>
      </dialog>
    </div>
  );
}

function LeadDialog({ onClose }: { onClose: () => void }) {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="lounge-modal-overlay" role="presentation">
      <dialog aria-label="留下联系方式" className="lounge-modal" open>
        <button
          aria-label="关闭联系方式表单"
          className="lounge-modal__close"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden size={18} />
        </button>
        <span className="lounge-modal__eyebrow">KEEP IN TOUCH</span>
        <h2>留下联系方式</h2>
        {submitted ? (
          <div className="lounge-modal__success">
            <Check aria-hidden size={24} />
            <strong>原型流程已完成</strong>
            <p>正式接入后，这条沟通线索会进入后台的线索管理。</p>
            <button className="button-secondary" onClick={onClose} type="button">
              返回会客厅
            </button>
          </div>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setSubmitted(true);
            }}
          >
            <div className="lounge-modal__row">
              <label>
                怎么称呼
                <input name="name" placeholder="你的称呼" required />
              </label>
              <label>
                机构或角色
                <input name="role" placeholder="公司 / 职位 / 身份" />
              </label>
            </div>
            <label>
              联系方式
              <input
                name="contact"
                placeholder="邮箱、微信或其他联系方式"
                required
              />
            </label>
            <label>
              沟通方向
              <textarea
                name="direction"
                placeholder="合作、岗位、产品交流或 AI 实践"
              />
            </label>
            <label className="lounge-modal__consent">
              <input name="privacy" required type="checkbox" />
              同意仅将上述信息用于本次进一步沟通
            </label>
            <button className="button-primary" type="submit">
              提交沟通意向
              <ArrowRight aria-hidden size={16} />
            </button>
          </form>
        )}
      </dialog>
    </div>
  );
}

export function LoungeSection({ content }: LoungeSectionProps) {
  const [state, dispatch] = useReducer(loungeReducer, initialLoungeState);
  const [input, setInput] = useState("");
  const [permissionOpen, setPermissionOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const { ref, active } = useIntersectionActive<HTMLElement>({
    threshold: 0.12,
  });

  useEffect(() => {
    if (state.status !== "thinking") {
      return;
    }
    const timer = window.setTimeout(() => {
      dispatch({ type: "resolve" });
    }, 520);
    return () => window.clearTimeout(timer);
  }, [state.status, state.pendingQuestion]);

  useEffect(() => {
    if (!permissionOpen && !leadOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPermissionOpen(false);
        setLeadOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [leadOpen, permissionOpen]);

  useEffect(() => {
    const openContact = () => setLeadOpen(true);
    window.addEventListener("ricky:open-contact", openContact);
    return () => window.removeEventListener("ricky:open-contact", openContact);
  }, []);

  const submitQuestion = (question: string) => {
    if (!question.trim() || state.status === "thinking") {
      return;
    }
    dispatch({ type: "submit", question });
    setInput("");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitQuestion(input);
  };

  return (
    <section ref={ref} className="lounge-section site-section" id="lounge">
      <div className="lounge-section__intro">
        <span className="eyebrow">{content.eyebrow}</span>
        <h2
          className="section-title lounge-section__glitch"
          data-text="AI 会客厅"
        >
          AI 会客厅
        </h2>
        <p className="section-copy">{content.intro}</p>
      </div>

      <div className="lounge-status-bar glass-panel">
        <div className="lounge-online">
          <span aria-hidden="true" />
          数字分身在线
        </div>
        <div className="lounge-visitor">
          <UserRound aria-hidden size={15} />
          当前访客：匿名
        </div>
        <div className="lounge-status-bar__hint">
          知识范围与权限由后台配置
        </div>
      </div>

      <div className="knowledge-status-grid">
        {content.knowledge.map((knowledge) => (
          <KnowledgeStatus
            key={knowledge.id}
            knowledge={knowledge}
            onRequestAccess={() => setPermissionOpen(true)}
          />
        ))}
      </div>

      <div className="lounge-stage">
        <div className="lounge-avatar-panel glass-panel">
          <MagicRings
            active={active}
            pulseKey={state.pulseKey}
            reducedMotion={reducedMotion}
          />
          <div className="lounge-avatar-panel__character">
            <CharacterVideo active={active} scene="lounge" />
          </div>
          <div className="lounge-avatar-panel__caption">
            <span>RICKY.TWIN / RECEPTION</span>
            <strong>可以从一个真实问题开始。</strong>
            <p>当前为高完成度交互原型，回答由本地预设逻辑模拟。</p>
          </div>
        </div>

        <div className="lounge-chat glass-panel">
          <div className="lounge-chat__header">
            <div>
              <MessageCircle aria-hidden size={17} />
              <span>
                <strong>Ricky 数字接待台</strong>
                <small>SIMULATED AGENT · V1</small>
              </span>
            </div>
            <button
              aria-label="留下联系方式进一步沟通"
              onClick={() => setLeadOpen(true)}
              type="button"
            >
              进一步沟通
            </button>
          </div>

          <div aria-live="polite" className="lounge-chat__messages">
            {state.messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onLeaveContact={() => setLeadOpen(true)}
                onRequestAccess={() => setPermissionOpen(true)}
              />
            ))}
            {state.status === "thinking" ? (
              <div
                aria-label="数字分身正在思考"
                className="lounge-thinking"
              >
                <span />
                <span />
                <span />
              </div>
            ) : null}
          </div>

          <div className="lounge-quick-questions">
            {content.quickQuestions.map((question) => (
              <button
                key={question}
                disabled={state.status === "thinking"}
                onClick={() => submitQuestion(question)}
                type="button"
              >
                {question}
                <ArrowRight aria-hidden size={13} />
              </button>
            ))}
          </div>

          <form className="lounge-input" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="lounge-question">
              输入你想了解的问题
            </label>
            <input
              id="lounge-question"
              onChange={(event) => setInput(event.target.value)}
              placeholder={content.inputPlaceholder}
              value={input}
            />
            <button
              aria-label={content.sendLabel}
              disabled={!input.trim() || state.status === "thinking"}
              type="submit"
            >
              <Send aria-hidden size={18} />
            </button>
          </form>

          <div className="lounge-chat__boundary">
            <ShieldCheck aria-hidden size={14} />
            不作合作承诺、不报价；私密材料需登录后申请权限。
          </div>
        </div>
      </div>

      {permissionOpen ? (
        <PermissionDialog onClose={() => setPermissionOpen(false)} />
      ) : null}
      {leadOpen ? <LeadDialog onClose={() => setLeadOpen(false)} /> : null}
    </section>
  );
}
