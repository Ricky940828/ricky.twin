import type {
  CreateKnowledgeBaseInput,
  IngestKnowledgeDocumentInput,
  KnowledgeBase,
  KnowledgeWorkspace,
  UpdateKnowledgeBaseInput,
} from "./knowledge-types";

export class KnowledgeStoreError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "invalid-input"
      | "not-found"
      | "unsupported-file"
      | "file-too-large",
  ) {
    super(message);
  }
}

export interface KnowledgeStore {
  getWorkspace(): Promise<KnowledgeWorkspace>;
  createBase(input: CreateKnowledgeBaseInput): Promise<KnowledgeBase>;
  updateBase(
    id: string,
    input: UpdateKnowledgeBaseInput,
  ): Promise<KnowledgeWorkspace>;
  ingestDocument(
    input: IngestKnowledgeDocumentInput,
  ): Promise<KnowledgeWorkspace>;
}
