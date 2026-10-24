import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  formatMessage,
  getMessage,
  interpolate,
  matchSupportedLocale,
  normalizeLocale,
} from "../src/messages.js";

describe("message lookup", () => {
  test("supports flat keys containing dots", () => {
    assert.equal(getMessage({ "home.title": "Hello" }, "home.title"), "Hello");
  });

  test("supports nested dictionaries", () => {
    assert.equal(getMessage({ home: { title: "Hello" } }, "home.title"), "Hello");
  });

  test("does not traverse inherited properties", () => {
    assert.equal(getMessage(Object.create({ secret: "no" }), "secret"), undefined);
  });
});

describe("message formatting", () => {
  test("interpolates named and nested values", () => {
    assert.equal(interpolate("Hello {{ user.name }}!", { user: { name: "Ada" } }), "Hello Ada!");
  });

  test("preserves unknown placeholders", () => {
    assert.equal(interpolate("Hello {{name}}", {}), "Hello {{name}}");
  });

  test("selects English plural forms", () => {
    const message = { one: "{{count}} item", other: "{{count}} items" };
    assert.equal(formatMessage(message, { count: 1 }, "en"), "1 item");
    assert.equal(formatMessage(message, { count: 3 }, "en"), "3 items");
  });

  test("supports exact plural matches", () => {
    const message = { "=0": "Empty", one: "One", other: "Many" };
    assert.equal(formatMessage(message, { count: 0 }, "en"), "Empty");
  });
});

describe("locales", () => {
  test("normalizes locale identifiers", () => {
    assert.equal(normalizeLocale("es_mx"), "es-MX");
  });

  test("matches a regional browser locale to a supported base locale", () => {
    assert.equal(matchSupportedLocale("es-MX", ["en", "es"]), "es");
  });

  test("prefers exact regional matches", () => {
    assert.equal(matchSupportedLocale("pt-BR", ["pt", "pt-BR"]), "pt-BR");
  });
});
