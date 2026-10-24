const PLACEHOLDER = /{{\s*([\w.-]+)\s*}}/g;

export function normalizeLocale(locale) {
  if (typeof locale !== "string" || locale.trim() === "") return "";

  try {
    return Intl.getCanonicalLocales(locale.replaceAll("_", "-"))[0];
  } catch {
    return locale.trim().replaceAll("_", "-");
  }
}

export function getMessage(messages, key) {
  if (!messages || typeof messages !== "object" || typeof key !== "string") {
    return undefined;
  }

  if (Object.hasOwn(messages, key)) return messages[key];

  return key.split(".").reduce((value, part) => {
    if (!value || typeof value !== "object" || !Object.hasOwn(value, part)) {
      return undefined;
    }
    return value[part];
  }, messages);
}

export function interpolate(message, params = {}) {
  return String(message).replace(PLACEHOLDER, (match, name) => {
    const value = getMessage(params, name);
    return value === undefined || value === null ? match : String(value);
  });
}

export function formatMessage(value, params = {}, locale = "en") {
  let message = value;

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const numericCount = Number(params.count);
    const exactKey = Number.isFinite(numericCount) ? `=${numericCount}` : "";
    const pluralKey = Number.isFinite(numericCount)
      ? new Intl.PluralRules(locale).select(numericCount)
      : "other";

    message = value[exactKey] ?? value[pluralKey] ?? value.other;
  }

  if (typeof message !== "string") return undefined;
  return interpolate(message, params);
}

export function matchSupportedLocale(requested, supported) {
  const normalized = normalizeLocale(requested);
  if (!normalized) return undefined;

  const exact = supported.find((locale) => locale === normalized);
  if (exact) return exact;

  const base = normalized.split("-")[0];
  return supported.find((locale) => locale.split("-")[0] === base);
}
