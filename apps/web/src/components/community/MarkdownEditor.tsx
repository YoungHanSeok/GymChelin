"use client";

// Toast UI 에디터를 게시글 작성 화면에서 재사용할 수 있게 감싼다.
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type ToastuiEditor from "@toast-ui/editor";
import { imageResizePlugin, normalizeResizableImageMarkdown } from "@/components/community/imageResizePlugin";

type EditorTheme = "light" | "dark";

export type MarkdownEditorHandle = {
  getMarkdown: () => string;
  focus: () => void;
};

const EDITOR_DESTROY_DELAY_MS = 300;

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

async function insertImage(blob: Blob | File, callback: (url: string, altText?: string) => void) {
  const dataUrl = await readBlobAsDataUrl(blob);
  const altText = blob instanceof File && blob.name ? blob.name : "업로드 이미지";

  callback(dataUrl, altText);
}

const MarkdownEditor = forwardRef<MarkdownEditorHandle, MarkdownEditorProps>(
  ({ height = "420px", initialValue = "", placeholder }, ref) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const editorMountRef = useRef<HTMLDivElement | null>(null);
    const editorRef = useRef<ToastuiEditor | null>(null);
    const markdownRef = useRef(initialValue);

    useImperativeHandle(ref, () => ({
      getMarkdown: () => editorRef.current?.getMarkdown() ?? "",
      focus: () => {
        editorRef.current?.focus();
      },
    }));

    const destroyEditor = () => {
      const editor = editorRef.current;
      const editorMount = editorMountRef.current;

      editorRef.current = null;
      editorMountRef.current = null;
      editorMount?.remove();

      if (!editor) {
        return;
      }

      // Toast UI 툴바의 200ms 지연 리사이즈가 끝난 뒤 내부 DOM을 정리한다.
      window.setTimeout(() => {
        try {
          editor.destroy();
        } catch {
          return;
        }
      }, EDITOR_DESTROY_DELAY_MS);
    };

    useEffect(() => {
      let isMounted = true;
      let activeTheme = getAppliedEditorTheme();
      let setupVersion = 0;

      const setupEditor = async (theme: EditorTheme) => {
        const currentSetupVersion = ++setupVersion;
        const [{ default: Editor }] = await Promise.all([
          import("@toast-ui/editor"),
          import("@toast-ui/editor/dist/i18n/ko-kr"),
        ]);

        if (!isMounted || currentSetupVersion !== setupVersion || !containerRef.current) {
          return;
        }

        markdownRef.current = normalizeResizableImageMarkdown(markdownRef.current);

        const editorMount = document.createElement("div");
        containerRef.current.append(editorMount);

        const editor = new Editor({
          el: editorMount,
          height,
          hooks: {
            addImageBlobHook: (blob, callback) => {
              void insertImage(blob, callback);

              return false;
            },
          },
          initialEditType: "wysiwyg",
          initialValue: markdownRef.current,
          language: "ko-KR",
          placeholder,
          plugins: [imageResizePlugin],
          previewStyle: "vertical",
          theme,
          usageStatistics: false,
        });

        if (!isMounted || currentSetupVersion !== setupVersion) {
          editorMount.remove();
          window.setTimeout(() => {
            try {
              editor.destroy();
            } catch {
              return;
            }
          }, EDITOR_DESTROY_DELAY_MS);
          return;
        }

        editorMountRef.current = editorMount;
        editorRef.current = editor;
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
        setupVersion += 1;
        observer.disconnect();
        destroyEditor();
      };
    }, [height, initialValue, placeholder]);

    return <div ref={containerRef} />;
  },
);

MarkdownEditor.displayName = "MarkdownEditor";

export default MarkdownEditor;
