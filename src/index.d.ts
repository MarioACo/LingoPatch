export type MessageValue = string | Record<string, string>;
export type Dictionary = Record<string, MessageValue | Dictionary>;
export type TranslationSource =
  | string
  | Record<string, Dictionary | Promise<Dictionary> | ((locale: string) => Dictionary | Promise<Dictionary>)>
  | ((locale: string) => Dictionary | Promise<Dictionary>);

export interface LingoPatchConfig {
  defaultLanguage: string;
  fallbackLanguage?: string;
  language?: string;
  languages?: string[];
  translations: TranslationSource;
  storageKey?: string;
  allowedAttributes?: string[];
  observe?: boolean;
  missing?: (key: string, language: string) => string | undefined;
  onError?: (error: unknown) => void;
  document?: Document;
  storage?: Pick<Storage, "getItem" | "setItem"> | null;
  fetch?: typeof fetch;
}

export interface LingoPatch {
  readonly ready: Promise<string>;
  readonly language: string;
  readonly languages: string[];
  t(key: string, params?: Record<string, unknown>): string;
  setLanguage(language: string): Promise<string>;
  translate(root?: Document | Element): void;
  subscribe(listener: (language: string) => void): () => void;
  destroy(): void;
}

export function createLingoPatch(config: LingoPatchConfig): LingoPatch;
export function normalizeLocale(locale: string): string;
export function matchSupportedLocale(requested: string, supported: string[]): string | undefined;
export function getMessage(messages: Dictionary, key: string): unknown;
export function interpolate(message: string, params?: Record<string, unknown>): string;
export function formatMessage(
  value: MessageValue,
  params?: Record<string, unknown>,
  locale?: string,
): string | undefined;
