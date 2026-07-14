const MIN_IMAGE_WIDTH = 80;
const MAX_IMAGE_WIDTH = 1600;
const IMAGE_WIDTH_MARKER = "gymchelin-width=";

type HtmlToken = {
  type: string;
  tagName?: string;
  attributes?: Record<string, unknown>;
  [key: string]: unknown;
};

type MarkdownImageNode = {
  title?: string | null;
};

type HtmlRendererContext = {
  origin?: () => HtmlToken | HtmlToken[] | null;
};

type WysiwygImageNode = {
  attrs: Record<string, unknown>;
  type: unknown;
};

type MarkdownRendererResult = {
  attrs?: Record<string, unknown> | null;
  rawHTML?: string | string[] | null;
  [key: string]: unknown;
};

type MarkdownRendererContext = {
  origin?: () => MarkdownRendererResult;
};

type WysiwygNodeInfo = {
  node: WysiwygImageNode;
};

type WysiwygEditorView = {
  dispatch: (transaction: unknown) => void;
  dom: HTMLElement;
  state: {
    tr: {
      setNodeMarkup: (position: number, type: null, attrs: Record<string, unknown>) => unknown;
    };
  };
};

type MarkdownRange = {
  start: number;
  end: number;
};

type LineIndent = {
  columns: number;
  offset: number;
};

type ListMarker = {
  contentOffset: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clampImageWidth(value: number, maxWidth = MAX_IMAGE_WIDTH) {
  return Math.min(Math.max(Math.round(value), MIN_IMAGE_WIDTH), Math.max(MIN_IMAGE_WIDTH, maxWidth));
}

function parseImageWidth(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const width = Number(value);

  if (!Number.isFinite(width) || width < MIN_IMAGE_WIDTH) {
    return null;
  }

  return clampImageWidth(width);
}

function getWidthFromTitle(title?: string | null) {
  if (!title?.startsWith(IMAGE_WIDTH_MARKER)) {
    return null;
  }

  return parseImageWidth(title.slice(IMAGE_WIDTH_MARKER.length));
}

function removeImageWidthMarkers(imageUrl: string) {
  const markerStart = ` "${IMAGE_WIDTH_MARKER}`;
  let normalizedImageUrl = imageUrl;

  while (normalizedImageUrl.endsWith('"')) {
    const markerIndex = normalizedImageUrl.lastIndexOf(markerStart);

    if (markerIndex < 0) {
      break;
    }

    const widthText = normalizedImageUrl.slice(markerIndex + markerStart.length, -1);
    const hasOnlyDigits = widthText.length > 0 && Array.from(widthText).every((character) => character >= "0" && character <= "9");

    if (!hasOnlyDigits) {
      break;
    }

    normalizedImageUrl = normalizedImageUrl.slice(0, markerIndex);
  }

  return normalizedImageUrl;
}

function findHtmlTagEnd(markdown: string, tagStart: number) {
  let quote: '"' | "'" | null = null;

  for (let index = tagStart + 4; index < markdown.length; index += 1) {
    const character = markdown[index];

    if (quote) {
      if (character === quote) {
        quote = null;
      }

      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }

    if (character === ">") {
      return index;
    }
  }

  return -1;
}

function findLineEnd(markdown: string, lineStart: number) {
  const newlineIndex = markdown.indexOf("\n", lineStart);
  return newlineIndex < 0 ? markdown.length : newlineIndex + 1;
}

function getLineIndent(markdown: string, lineStart: number, lineEnd: number): LineIndent {
  let columns = 0;
  let offset = 0;

  while (lineStart + offset < lineEnd) {
    const character = markdown[lineStart + offset];

    if (character === " ") {
      columns += 1;
    } else if (character === "\t") {
      columns += 4 - (columns % 4);
    } else {
      break;
    }

    offset += 1;
  }

  return { columns, offset };
}

function getListMarker(markdown: string, markerStart: number, lineEnd: number): ListMarker | null {
  const lineContent = markdown.slice(markerStart, lineEnd).replace(/\r?\n$/, "");
  const markerMatch = lineContent.match(/^(?:[-+*]|\d{1,9}[.)])(?:[ \t]+|$)/);

  return markerMatch ? { contentOffset: markerMatch[0].length } : null;
}

function countCharacterRun(markdown: string, start: number, character: string) {
  let end = start;

  while (markdown[end] === character) {
    end += 1;
  }

  return end - start;
}

