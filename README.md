This repository contains the Design Tokens for the Meteor Design System at shopware.

## Installation

```sh
npm install @meteor/design-tokens
```

## Usage

This packages exposes a handful of files to consume:

- Primitive tokens
- Tokens for the Shopware 6 Administration (light & dark)

As an example we'll show you how to make use of the tokens
for the Shopware 6 Administration.

Import the CSS files that contain the corresponding tokens.

```js
import '@meteor/design-tokens/administration/light.css';

// If you want to support dark mode
import '@meteor/design-tokens/administration/dark.css';
```

Now, you're able to make use of the Design Tokens trough
CSS custom properties, like this:

```css
.sw-button {
  background-color: var(--color-interaction-primary-default);
}
```

To switch to the dark mode add the attribute `data-theme="dark"` to
a DOM element as far up in the DOM tree as possible.

```html
<body data-theme="dark">
  <!-- Your application -->
</body>
```

## License

Shopware 6 is completely free and released under the [MIT License](./LICENSE.md).
