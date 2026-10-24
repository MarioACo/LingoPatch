# LingoPatch

[Documentación en español](docs/README.es.md)

LingoPatch is a tiny, framework-agnostic localization library for websites that
keep translations in Git. Add semantic translation keys to HTML, point the
library at JSON dictionaries, and update copy without rewriting components.

## Why LingoPatch?

- No account, database, or translation server is required.
- Works with static HTML and client-rendered pages.
- Detects the visitor language and remembers their selection.
- Handles interpolation, plurals, regional locales, and right-to-left pages.
- Watches dynamically added content.
- Updates text and explicitly allowed attributes, never raw HTML.
- Has no production dependencies.

## Quick start

Install the package:

```bash
npm install lingopatch
```

Mark translatable content with stable keys:

```html
<h1 data-i18n="home.title">Welcome</h1>
<input data-i18n-attrs="placeholder:form.email" placeholder="Email" />

<button data-lingopatch-language="en">English</button>
<button data-lingopatch-language="es">Español</button>
```

Initialize LingoPatch once at the application entry point:

```js
import { createLingoPatch } from "lingopatch";

const i18n = createLingoPatch({
  defaultLanguage: "en",
  languages: ["en", "es"],
  translations: "/locales/{language}.json"
});

await i18n.ready;
```

Create `locales/en.json`:

```json
{
  "home.title": "Welcome",
  "form.email": "Email address"
}
```

And `locales/es.json`:

```json
{
  "home.title": "Bienvenido",
  "form.email": "Correo electrónico"
}
```

Serve the project over HTTP so the browser can load the JSON files. Open the
included demo with:

```bash
npx serve .
```

Then visit `/example/`.

## One-script setup

A static website can configure LingoPatch before loading its module, with no
bundler or framework:

```html
<script>
  window.LingoPatchConfig = {
    defaultLanguage: "en",
    languages: ["en", "es"],
    translations: "/locales/{language}.json"
  };
</script>
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/lingopatch@0.1.0/src/auto.js"
></script>
```

Auto mode exposes the initialized instance as `window.lingoPatch`. Pin a version
in the CDN URL so a future release cannot unexpectedly change a production site.

## Inline dictionaries

Small sites can bundle their dictionaries directly:

```js
const i18n = createLingoPatch({
  defaultLanguage: "en",
  translations: {
    en: { greeting: "Hello {{name}}" },
    es: { greeting: "Hola {{name}}" }
  }
});
```

## Variables and plurals

Parameters are JSON stored in `data-i18n-params`:

```html
<p data-i18n="cart.items" data-i18n-params='{"count": 3}'>3 items</p>
```

```json
{
  "cart": {
    "items": {
      "=0": "Your cart is empty",
      "one": "{{count}} item",
      "other": "{{count}} items"
    }
  }
}
```

Plural categories use the browser's `Intl.PluralRules` implementation for the
active locale.

## Attributes and security

Use a comma-separated mapping for attributes:

```html
<img data-i18n-attrs="alt:photo.alt, title:photo.title" />
```

LingoPatch permits `alt`, `aria-label`, `placeholder`, and `title` by default.
Additional attributes must be opted into with `allowedAttributes`. Translation
values are assigned with `textContent` and `setAttribute`; HTML from translation
files is never executed.

## API

```js
await i18n.setLanguage("es-MX"); // resolves to supported `es`
i18n.t("greeting", { name: "Mario" });
i18n.translate();                // manually translate the current document
i18n.subscribe((language) => {});
i18n.destroy();
```

The instance also exposes `language`, `languages`, and `ready`.

## Configuration

| Option | Purpose |
| --- | --- |
| `defaultLanguage` | Fallback language and default when detection finds no match |
| `languages` | Supported locale list; inferred from inline dictionaries when possible |
| `language` | Explicit initial language |
| `translations` | Locale map, async loader, or URL containing `{language}` |
| `storageKey` | Local storage preference key; defaults to `lingopatch.language` |
| `allowedAttributes` | Additional attributes that translations may update |
| `observe` | Set to `false` to disable dynamic DOM observation |
| `missing` | Function returning custom text for a missing key |
| `onError` | Error callback for automatic loading and language controls |

See [`example/`](example/) for a complete static website.

## Project direction

The first version focuses on a safe browser runtime. Planned community-sized
extensions include a key extraction CLI, translation validation in GitHub
Actions, framework adapters, and an optional in-page editor that submits pull
requests instead of requiring a hosted translation database.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a change. Small adapters,
documentation translations, accessibility improvements, and tests are welcome.

## License

[MIT](LICENSE)
