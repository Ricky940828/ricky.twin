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
  loungeVisible?: boolean;
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
  /** 文件夹导入时的库内路径；不用于前台知识库标签。 */
  relativePath?: string;
  title: string;
  sizeBytes: number;
  checksum: string;
  status: KnowledgeDocumentStatus;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
  error?: string;
}

export interface KnowledgeDocumentContent {
  document: KnowledgeDocument;
  content: string;
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
  loungeVisible?: boolean;
}

export interface UpdateKnowledgeBaseInput {
  name?: string;
  description?: string;
  defaultAccess?: KnowledgeAccessLevel;
  ragEnabled?: boolean;
  loungeVisible?: boolean;
}

export interface IngestKnowledgeDocumentInput {
  baseId: string;
  documentId?: string;
  fileName: string;
  relativePath?: string;
  content: string;
}
