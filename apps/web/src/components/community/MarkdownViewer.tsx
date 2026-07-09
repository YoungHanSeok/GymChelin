"use client";

import { useEffect, useRef } from "react";
import type ToastuiViewer from "@toast-ui/editor/viewer";

type ViewerTheme = "light" | "dark";

type MarkdownViewerProps = {
  content: string;
};

function getAppliedViewerTheme(): ViewerTheme {
  if (document.documentElement.dataset.theme === "dark" || document.documentElement.classList.contains("dark")) {
    return "dark";
  }

  return "light";
}

export default function MarkdownViewer({ content }: MarkdownViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<ToastuiViewer | null>(null);
  const contentRef = useRef(content);

  useEffect(() => {
    contentRef.current = content;
    viewerRef.current?.setMarkdown(content);
  }, [content]);

  useEffect(() => {
    let isMounted = true;
    let activeTheme = getAppliedViewerTheme();

    const destroyViewer = () => {
      const viewer = viewerRef.current;

      if (!viewer) {
        return;
      }

      viewerRef.current = null;

      try {
        viewer.destroy();
      } catch {
        return;
      }
    };

    const setupViewer = async (theme: ViewerTheme) => {
      const { default: Viewer } = await import("@toast-ui/editor/viewer");

      if (!isMounted || !containerRef.current) {
        return;
      }

      viewerRef.current = new Viewer({
        el: containerRef.current,
        initialValue: contentRef.current,
        theme,
        usageStatistics: false,
      });
    };

    const rebuildViewer = async (nextTheme: ViewerTheme) => {
      if (nextTheme === activeTheme) {
        return;
      }

      activeTheme = nextTheme;
      destroyViewer();
      await setupViewer(nextTheme);
    };

    void setupViewer(activeTheme);

    const observer = new MutationObserver(() => {
      void rebuildViewer(getAppliedViewerTheme());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    return () => {
      isMounted = false;
      observer.disconnect();
      destroyViewer();
    };
  }, []);

  return <div ref={containerRef} className="community-markdown-viewer" />;
}
