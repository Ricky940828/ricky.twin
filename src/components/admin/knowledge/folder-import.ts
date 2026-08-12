export interface MarkdownFolderFile {
  file: File;
  relativePath: string;
}

export interface MarkdownFolderGroup {
  rootName: string;
  files: MarkdownFolderFile[];
}

export interface MarkdownFolderImportPlan {
  groups: MarkdownFolderGroup[];
  skipped: MarkdownFolderFile[];
}

function normalizeRelativePath(value: string) {
  return value
    .replaceAll("\\", "/")
    .split("/")
    .filter(Boolean)
    .join("/");
}

export function groupMarkdownFolderFiles(
  files: Iterable<File>,
): MarkdownFolderImportPlan {
  const groups = new Map<string, MarkdownFolderGroup>();
  const skipped: MarkdownFolderFile[] = [];

  for (const file of files) {
    const path = normalizeRelativePath(
      file.webkitRelativePath || file.name,
    );
    const parts = path.split("/");
    const fromFolder = parts.length > 1;
    const rootName = fromFolder ? parts[0] : "";
    const relativePath = fromFolder
      ? parts.slice(1).join("/")
      : file.name;
    const item = { file, relativePath };

    if (!rootName || !/\.md$/i.test(file.name)) {
      skipped.push(item);
      continue;
    }

    const current = groups.get(rootName) ?? {
      rootName,
      files: [],
    };
    current.files.push(item);
    groups.set(rootName, current);
  }

  return { groups: Array.from(groups.values()), skipped };
}
