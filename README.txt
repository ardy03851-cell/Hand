# NODE // PAGE HUB

A local HTML launcher styled after the supplied SENTINEL UI reference.

## Folder
Keep all files together:

- index.html
- hands.html
- eyes.html
- any other modules

## Add a module
Open `index.html` and find `const PAGES = [...]`.

Copy one object and change:
- `file` — the HTML filename
- `name` — display title
- `description` — small card description
- `accent` — divided outline / labels
- `glow` — ambient glow colour
- `icon` — small card symbol

Example:
{
  file: "voice.html",
  name: "VOICE",
  description: "Voice module",
  accent: "#b28dff",
  glow: "#b28dff",
  icon: "◌"
}

No framework or build step is required. Open `index.html` directly in a browser.
