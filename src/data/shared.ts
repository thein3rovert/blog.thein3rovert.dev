interface PaginationLink  {
  url: string;
  text?: string;
  srLabel?: string;
}

interface IElement {
  readonly as?: keyof HTMLElementTagNameMap;
}

export type { PaginationLink, IElement };
