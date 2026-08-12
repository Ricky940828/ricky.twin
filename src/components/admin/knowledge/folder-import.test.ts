import { describe, expect, it } from "vitest";

import { groupMarkdownFolderFiles } from "./folder-import";

function folderFile(name: string, relativePath: string) {
  const file = new File([`# ${name}`], name, {
    type: "text/markdown",
  });
  Object.defineProperty(file, "webkitRelativePath", {
    configurable: true,
    value: relativePath,
  });
  return file;
}

describe("groupMarkdownFolderFiles", () => {
  it("以最外层文件夹建立知识库，并保留内部相对路径", () => {
    const result = groupMarkdownFolderFiles([
      folderFile("总览.md", "职业资料/总览.md"),
      folderFile("能力.md", "职业资料/方法论/能力.md"),
      folderFile("说明.txt", "职业资料/说明.txt"),
    ]);

    expect(result.groups).toEqual([
      {
        rootName: "职业资料",
        files: [
          expect.objectContaining({ relativePath: "总览.md" }),
          expect.objectContaining({ relativePath: "方法论/能力.md" }),
        ],
      },
    ]);
    expect(result.skipped).toEqual([
      expect.objectContaining({ relativePath: "说明.txt" }),
    ]);
  });

  it("支持一次识别多个最外层文件夹且不把里层目录展示为知识库", () => {
    const result = groupMarkdownFolderFiles([
      folderFile("A.md", "金融产品/案例/A.md"),
      folderFile("B.MD", "AI实践/智能体/B.MD"),
    ]);

    expect(result.groups.map((group) => group.rootName)).toEqual([
      "金融产品",
      "AI实践",
    ]);
    expect(result.groups[0]?.files[0]?.relativePath).toBe("案例/A.md");
    expect(result.groups[1]?.files[0]?.relativePath).toBe("智能体/B.MD");
  });
});
