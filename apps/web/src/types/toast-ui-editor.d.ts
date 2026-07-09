declare module "@toast-ui/editor" {
  export type EditorTheme = "light" | "dark";

  export type EditorOptions = {
    el: HTMLElement;
    height?: string;
    initialEditType?: "markdown" | "wysiwyg";
    initialValue?: string;
    placeholder?: string;
    previewStyle?: "tab" | "vertical";
    theme?: EditorTheme;
    usageStatistics?: boolean;
  };

  export type ViewerOptions = {
    el: HTMLElement;
    initialValue?: string;
    theme?: EditorTheme;
    usageStatistics?: boolean;
  };

  export default class ToastuiEditor {
    constructor(options: EditorOptions);

    getMarkdown(): string;

    setMarkdown(markdown: string, cursorToEnd?: boolean): void;

    focus(): void;

    destroy(): void;
  }

  export class Viewer {
    constructor(options: ViewerOptions);

    setMarkdown(markdown: string): void;

    destroy(): void;
  }
}

declare module "@toast-ui/editor/viewer" {
  import type { ViewerOptions } from "@toast-ui/editor";

  export default class ToastuiViewer {
    constructor(options: ViewerOptions);

    setMarkdown(markdown: string): void;

    destroy(): void;
  }
}