function getFenceInfo(markdown: string, markerStart: number) {
  const marker = markdown[markerStart];

  if (marker !== "`" && marker !== "~") {
    return null;
  }

  const markerLength = countCharacterRun(markdown, markerStart, marker);

  return markerLength >= 3 ? { marker, markerLength } : null;
}

function findFenceEnd(
  markdown: string,
  openingLineStart: number,
  marker: string,
  markerLength: number,
  structuralIndent: number,
) {
  let lineStart = findLineEnd(markdown, openingLineStart);

  while (lineStart < markdown.length) {
    const lineEnd = findLineEnd(markdown, lineStart);
    const indent = getLineIndent(markdown, lineStart, lineEnd);

    if (indent.columns < structuralIndent || indent.columns - structuralIndent > 3) {
      lineStart = lineEnd;
      continue;
    }

    const markerStart = lineStart + indent.offset;
    const closingLength = countCharacterRun(markdown, markerStart, marker);
    const trailingText = markdown.slice(markerStart + closingLength, lineEnd).trim();

    if (closingLength >= markerLength && trailingText === "") {
      return lineEnd;
    }

    lineStart = lineEnd;
  }

  return markdown.length;
}

function isEscaped(markdown: string, index: number) {
  let backslashCount = 0;

  for (let cursor = index - 1; cursor >= 0 && markdown[cursor] === "\\"; cursor -= 1) {
    backslashCount += 1;
  }

  return backslashCount % 2 === 1;
}

function findClosingBacktickRun(markdown: string, start: number, markerLength: number) {
  const marker = "`".repeat(markerLength);
  let searchStart = start;

  while (searchStart < markdown.length) {
    const closingIndex = markdown.indexOf(marker, searchStart);

    if (closingIndex < 0) {
      return -1;
    }

    const isExactRun = markdown[closingIndex - 1] !== "`" && markdown[closingIndex + markerLength] !== "`";

    if (isExactRun) {
      return closingIndex;
    }

    searchStart = closingIndex + markerLength;
  }

  return -1;
}

function findProtectedMarkdownRanges(markdown: string) {
  const ranges: MarkdownRange[] = [];
  const activeListContentIndents: number[] = [];
  let consecutiveBlankLines = 0;
  let index = 0;

  while (index < markdown.length) {
    const isLineStart = index === 0 || markdown[index - 1] === "\n";

    if (isLineStart) {
      const lineEnd = findLineEnd(markdown, index);
      const lineText = markdown.slice(index, lineEnd);
      const indent = getLineIndent(markdown, index, lineEnd);
      const marker = getListMarker(markdown, index + indent.offset, lineEnd);
      const isBlankLine = !lineText.trim();

      consecutiveBlankLines = isBlankLine ? consecutiveBlankLines + 1 : 0;

      if (consecutiveBlankLines >= 2) {
        activeListContentIndents.length = 0;
      }

      if (marker) {
        while ((activeListContentIndents.at(-1) ?? 0) > indent.columns) {
          activeListContentIndents.pop();
        }
      }

      const parentListIndent = activeListContentIndents.at(-1) ?? 0;
      const isNestedListMarker = parentListIndent > 0
        && indent.columns >= parentListIndent
        && indent.columns - parentListIndent < 4;
      const isListMarker = Boolean(marker) && (indent.columns < 4 || isNestedListMarker);

      if (isListMarker && marker) {
        activeListContentIndents.push(indent.columns + 4);
      } else if (!isBlankLine) {
        while ((activeListContentIndents.at(-1) ?? 0) > indent.columns) {
          activeListContentIndents.pop();
        }
      }

      const structuralIndent = activeListContentIndents.at(-1) ?? 0;
      const residualIndent = Math.max(indent.columns - structuralIndent, 0);

      if (!isListMarker && residualIndent >= 4) {
        ranges.push({ start: index, end: lineEnd });
        index = lineEnd;
        continue;
      }

      const fenceStart = isListMarker && marker
        ? index + indent.offset + marker.contentOffset
        : index + indent.offset;
      const fence = getFenceInfo(markdown, fenceStart);

      if (fence) {
        const fenceEnd = findFenceEnd(markdown, index, fence.marker, fence.markerLength, structuralIndent);
        ranges.push({ start: index, end: fenceEnd });
        index = fenceEnd;
        continue;
      }
    }

    if (markdown.startsWith("<!--", index)) {
      const commentEnd = markdown.indexOf("-->", index + 4);
      const rangeEnd = commentEnd < 0 ? markdown.length : commentEnd + 3;
      ranges.push({ start: index, end: rangeEnd });
      index = rangeEnd;
      continue;
    }

    if (markdown[index] === "`" && !isEscaped(markdown, index)) {
      const markerLength = countCharacterRun(markdown, index, "`");
      const closingIndex = findClosingBacktickRun(markdown, index + markerLength, markerLength);

      if (closingIndex >= 0) {
        const rangeEnd = closingIndex + markerLength;
        ranges.push({ start: index, end: rangeEnd });
        index = rangeEnd;
        continue;
      }
    }

    index += 1;
  }

  return ranges;
}

