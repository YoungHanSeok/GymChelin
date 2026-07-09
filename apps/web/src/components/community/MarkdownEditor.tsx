"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type ToastuiEditor from "@toast-ui/editor";

type EditorTheme = "light" | "dark";

export type MarkdownEditorHandle = {
  getMarkdown: () => string;
  focus: () => void;
  destroy: () => void;
};

type MarkdownEditorProps = {
  height?: string;
  initialValue?: string;
  placeholder?: string;
};

function getAppliedEditorTheme(): EditorTheme {
  if (document.documentElement.dataset.theme === "dark" || document.documentElement.classList.contains("dark")) {
    return "dark";
  }

  return "light";
}

function readBlobAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function getImageNaturalWidth(src: string) {
  return new Promise<number | null>((resolve) => {
    const image = new Image();

    image.onload = () => resolve(image.naturalWidth || null);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtmlAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getSizedImageMarkdown(src: string, altText: string, width: number) {
  return `<img src="${escapeHtmlAttribute(src)}" alt="${escapeHtmlAttribute(altText)}" width="${width}" />`;
}

function promptImageWidth(naturalWidth: number | null) {
  const fallbackWidth = 720;
  const defaultWidth = Math.min(naturalWidth ?? fallbackWidth, fallbackWidth);
  const value = window.prompt("이미지 너비(px)를 입력해 주세요. 비우면 기본 크기로 삽입됩니다.", String(defaultWidth));

  if (value === null) {
    return null;
  }

  const width = Number(value.trim() || defaultWidth);

  if (!Number.isFinite(width)) {
    return defaultWidth;
  }

  return Math.min(Math.max(Math.round(width), 80), 1600);
}

async function insertImageWithSize(editor: ToastuiEditor, blob: Blob | File, callback: (url: string, altText?: string) => void) {
  const dataUrl = await readBlobAsDataUrl(blob);
  const naturalWidth = await getImageNaturalWidth(dataUrl);
  const width = promptImageWidth(naturalWidth);
  const altText = blob instanceof File && blob.name ? blob.name : "업로드 이미지";

  callback(dataUrl, altText);

  if (!width) {
    return;
  }

  window.setTimeout(() => {
    const markdown = editor.getMarkdown();
    const markdownImagePattern = new RegExp(`!\\[[^\\]]*\\]\\(${escapeRegExp(dataUrl)}\\)`);
    const sizedImageMarkdown = getSizedImageMarkdown(dataUrl, altText, width);
    const nextMarkdown = markdown.replace(markdownImagePattern, sizedImageMarkdown);

    if (nextMarkdown !== markdown) {
      editor.setMarkdown(nextMarkdown, false);
    }
  });
}

const MarkdownEditor = forwardRef<MarkdownEditorHandle, MarkdownEditorProps>(
  ({ height = "420px", initialValue = "", placeholder }, ref) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const editorRef = useRef<ToastuiEditor | null>(null);
    const markdownRef = useRef(initialValue);

    useImperativeHandle(ref, () => ({
      getMarkdown: () => editorRef.current?.getMarkdown() ?? "",
      focus: () => {
        editorRef.current?.focus();
      },
      destroy: () => {
        destroyEditor();
      },
    }));

    const destroyEditor = () => {
      const editor = editorRef.current;

      if (!editor) {
        return;
      }

      editorRef.current = null;

      try {
        editor.destroy();
      } catch {
        return;
      }
    };

    useEffect(() => {
      let isMounted = true;
      let activeTheme = getAppliedEditorTheme();

      const setupEditor = async (theme: EditorTheme) => {
        const { default: Editor } = await import("@toast-ui/editor");

        if (!isMounted || !containerRef.current) {
          return;
        }

        editorRef.current = new Editor({
          el: containerRef.current,
          height,
          hooks: {
            addImageBlobHook: (blob, callback) => {
              if (editorRef.current) {
                void insertImageWithSize(editorRef.current, blob, callback);
              }

              return false;
            },
          },
          initialEditType: "wysiwyg",
          initialValue: markdownRef.current,
          placeholder,
          previewStyle: "vertical",
          theme,
          usageStatistics: false,
        });
      };

      const rebuildEditor = async (nextTheme: EditorTheme) => {
        if (nextTheme === activeTheme) {
          return;
        }

        markdownRef.current = editorRef.current?.getMarkdown() ?? markdownRef.current;
        activeTheme = nextTheme;
        destroyEditor();
        await setupEditor(nextTheme);
      };

      void setupEditor(activeTheme);

      const observer = new MutationObserver(() => {
        void rebuildEditor(getAppliedEditorTheme());
      });

      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class", "data-theme"],
      });

      return () => {
        isMounted = false;
        observer.disconnect();
        destroyEditor();
      };
    }, [height, initialValue, placeholder]);

    return <div ref={containerRef} />;
  },
);

MarkdownEditor.displayName = "MarkdownEditor";

export default MarkdownEditor;
