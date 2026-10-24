import assert from "node:assert/strict";
import { test } from "node:test";

import { createLingoPatch } from "../src/index.js";

function fakeElement(attributes = {}, textContent = "") {
  const values = new Map(Object.entries(attributes));
  return {
    textContent,
    getAttribute(name) {
      return values.get(name) ?? null;
    },
    setAttribute(name, value) {
      values.set(name, String(value));
    },
    matches(selector) {
      return selector.includes("data-i18n") &&
        (values.has("data-i18n") || values.has("data-i18n-attrs"));
    },
    querySelectorAll() {
      return [];
    },
  };
}

function fakeDocument(elements = []) {
  const attributes = new Map();
  return {
    documentElement: {
      lang: "",
      dir: "",
    },
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {},
    querySelectorAll() {
      return elements;
    },
    attributes,
  };
}

test("creates a translator and changes language", async () => {
  const document = fakeDocument();
  const instance = createLingoPatch({
    document,
    storage: null,
    language: "en",
    defaultLanguage: "en",
    translations: {
      en: { greeting: "Hello {{name}}" },
      es: { greeting: "Hola {{name}}" },
    },
  });

  await instance.ready;
  assert.equal(instance.t("greeting", { name: "Mario" }), "Hello Mario");
  assert.equal(document.documentElement.lang, "en");

  await instance.setLanguage("es-MX");
  assert.equal(instance.t("greeting", { name: "Mario" }), "Hola Mario");
  assert.equal(document.documentElement.lang, "es");
  assert.equal(document.documentElement.dir, "ltr");
});

test("falls back to the default dictionary and then to the key", async () => {
  const instance = createLingoPatch({
    document: fakeDocument(),
    storage: null,
    language: "es",
    defaultLanguage: "en",
    translations: {
      en: { shared: "Shared" },
      es: {},
    },
  });

  await instance.ready;
  assert.equal(instance.t("shared"), "Shared");
  assert.equal(instance.t("missing.key"), "missing.key");
});

test("rejects unsupported languages", async () => {
  const instance = createLingoPatch({
    document: fakeDocument(),
    storage: null,
    defaultLanguage: "en",
    translations: { en: {} },
  });

  await instance.ready;
  await assert.rejects(instance.setLanguage("ja"), /Unsupported language/);
});

test("translates text and allowed attributes without changing unsafe attributes", async () => {
  const heading = fakeElement({
    "data-i18n": "hero.title",
    "data-i18n-params": '{"name":"Mario"}',
  });
  const link = fakeElement({
    "data-i18n-attrs": "title:link.title, href:link.href",
    href: "/safe",
  });
  const instance = createLingoPatch({
    document: fakeDocument([heading, link]),
    storage: null,
    defaultLanguage: "es",
    translations: {
      es: {
        hero: { title: "Hola {{name}}" },
        link: { title: "Abrir", href: "javascript:alert(1)" },
      },
    },
  });

  await instance.ready;
  assert.equal(heading.textContent, "Hola Mario");
  assert.equal(link.getAttribute("title"), "Abrir");
  assert.equal(link.getAttribute("href"), "/safe");
});

test("loads dictionaries from a language URL template", async () => {
  const requests = [];
  const instance = createLingoPatch({
    document: fakeDocument(),
    storage: null,
    defaultLanguage: "en",
    languages: ["en", "ar"],
    translations: "/locales/{language}.json",
    async fetch(url) {
      requests.push(url);
      return {
        ok: true,
        async json() {
          return url.includes("/ar.") ? { hello: "مرحبا" } : { hello: "Hello" };
        },
      };
    },
  });

  await instance.ready;
  await instance.setLanguage("ar");
  assert.deepEqual(requests, ["/locales/en.json", "/locales/ar.json"]);
  assert.equal(instance.t("hello"), "مرحبا");
});
