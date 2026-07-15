// Toast UI 에디터 패키지에서 프로젝트가 사용하는 타입을 보완한다.
declare module "@toast-ui/editor" {
  export type EditorTheme = "light" | "dark";

  export type EditorOptions = {
    el: HTMLElement;
    height?: string;
    hooks?: {
      addImageBlobHook?: (blob: Blob | File, callback: (url: string, altText?: string) => void) => boolean | void;
    };
    initialEditType?: "markdown" | "wysiwyg";
    initialValue?: string;
    language?: string;
    placeholder?: string;
    plugins?: unknown[];
    previewStyle?: "tab" | "vertical";
    theme?: EditorTheme;
    usageStatistics?: boolean;
  };

  export type ViewerOptions = {
    el: HTMLElement;
    initialValue?: string;
    plugins?: unknown[];
    theme?: EditorTheme;
    usageStatistics?: boolean;
  };

  export default class ToastuiEditor {
    constructor(options: EditorOptions);

    getMarkdown(): string;

    setMarkdown(markdown: string, cursorToEnd?: boolean): void;

    insertText(text: string): void;

    focus(): void;

    destroy(): void;
  }

  export class Viewer {
    constructor(options: ViewerOptions);

    setMarkdown(markdown: string): void;

    destroy(): void;
  }
}

declare module "@toast-ui/editor/dist/i18n/ko-kr";

declare module "@toast-ui/editor/viewer" {
  import type { ViewerOptions } from "@toast-ui/editor";

  export default class ToastuiViewer {
    constructor(options: ViewerOptions);

    setMarkdown(markdown: string): void;

    destroy(): void;
  }
}
