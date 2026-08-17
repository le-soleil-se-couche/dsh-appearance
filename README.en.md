# DSH Appearance

[中文](README.md) | English

A first-class Appearance page and configurable Claude Code skin for DeepSeek Harness. Theme mode, colors, local fonts, copy/import, and skin switching now live under **Settings → Appearance** instead of a three-level plugin menu.

![DSH Appearance overview](docs/images/appearance-overview.png)

## Features

- **First-class Appearance entry** beside General Settings, using the official Harness settings shell.
- **Official theme preference** for System, Light, and Dark through the Harness Theme Runtime.
- **Three editable colors**: accent, background, and foreground support both a color picker and hex text. The raised surface is derived automatically so a fourth independent value cannot drift out of balance.
- **Local fonts**: installed families load on first focus. UI and code fonts remain editable comboboxes, so you can select a detected family or type one manually. Missing families fall back safely to the Harness font stack.
- **Matching copy/import**: both actions use the same paste-ready `dsh-theme-v1:` transport text.
- **Real skin try-on and apply** with reversible previews and a refresh after the written configuration is read back.
- **Local-first**: appearance data stays in the browser; local font access is requested only after a user gesture.
- **Bilingual UI and docs**: the UI follows the Harness locale; Chinese is the default README and this file is the full English mirror.

The configurable skin bundled in this repository is Claude Code Terminal. The Appearance page exposes a shared
`--dsh-appearance-*` contract; Ewin Warm Light in the `dsh-web-ui` skin collection consumes the same contract, so
editing colors while Ewin Warm is active updates Ewin Warm immediately. Other skins are unaffected unless they opt in.

## Two sample configurations

### Warm Terracotta

- Accent: `#da7756`
- Light: `#f5f3ee` / `#1d1b16`
- Dark: `#1d1b16` / `#f5f3ee`
- Fonts: `思源宋体 VF` / `SF Mono`

```text
dsh-theme-v1:{"format":"dsh-claude-code-appearance","version":2,"colors":{"light":{"accent":"#da7756","canvas":"#f5f3ee","surface":"#f1eee8","foreground":"#1d1b16"},"dark":{"accent":"#da7756","canvas":"#1d1b16","surface":"#262119","foreground":"#f5f3ee"}},"fonts":{"ui":"思源宋体 VF","code":"SF Mono"}}
```

### Deep Ocean

- Accent: light `#2563eb`, dark `#70a5ff`
- Light: `#f6f8fb` / `#172033`
- Dark: `#111827` / `#e5edf7`
- Fonts: `Avenir Next` / `Menlo`

```text
dsh-theme-v1:{"format":"dsh-claude-code-appearance","version":2,"colors":{"light":{"accent":"#2563eb","canvas":"#f6f8fb","surface":"#f2f3f5","foreground":"#172033"},"dark":{"accent":"#70a5ff","canvas":"#111827","surface":"#191e2a","foreground":"#e5edf7"}},"fonts":{"ui":"Avenir Next","code":"Menlo"}}
```

## Install

Requirements: Node.js 22, pnpm 9, and DeepSeek Harness `0.1.0-rc.6`.

```sh
git clone https://github.com/le-soleil-se-couche/dsh-appearance.git
cd dsh-appearance
pnpm install
pnpm build

dsh plugin --profile web add link:./packages/skins/skin-center
dsh plugin --profile web add link:./packages/skins/claude-code
node ./scripts/dsh-skin use claude-code
dsh web
```

If the active profile already loads the old `dsh-skin-claude-code` repository, or an older `skin-center`
through `dsh-skins` / `dsh-web-ui-all`, remove those packages before installing both units from this
repository. The old and new packages share the same Cordis/plugin ids and cannot be installed together.

Restore the official look:

```sh
node ./scripts/dsh-skin use official
```

## Use

1. Open Harness Settings and choose the top-level Appearance entry.
2. Pick System, Light, or Dark and edit the three color values.
3. Focus either font field, then type a family name or choose a detected local family.
4. Use Copy to share the complete transport text; use Import to paste the same format.
5. Expand Other skins to try on, apply, or restore the official look.

## Development

```sh
pnpm install
pnpm build
pnpm typecheck
pnpm test
pnpm generate:check
```

Installable units:

- `packages/skins/skin-center`: Appearance settings, font enumeration, config transport, and skin try-on/apply.
- `packages/skins/claude-code`: the Claude Code visual layer consuming private `--dsh-appearance-*` variables.

## Current platform boundary

The Harness `0.1.0-rc.6` `settings.section` contract does not expose a navigation-icon field, so the Appearance row currently uses the host's default gear. This project does not patch Harness source, `node_modules`, or the settings navigation DOM.

- macOS: browser Local Font Access plus host fallback through `fc-list` or `system_profiler`.
- Linux: portable Node-based apply paths; host font enumeration needs `fontconfig`, with browser enumeration and manual entry still available.
- Windows: the repo CLI runs through Node, DSH `.cmd` shims use the shell, home resolution uses `os.homedir()`, profile package links use junctions, and the host can read the Windows Fonts registry.
- Real interactive QA was completed on macOS. Windows/Linux branches have unit coverage and a three-platform GitHub Actions matrix; the first public push will provide the CI result. Real-device reports remain welcome.

## License

[BSD-3-Clause](LICENSE)
