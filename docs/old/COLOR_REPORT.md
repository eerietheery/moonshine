# Color Report

The default primary color for the application is set in `assets/global.css`.

The color is defined as a CSS variable named `--primary-color` at the `:root` level:

```css
:root {
  --primary-color: #1db954;
}
```

This variable is then used throughout the application to style various elements, such as buttons and focus outlines.

The color can be changed dynamically using the color picker in the settings menu. The JavaScript code that handles the color change is in `src/renderer.js`. When a new color is selected, the `--primary-color` CSS variable is updated with the new value.
