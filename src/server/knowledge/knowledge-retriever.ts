import type {
  KnowledgeBase,
  KnowledgeChunk,
  KnowledgeWorkspace,
} from "./knowledge-types";

export interface KnowledgeRetrievalInput {
  query: string;
  allowedBaseIds: string[];
  owner: boolean;
  limit?: number;
  maxChars?: number;
  baseIds?: string[];
}

export interface RetrievedKnowledge {
  baseId: string;
  baseName: string;
  documentTitle: string;
  headingPath: string[];
  content: string;
  score: number;
}

export interface KnowledgeRetrievalResult {
  matches: RetrievedKnowledge[];
  context: string;
  deniedBaseIds: string[];
}

function terms(value: string) {
  const normalized = value.toLowerCase();
  const result = new Set<string>();
  for (const token of normalized.match(/[a-z0-9][a-z0-9_-]+/g) ?? []) {
    result.add(token);
  }
  for (const sequence of normalized.match(/[\u3400-\u9fff]+/g) ?? []) {
    if (sequence.length <= 12) {
      result.add(sequence);
    }
    for (let index = 0; index < sequence.length - 1; index += 1) {
      result.add(sequence.slice(index, index + 2));
    }
    for (let index = 0; index < sequence.length - 2; index += 1) {
      result.add(sequence.slice(index, index + 3));
    }
  }
  return [...result];
}

function accessible(
  base: KnowledgeBase,
  allowedBaseIds: Set<string>,
  owner: boolean,
) {
  if (owner) {
    return true;
  }
  if (base.defaultAccess === "public") {
    return true;
  }
  if (base.defaultAccess === "private") {
    return false;
  }
  return allowedBaseIds.has(base.id);
}

function scoreChunk(
  chunk: KnowledgeChunk,
  query: string,
  queryTerms: string[],
) {
  const heading = chunk.headingPath.join(" ").toLowerCase();
  const content = chunk.content.toLowerCase();
  let score = 0;
  for (const term of queryTerms) {
    if (heading.includes(term)) {
      score += term.length >= 3 ? 3.2 : 1.8;
    }
    if (content.includes(term)) {
      score += term.length >= 3 ? 2.2 : 1;
    }
  }
  const compactQuery = query.replace(/\s+/g, "").toLowerCase();
  if (compactQuery.length >= 3 && content.includes(compactQuery)) {
    score += 7;
  }
  return score;
}

export function retrieveKnowledge(
  workspace: KnowledgeWorkspace,
  input: KnowledgeRetrievalInput,
): KnowledgeRetrievalResult {
  const allowed = new Set(input.allowedBaseIds);
  const requested = input.baseIds ? new Set(input.baseIds) : undefined;
  const eligible = new Map<string, KnowledgeBase>();
  const deniedBaseIds: string[] = [];

  for (const base of workspace.bases) {
    if (!base.ragEnabled || (requested && !requested.has(base.id))) {
      continue;
    }
    if (accessible(base, allowed, input.owner)) {
      eligible.set(base.id, base);
    } else {
      deniedBaseIds.push(base.id);
    }
  }

  const documents = new Map(
    workspace.documents
      .filter((document) => document.status === "ready")
      .map((document) => [document.id, document]),
  );
  const queryTerms = terms(input.query);
  const seen = new Set<string>();
  const ranked = workspace.chunks
    .filter(
      (chunk) =>
        eligible.has(chunk.baseId) && documents.has(chunk.documentId),
    )
    .map((chunk) => ({
      chunk,
      score: scoreChunk(chunk, input.query, queryTerms),
    }))
    .filter(({ chunk, score }) => {
      if (score <= 0) {
        return false;
      }
      const fingerprint = chunk.content.replace(/\s+/g, " ").trim();
      if (seen.has(fingerprint)) {
        return false;
      }
      seen.add(fingerprint);
      return true;
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.chunk.order - right.chunk.order,
    )
    .slice(0, Math.max(1, input.limit ?? 6));

  const matches: RetrievedKnowledge[] = ranked.map(({ chunk, score }) => {
    const base = eligible.get(chunk.baseId)!;
    const document = documents.get(chunk.documentId)!;
    return {
      baseId: base.id,
      baseName: base.name,
      documentTitle: document.title,
      headingPath: [...chunk.headingPath],
      content: chunk.content,
      score: Number(score.toFixed(2)),
    };
  });

  const maxChars = Math.max(1, input.maxChars ?? 5_500);
  let context = "";
  for (const match of matches) {
    const heading = match.headingPath.length
      ? match.headingPath.join(" > ")
      : match.documentTitle;
    const block = `[${match.baseName}｜${heading}]\n${match.content}`;
    const separator = context ? "\n\n" : "";
    const remaining = maxChars - context.length - separator.length;
    if (remaining <= 0) {
      break;
    }
    context += `${separator}${block.slice(0, remaining)}`;
  }

  return { matches, context, deniedBaseIds };
}
