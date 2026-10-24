# LingoPatch

LingoPatch permite traducir una página utilizando archivos JSON almacenados en
el mismo proyecto. No requiere cuentas, servidores de traducción ni una base de
datos.

## Instalación

```bash
npm install lingopatch
```

Marca cada texto con una clave estable:

```html
<h1 data-i18n="inicio.titulo">Bienvenido</h1>
<input
  data-i18n-attrs="placeholder:formulario.correo"
  placeholder="Correo electrónico"
/>

<button data-lingopatch-language="es">Español</button>
<button data-lingopatch-language="en">English</button>
```

Inicializa la biblioteca una vez:

```js
import { createLingoPatch } from "lingopatch";

const idiomas = createLingoPatch({
  defaultLanguage: "es",
  languages: ["es", "en"],
  translations: "/locales/{language}.json"
});

await idiomas.ready;
```

Para una página estática también puede instalarse con un solo módulo, sin
configurar un empaquetador:

```html
<script>
  window.LingoPatchConfig = {
    defaultLanguage: "es",
    languages: ["es", "en"],
    translations: "/locales/{language}.json"
  };
</script>
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/lingopatch@0.1.0/src/auto.js"
></script>
```

La instancia queda disponible como `window.lingoPatch`. Es recomendable fijar
una versión específica en la dirección del CDN.

Archivo `locales/es.json`:

```json
{
  "inicio.titulo": "Bienvenido",
  "formulario.correo": "Correo electrónico"
}
```

Archivo `locales/en.json`:

```json
{
  "inicio.titulo": "Welcome",
  "formulario.correo": "Email address"
}
```

Al cambiar de idioma, LingoPatch actualiza los nodos marcados, establece los
atributos `lang` y `dir` del documento y guarda la preferencia en el navegador.
También observa contenido agregado posteriormente por una aplicación dinámica.

## Variables y plurales

```html
<p data-i18n="carrito.elementos" data-i18n-params='{"count": 2}'>
  2 elementos
</p>
```

```json
{
  "carrito": {
    "elementos": {
      "=0": "El carrito está vacío",
      "one": "{{count}} elemento",
      "other": "{{count}} elementos"
    }
  }
}
```

## Seguridad

Las traducciones se escriben como texto, nunca como HTML. De manera
predeterminada solamente pueden actualizarse `alt`, `aria-label`, `placeholder`
y `title`. Esto reduce el riesgo de que una traducción comunitaria inserte
scripts o modifique enlaces.

## Ejecutar el ejemplo

Desde la carpeta principal:

```bash
npx serve .
```

Después abre `/example/` en el navegador.

## Estado

Esta es una primera versión funcional. Las siguientes etapas pueden incluir un
extractor de claves, una GitHub Action que detecte traducciones incompletas y un
editor visual que proponga cambios mediante pull requests.
