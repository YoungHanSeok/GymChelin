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
