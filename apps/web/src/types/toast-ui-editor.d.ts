declare module "@toast-ui/editor" {
  export type EditorOptions = {
    el: HTMLElement;
    height?: string;
    initialEditType?: "markdown" | "wysiwyg";
    initialValue?: string;
    placeholder?: string;
    previewStyle?: "tab" | "vertical";
    usageStatistics?: boolean;
  };

  export default class ToastuiEditor {
    constructor(options: EditorOptions);

    getMarkdown(): string;

    focus(): void;

    destroy(): void;
  }
}