function convertLegacySizedImage(imageTag: string) {
  const template = document.createElement("template");
  template.innerHTML = imageTag;

  const image = template.content.querySelector("img");
  const width = parseImageWidth(image?.getAttribute("width"));
  const imageUrl = image?.getAttribute("src") ?? "";

  if (!image || !width || !imageUrl.startsWith("data:image/")) {
    return imageTag;
  }

  const altText = (image.getAttribute("alt") ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll("[", "\\[")
    .replaceAll("]", "\\]");

  return `![${altText}](${imageUrl} "${IMAGE_WIDTH_MARKER}${width}")`;
}

export function normalizeResizableImageMarkdown(markdown: string) {
  const protectedRanges = findProtectedMarkdownRanges(markdown);
  let protectedRangeIndex = 0;
  let cursor = 0;
  let normalizedMarkdown = "";

  while (cursor < markdown.length) {
    const tagStart = markdown.indexOf("<img", cursor);

    if (tagStart < 0) {
      normalizedMarkdown += markdown.slice(cursor);
      break;
    }

    const tagEnd = findHtmlTagEnd(markdown, tagStart);

    if (tagEnd < 0) {
      normalizedMarkdown += markdown.slice(cursor);
      break;
    }

    while (protectedRanges[protectedRangeIndex] && protectedRanges[protectedRangeIndex].end <= tagStart) {
      protectedRangeIndex += 1;
    }

    const protectedRange = protectedRanges[protectedRangeIndex];
    const isProtected = protectedRange && protectedRange.start <= tagStart && tagStart < protectedRange.end;

    normalizedMarkdown += markdown.slice(cursor, tagStart);
    normalizedMarkdown += isProtected
      ? markdown.slice(tagStart, tagEnd + 1)
      : convertLegacySizedImage(markdown.slice(tagStart, tagEnd + 1));
    cursor = tagEnd + 1;
  }

  return normalizedMarkdown;
}

function getNodeHtmlAttributes(node: WysiwygImageNode) {
  return isRecord(node.attrs.htmlAttrs) ? node.attrs.htmlAttrs : {};
}

function getNodeWidth(node: WysiwygImageNode) {
  return parseImageWidth(getNodeHtmlAttributes(node).width);
}

function getStringAttribute(node: WysiwygImageNode, name: string) {
  const value = node.attrs[name];
  return typeof value === "string" ? value : "";
}

function addWidthToHtmlToken(token: HtmlToken, width: number): HtmlToken {
  if (token.type !== "openTag" || token.tagName !== "img") {
    return token;
  }

  const attributes: Record<string, unknown> = { ...(token.attributes ?? {}), width: String(width) };
  delete attributes.title;

  return {
    ...token,
    attributes,
  };
}

function renderResizableImageToHtml(node: MarkdownImageNode, context: HtmlRendererContext) {
  const original = context.origin?.() ?? null;
  const width = getWidthFromTitle(node.title);

  if (!width) {
    return original;
  }

  return Array.isArray(original)
    ? original.map((token) => addWidthToHtmlToken(token, width))
    : original
      ? addWidthToHtmlToken(original, width)
      : original;
}

function renderResizableImageToMarkdown(nodeInfo: WysiwygNodeInfo, context: MarkdownRendererContext) {
  const original = context.origin?.() ?? {};
  const width = getNodeWidth(nodeInfo.node);

  if (!width) {
    return original;
  }

  const originalAttributes = isRecord(original.attrs) ? original.attrs : {};
  const originalImageUrl = typeof originalAttributes.imageUrl === "string"
    ? originalAttributes.imageUrl
    : getStringAttribute(nodeInfo.node, "imageUrl");
  const imageUrl = removeImageWidthMarkers(originalImageUrl);
  const altText = typeof originalAttributes.altText === "string"
    ? originalAttributes.altText
    : getStringAttribute(nodeInfo.node, "altText");

  return {
    ...original,
    rawHTML: null,
    attrs: {
      ...originalAttributes,
      altText,
      imageUrl: `${imageUrl} "${IMAGE_WIDTH_MARKER}${width}"`,
    },
  };
}

function createResizableImageNodeView(
  initialNode: WysiwygImageNode,
  view: WysiwygEditorView,
  getPos: () => number | undefined,
) {
  let currentNode = initialNode;
  let activePointerId: number | null = null;
  let startClientX = 0;
  let startWidth = 0;
  let currentWidth = 0;
  let dragMaxWidth = MAX_IMAGE_WIDTH;

  const wrapper = document.createElement("span");
  const image = document.createElement("img");
  const resizeHandle = document.createElement("button");

  wrapper.className = "community-editor-image";
  wrapper.contentEditable = "false";
  wrapper.tabIndex = 0;

  image.draggable = false;

  resizeHandle.type = "button";
  resizeHandle.className = "community-editor-image-resize-handle";
  resizeHandle.setAttribute("aria-label", "이미지 크기 조절");
  resizeHandle.title = "드래그하여 이미지 크기 조절";

  wrapper.append(image, resizeHandle);

  const applyNode = (node: WysiwygImageNode) => {
    const width = getNodeWidth(node);

    image.src = getStringAttribute(node, "imageUrl");
    image.alt = getStringAttribute(node, "altText");
    wrapper.style.width = width ? `${width}px` : "";
  };

  const getAvailableWidth = () => {
    const editorWidth = Math.floor(view.dom.getBoundingClientRect().width);
    return editorWidth > 0 ? Math.min(editorWidth, MAX_IMAGE_WIDTH) : MAX_IMAGE_WIDTH;
  };

  const releaseResize = () => {
    if (activePointerId === null) {
      return false;
    }

    if (resizeHandle.hasPointerCapture(activePointerId)) {
      resizeHandle.releasePointerCapture(activePointerId);
    }

    activePointerId = null;

    return true;
  };

  const finishResize = () => {
    if (!releaseResize()) {
      return;
    }

    const position = getPos();

    if (typeof position !== "number") {
      return;
    }

    const nextWidth = clampImageWidth(currentWidth, dragMaxWidth);
    const htmlAttrs = getNodeHtmlAttributes(currentNode);
    const transaction = view.state.tr.setNodeMarkup(position, null, {
      ...currentNode.attrs,
      htmlAttrs: {
        ...htmlAttrs,
        width: String(nextWidth),
      },
      rawHTML: null,
    });

    view.dispatch(transaction);
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (event.pointerId !== activePointerId) {
      return;
    }

    event.preventDefault();
    currentWidth = clampImageWidth(startWidth + event.clientX - startClientX, dragMaxWidth);
    wrapper.style.width = `${currentWidth}px`;
  };

  const handlePointerEnd = (event: PointerEvent) => {
    if (event.pointerId !== activePointerId) {
      return;
    }

    event.preventDefault();
    finishResize();
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    activePointerId = event.pointerId;
    startClientX = event.clientX;
    startWidth = Math.max(image.getBoundingClientRect().width, MIN_IMAGE_WIDTH);
    currentWidth = startWidth;
    dragMaxWidth = Math.max(MIN_IMAGE_WIDTH, getAvailableWidth());
    resizeHandle.setPointerCapture(event.pointerId);
  };

  resizeHandle.addEventListener("pointerdown", handlePointerDown);
  resizeHandle.addEventListener("pointermove", handlePointerMove);
  resizeHandle.addEventListener("pointerup", handlePointerEnd);
  resizeHandle.addEventListener("pointercancel", handlePointerEnd);

  applyNode(initialNode);

  return {
    dom: wrapper,
    update: (nextNode: WysiwygImageNode) => {
      if (nextNode.type !== currentNode.type) {
        return false;
      }

      currentNode = nextNode;
      applyNode(nextNode);
      return true;
    },
    stopEvent: (event: Event) => event.target === resizeHandle,
    ignoreMutation: () => true,
    destroy: () => {
      releaseResize();
      resizeHandle.removeEventListener("pointerdown", handlePointerDown);
      resizeHandle.removeEventListener("pointermove", handlePointerMove);
      resizeHandle.removeEventListener("pointerup", handlePointerEnd);
      resizeHandle.removeEventListener("pointercancel", handlePointerEnd);
    },
  };
}

export function imageResizePlugin() {
  return {
    toHTMLRenderers: {
      image: renderResizableImageToHtml,
    },
    toMarkdownRenderers: {
      image: renderResizableImageToMarkdown,
    },
    wysiwygNodeViews: {
      image: createResizableImageNodeView,
    },
  };
}
