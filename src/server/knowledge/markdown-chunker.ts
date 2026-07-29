export interface MarkdownChunkDraft {
  order: number;
  headingPath: string[];
  content: string;
  charCount: number;
}

export interface MarkdownChunkerOptions {
  maxChars?: number;
}

interface MarkdownSection {
  headingPath: string[];
  paragraphs: string[];
}

function splitLongText(value: string, maxChars: number) {
  const parts: string[] = [];
  let remaining = value;
  while (remaining.length > maxChars) {
    const window = remaining.slice(0, maxChars);
    const minimum = Math.floor(maxChars * 0.55);
    const candidates = [
      window.lastIndexOf("。"),
      window.lastIndexOf("！"),
      window.lastIndexOf("？"),
      window.lastIndexOf("；"),
      window.lastIndexOf("\n"),
      window.lastIndexOf(". "),
    ].filter((index) => index >= minimum);
    const boundary =
      candidates.length > 0 ? Math.max(...candidates) + 1 : maxChars;
    parts.push(remaining.slice(0, boundary));
    remaining = remaining.slice(boundary);
  }
  if (remaining) {
    parts.push(remaining);
  }
  return parts;
}

function parseSections(markdown: string): MarkdownSection[] {
  const sections: MarkdownSection[] = [];
  const headings: string[] = [];
  let paragraphs: string[] = [];
  let paragraphLines: string[] = [];
  let inCodeFence = false;

  const flushParagraph = () => {
    const paragraph = paragraphLines.join("\n").trim();
    if (paragraph) {
      paragraphs.push(paragraph);
    }
    paragraphLines = [];
  };

  const flushSection = () => {
    flushParagraph();
    if (paragraphs.length > 0) {
      sections.push({
        headingPath: headings.filter(Boolean),
        paragraphs,
      });
    }
    paragraphs = [];
  };

  for (const rawLine of markdown.replaceAll("\r\n", "\n").split("\n")) {
    const line = rawLine.replace(/\s+$/, "");
    if (line.trimStart().startsWith("```")) {
      inCodeFence = !inCodeFence;
      paragraphLines.push(line);
      continue;
    }

    const heading = !inCodeFence
      ? /^(#{1,6})\s+(.+?)\s*$/.exec(line)
      : null;
    if (heading) {
      flushSection();
      const level = heading[1].length;
      headings.length = level;
      headings[level - 1] = heading[2].trim();
      continue;
    }

    if (!inCodeFence && line.trim() === "") {
      flushParagraph();
      continue;
    }
    paragraphLines.push(line);
  }
  flushSection();
  return sections;
}

export function chunkMarkdown(
  markdown: string,
  options: MarkdownChunkerOptions = {},
): MarkdownChunkDraft[] {
  const maxChars = Math.max(80, options.maxChars ?? 1_200);
  const chunks: Omit<MarkdownChunkDraft, "order">[] = [];

  for (const section of parseSections(markdown)) {
    let current = "";
    const flushCurrent = () => {
      if (!current) {
        return;
      }
      chunks.push({
        headingPath: [...section.headingPath],
        content: current,
        charCount: current.length,
      });
      current = "";
    };

    for (const paragraph of section.paragraphs) {
      if (paragraph.length > maxChars) {
        flushCurrent();
        for (const part of splitLongText(paragraph, maxChars)) {
          chunks.push({
            headingPath: [...section.headingPath],
            content: part,
            charCount: part.length,
          });
        }
        continue;
      }

      const joined = current ? `${current}\n\n${paragraph}` : paragraph;
      if (joined.length > maxChars) {
        flushCurrent();
        current = paragraph;
      } else {
        current = joined;
      }
    }
    flushCurrent();
  }

  return chunks.map((chunk, order) => ({ ...chunk, order }));
}
