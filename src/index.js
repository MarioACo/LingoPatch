import {
  formatMessage,
  getMessage,
  matchSupportedLocale,
  normalizeLocale,
} from "./messages.js";

const DEFAULT_ATTRIBUTES = new Set(["alt", "aria-label", "placeholder", "title"]);
const RTL_LANGUAGES = new Set(["ar", "dv", "fa", "he", "ku", "ps", "ur"]);

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseParams(element) {
  const raw = element.getAttribute("data-i18n-params");
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    return isPlainObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function parseAttributeMappings(value) {
  if (!value) return [];

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separator = entry.indexOf(":");
      if (separator < 1) return null;
      return [entry.slice(0, separator).trim(), entry.slice(separator + 1).trim()];
    })
    .filter(Boolean);
}

async function resolveDictionary(source, locale, fetcher) {
  if (typeof source === "function") return source(locale);

  if (typeof source === "string") {
    if (typeof fetcher !== "function") {
      throw new Error("LingoPatch requires fetch to load translation URLs.");
    }

    const url = source.replaceAll("{language}", encodeURIComponent(locale));
    const response = await fetcher(url);
    if (!response.ok) {
      throw new Error(`LingoPatch could not load ${url} (${response.status}).`);
    }
    return response.json();
  }

  if (isPlainObject(source)) {
    const entry = source[locale] ?? source[locale.split("-")[0]];
    if (typeof entry === "function") return entry(locale);
    if (entry && typeof entry.then === "function") return entry;
    return entry;
  }

  return undefined;
}

function validateConfig(config) {
  if (!isPlainObject(config)) throw new TypeError("LingoPatch config is required.");
  if (!config.translations) {
    throw new TypeError("LingoPatch requires a translations object, function, or URL template.");
  }

  const languages = (config.languages ?? []).map(normalizeLocale).filter(Boolean);
  const fallbackLanguage = normalizeLocale(config.fallbackLanguage ?? config.defaultLanguage);
  const discovered = isPlainObject(config.translations)
    ? Object.keys(config.translations).map(normalizeLocale).filter(Boolean)
    : [];
  const supported = [...new Set([...languages, ...discovered, fallbackLanguage].filter(Boolean))];

  if (supported.length === 0) {
    throw new TypeError("LingoPatch requires at least one supported language.");
  }

  return {
    supported,
    fallbackLanguage: fallbackLanguage || supported[0],
  };
}

function directionFor(locale) {
  return RTL_LANGUAGES.has(locale.split("-")[0]) ? "rtl" : "ltr";
}

