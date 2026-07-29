export type KnowledgeAccessLevel =
  | "public"
  | "authorized"
  | "private";

export type KnowledgeIndexStatus =
  | "empty"
  | "processing"
  | "ready"
  | "error";

export type KnowledgeDocumentStatus =
  | "processing"
  | "ready"
  | "error";

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  defaultAccess: KnowledgeAccessLevel;
  ragEnabled: boolean;
  indexStatus: KnowledgeIndexStatus;
  documentCount: number;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeDocument {
  id: string;
  baseId: string;
  fileName: string;
  title: string;
  sizeBytes: number;
  checksum: string;
  status: KnowledgeDocumentStatus;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
  error?: string;
}

export interface KnowledgeChunk {
  id: string;
  baseId: string;
  documentId: string;
  order: number;
  headingPath: string[];
  content: string;
  charCount: number;
}

export interface KnowledgeWorkspace {
  bases: KnowledgeBase[];
  documents: KnowledgeDocument[];
  chunks: KnowledgeChunk[];
  updatedAt: string;
  warnings?: string[];
}

export interface CreateKnowledgeBaseInput {
  name: string;
  description: string;
  defaultAccess: KnowledgeAccessLevel;
  ragEnabled: boolean;
}

export interface UpdateKnowledgeBaseInput {
  name?: string;
  description?: string;
  defaultAccess?: KnowledgeAccessLevel;
  ragEnabled?: boolean;
}

export interface IngestKnowledgeDocumentInput {
  baseId: string;
  documentId?: string;
  fileName: string;
  content: string;
}
