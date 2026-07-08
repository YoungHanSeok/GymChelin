"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type ToastuiEditor from "@toast-ui/editor";

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

const MarkdownEditor = forwardRef<MarkdownEditorHandle, MarkdownEditorProps>(
  ({ height = "420px", initialValue = "", placeholder }, ref) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const editorRef = useRef<ToastuiEditor | null>(null);

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

      const setupEditor = async () => {
        const { default: Editor } = await import("@toast-ui/editor");

        if (!isMounted || !containerRef.current) {
          return;
        }

        editorRef.current = new Editor({
          el: containerRef.current,
          height,
          initialEditType: "wysiwyg",
          initialValue,
          placeholder,
          previewStyle: "vertical",
          usageStatistics: false,
        });
      };

      void setupEditor();

      return () => {
        isMounted = false;
        destroyEditor();
      };
    }, [height, initialValue, placeholder]);

    return <div ref={containerRef} />;
  },
);

MarkdownEditor.displayName = "MarkdownEditor";

export default MarkdownEditor;