export function createLingoPatch(config) {
  const { supported, fallbackLanguage } = validateConfig(config);
  const documentRef = config.document ?? globalThis.document;
  const storage = config.storage ?? globalThis.localStorage;
  const fetcher = config.fetch ?? globalThis.fetch;
  const storageKey = config.storageKey ?? "lingopatch.language";
  const allowedAttributes = new Set([
    ...DEFAULT_ATTRIBUTES,
    ...(config.allowedAttributes ?? []),
  ]);
  const dictionaries = new Map();
  const listeners = new Set();
  let observer;
  let destroyed = false;
  let currentLanguage = fallbackLanguage;

  function storedLanguage() {
    try {
      return storage?.getItem(storageKey);
    } catch {
      return undefined;
    }
  }

  function detectedLanguage() {
    const requested = [
      config.language,
      storedLanguage(),
      ...(globalThis.navigator?.languages ?? []),
      globalThis.navigator?.language,
      fallbackLanguage,
    ];

    for (const locale of requested) {
      const match = matchSupportedLocale(locale, supported);
      if (match) return match;
    }

    return fallbackLanguage;
  }

  async function load(locale) {
    if (dictionaries.has(locale)) return dictionaries.get(locale);

    const pending = Promise.resolve(resolveDictionary(config.translations, locale, fetcher))
      .then((dictionary) => {
        if (!isPlainObject(dictionary)) {
          throw new TypeError(`LingoPatch received an invalid dictionary for ${locale}.`);
        }
        dictionaries.set(locale, dictionary);
        return dictionary;
      })
      .catch((error) => {
        dictionaries.delete(locale);
        throw error;
      });

    dictionaries.set(locale, pending);
    return pending;
  }

  function t(key, params = {}) {
    const primary = dictionaries.get(currentLanguage);
    const fallback = dictionaries.get(fallbackLanguage);
    const primaryMessages = primary && typeof primary.then !== "function" ? primary : {};
    const fallbackMessages = fallback && typeof fallback.then !== "function" ? fallback : {};
    const value = getMessage(primaryMessages, key) ?? getMessage(fallbackMessages, key);
    return formatMessage(value, params, currentLanguage) ?? config.missing?.(key, currentLanguage) ?? key;
  }

  function translateElement(element) {
    if (!element?.getAttribute) return;
    const params = parseParams(element);
    const key = element.getAttribute("data-i18n");

    if (key) {
      const translated = t(key, params);
      if (element.textContent !== translated) element.textContent = translated;
    }

    for (const [attribute, attributeKey] of parseAttributeMappings(
      element.getAttribute("data-i18n-attrs"),
    )) {
      if (!allowedAttributes.has(attribute)) continue;
      const translated = t(attributeKey, params);
      if (element.getAttribute(attribute) !== translated) {
        element.setAttribute(attribute, translated);
      }
    }
  }

  function translateTree(root = documentRef) {
    if (!root) return;
    if (root.matches?.("[data-i18n], [data-i18n-attrs]")) translateElement(root);
    root.querySelectorAll?.("[data-i18n], [data-i18n-attrs]").forEach(translateElement);
  }

  function updateDocumentLanguage() {
    const root = documentRef?.documentElement;
    if (!root) return;
    root.lang = currentLanguage;
    root.dir = directionFor(currentLanguage);
  }

  function updateSwitchers() {
    documentRef?.querySelectorAll?.("[data-lingopatch-switcher]").forEach((element) => {
      if ("value" in element) element.value = currentLanguage;
    });
    documentRef?.querySelectorAll?.("[data-lingopatch-language]").forEach((element) => {
      const active = normalizeLocale(element.getAttribute("data-lingopatch-language")) === currentLanguage;
      element.setAttribute("aria-pressed", String(active));
    });
  }

  async function setLanguage(requested) {
    if (destroyed) throw new Error("This LingoPatch instance has been destroyed.");
    const locale = matchSupportedLocale(requested, supported);
    if (!locale) throw new RangeError(`Unsupported language: ${requested}`);

    await Promise.all([load(locale), load(fallbackLanguage)]);
    currentLanguage = locale;

    try {
      storage?.setItem(storageKey, locale);
    } catch {
      // Storage may be unavailable in privacy modes; translation still works.
    }

    updateDocumentLanguage();
    translateTree();
    updateSwitchers();
    listeners.forEach((listener) => listener(locale));

    if (documentRef?.dispatchEvent && typeof globalThis.CustomEvent === "function") {
      documentRef.dispatchEvent(
        new CustomEvent("lingopatch:languagechange", { detail: { language: locale } }),
      );
    }

    return locale;
  }

  function handleClick(event) {
    const control = event.target?.closest?.("[data-lingopatch-language]");
    if (!control) return;
    setLanguage(control.getAttribute("data-lingopatch-language")).catch(reportError);
  }

  function handleChange(event) {
    const control = event.target?.closest?.("[data-lingopatch-switcher]");
    if (!control) return;
    setLanguage(control.value).catch(reportError);
  }

  function reportError(error) {
    if (typeof config.onError === "function") config.onError(error);
    else console.error(error);
  }

  function observe() {
    if (config.observe === false || !documentRef || typeof globalThis.MutationObserver !== "function") {
      return;
    }

    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes") translateElement(mutation.target);
        mutation.addedNodes?.forEach((node) => {
          if (node.nodeType === 1) translateTree(node);
        });
      }
    });
    observer.observe(documentRef.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-i18n", "data-i18n-attrs", "data-i18n-params"],
    });
  }

  documentRef?.addEventListener?.("click", handleClick);
  documentRef?.addEventListener?.("change", handleChange);
  observe();

  const ready = setLanguage(detectedLanguage()).catch((error) => {
    reportError(error);
    throw error;
  });

  return {
    ready,
    t,
    setLanguage,
    translate: translateTree,
    get language() {
      return currentLanguage;
    },
    get languages() {
      return [...supported];
    },
    subscribe(listener) {
      if (typeof listener !== "function") throw new TypeError("Listener must be a function.");
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    destroy() {
      destroyed = true;
      observer?.disconnect();
      documentRef?.removeEventListener?.("click", handleClick);
      documentRef?.removeEventListener?.("change", handleChange);
      listeners.clear();
    },
  };
}

export { formatMessage, getMessage, interpolate, matchSupportedLocale, normalizeLocale } from "./messages.js";
