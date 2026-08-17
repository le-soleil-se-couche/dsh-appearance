# Design QA

## Visual sources

- Codex Appearance theme, import, color, and font controls supplied as the product reference.
- DeepSeek Harness settings shell supplied as the host layout reference.
- The reported oversized import dialog supplied as the responsive regression reference.

## Implementation captures

- `docs/images/appearance-overview.png` — full Appearance settings overview in the real Harness runtime.
- `docs/images/appearance-color-controls.jpg` — live color controls with picker swatches and editable hex fields.
- Responsive QA also covered the empty, long-transport, and invalid import states.

## Interaction matrix

| Flow | Result |
| --- | --- |
| Open `设置 → 外观` | Passed |
| Select `跟随系统` / `浅色` / `深色` | Passed |
| Enter a color by text or use the native color picker | Passed |
| Edit a color while `Ewin Warm Light` is active and update its live theme tokens | Passed |
| Type a UI font manually | Passed |
| Type a code font manually | Passed |
| Choose an enumerated local font candidate | Passed |
| Copy the canonical transport text | Passed |
| Import that same transport text | Passed |
| Close the inner import dialog with Escape and restore trigger focus | Passed |
| Try on, apply `qq98`, and restore the prior `ewin-warm` skin | Passed |

## Responsive import dialog

Rechecked in the real Harness runtime at effective CSS viewports of `953 × 662`,
`476 × 596`, and `318 × 503`:

- Empty state: the dialog, multiline field, and footer remain inside the viewport.
- At `318 × 503`, the dialog bounds are `x=24…294`, `y=56…447`; the field and both footer buttons remain contained.
- Long canonical transport: the `textarea` soft-wraps inside its 320px content box (`scrollWidth === clientWidth`) without widening the page.
- Invalid transport: the error message, multiline field, and both footer actions remain visible.
- The document has no horizontal overflow in any tested state.

## Intentional differences from Codex

- The page follows the Harness settings modal and its density instead of reproducing the full Codex settings window.
- The left-navigation icon remains the Harness gear fallback. The current Harness settings SDK (`rc.6`) exposes no supported per-section icon slot; changing it would require an upstream shell API or an unsupported DOM patch.
- Light and dark palettes are configured separately because the Claude Code skin owns mode-specific CSS variables. Each mode exposes the three user-facing colors used by Codex—accent, background, and foreground—while the surface color is derived automatically.

## Platform coverage

- macOS: real Harness interaction, copy/import, local fonts, three responsive dialog sizes, active Ewin Warm live recoloring, and Apply/switch-back smoke.
- Linux: platform-neutral path and runner tests plus a configured GitHub Actions matrix; host font enumeration uses `fontconfig` when installed.
- Windows: Node-launched repo fallback, shell-backed `.cmd` support, `os.homedir()`, junction links, Windows Fonts registry parsing, and a configured GitHub Actions matrix.
- Linux and Windows real-device UI interaction remains outside this local macOS QA run.

## Result

passed
