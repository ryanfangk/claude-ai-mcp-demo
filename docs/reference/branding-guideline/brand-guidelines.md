# Pop-up Shop — Brand Guidelines

The visual + voice system for `claude-ai-mcp-demo`. Keeps the admin
panel, storefront, and any future surface consistent. Adopt these
tokens when you build a new screen; if a deviation would help the
demo land, name the deviation in the PR.

---

## Story

This project is a **pop-up shop in a box** — a small storefront with
a Payload admin, an MCP server, and just enough wiring to show a live
agent change the catalogue and the visitor see it. It is built for
showing, not for shipping.

The brand reads that way: warm, direct, modern, low-ceremony.

### Purpose

Show a Claude agent run a real storefront.

### Positioning

A storefront, ready to go. Plug in a catalogue, point an agent at it,
demo it on a screen.

### Personality

- **Plainspoken.** Strip jargon. Say what's there.
- **Useful.** Every word does work for the reader.
- **Modern.** Sentence case, soft shapes, warm accents — not corporate.
- **Confident, not loud.** One bold accent does the heavy lifting; the
  rest gets out of its way.

---

## Logo

The mark is a **wordmark + glyph** pair.

- **Wordmark:** `pop-up shop` set in DM Serif Display Regular, sentence
  case, no punctuation.
- **Glyph:** a single filled coral disc placed immediately after the
  wordmark, baseline-aligned, height = x-height of the wordmark. Reads
  as a price tag dot, a button, a stage light. Multipurpose.

**Spacing rule.** Clear space on every side equal to the glyph's
diameter. Don't crowd the wordmark with adjacent text or rules.

**Treatments.**

| Surface                    | Treatment                                       |
| -------------------------- | ----------------------------------------------- |
| Light background           | Wordmark in `#0B0D10`, glyph in coral `#F25F3B` |
| Dark background            | Wordmark in white, glyph in coral `#F25F3B`     |
| Photography / busy surface | Wordmark in white, glyph in coral, +12% padding |
| Minimum width              | 88 px wide (web), 0.75 in (print)               |

**Don't.**

- Don't recolor the glyph.
- Don't substitute the wordmark with a different font.
- Don't stretch, outline, or apply a drop shadow.
- Don't stack the wordmark — single line, always.

---

## Typography

Two open-source Google Fonts; load via `next/font/google` or
`@import url(...)` from Google Fonts. No licensing concern.

### Display — DM Serif Display Regular

For headlines, hero copy, the wordmark.

- Regular weight only; no italics.
- Sentence case, never all-caps.
- Keep headlines short — two lines max.
- 2× the size of the subhead next to it.

### UI + Body — DM Sans

The workhorse. Use for body copy, buttons, labels, navigation, form
fields, admin chrome.

- **Regular (400)** — body copy, secondary labels.
- **Medium (500)** — buttons, primary labels, callouts in body copy.
  Use Medium instead of bold; do not synthesize bold.
- No italics.

### System fallbacks

If brand fonts can't load:

| Brand                | Fallback                                  |
| -------------------- | ----------------------------------------- |
| DM Serif Display     | Georgia, serif                            |
| DM Sans              | -apple-system, BlinkMacSystemFont, Inter, system-ui, sans-serif |

### Pairing

| Slot     | Font                  | Weight  | Notes                          |
| -------- | --------------------- | ------- | ------------------------------ |
| Heading  | DM Serif Display      | Regular | Sentence case, ≤ 2 lines       |
| Subhead  | DM Sans               | Medium  | Half the heading's size        |
| Body     | DM Sans               | Regular | 14–16 px, line-height 1.5      |
| UI label | DM Sans               | Medium  | 12–14 px, letter-spacing 0     |
| Button   | DM Sans               | Medium  | 14 px, sentence case           |

---

## Color

White is the canvas. Coral does the bold thing. Indigo holds the
chrome. Greys handle the rest.

**One accent per surface.** Coral or indigo, not both at full strength
on the same screen. Greys don't count.

### Palette

| Role        | Token                | Hex       | Use                                                              |
| ----------- | -------------------- | --------- | ---------------------------------------------------------------- |
| Coral       | `--brand-coral`      | `#F25F3B` | Primary accent. Buttons, links, glyph, the one bold thing.       |
| Coral dark  | `--brand-coral-dark` | `#C44324` | Hover state for the coral.                                       |
| Indigo      | `--brand-indigo`     | `#1E1B4B` | Headings, admin chrome, dark backgrounds.                        |
| Ink         | `--brand-ink`        | `#0B0D10` | Body text on white.                                              |
| Slate       | `--brand-slate`      | `#3A3E47` | Secondary text, icons.                                           |
| Mute        | `--brand-mute`       | `#6B7280` | Tertiary text, captions, helper text.                            |
| Hairline    | `--brand-hairline`   | `#E5E7EB` | Borders, dividers, table rules.                                  |
| Surface     | `--brand-surface`    | `#F8F9FA` | Off-white panels, alternating rows, callout backgrounds.         |
| Canvas      | `--brand-canvas`     | `#FFFFFF` | Page background.                                                 |

### Status

For form validation, system messages, badges. Don't repurpose for
brand expression.

| Role    | Hex       |
| ------- | --------- |
| Success | `#10B981` |
| Warning | `#F59E0B` |
| Error   | `#EF4444` |
| Info    | `#3B82F6` |

### Gradient (optional)

`linear-gradient(90deg, #1E1B4B 0%, #F25F3B 100%)` — indigo to coral,
left to right. Reserve for hero accents (login splash, empty-state
illustration). Never apply to body text. Never reverse the direction.

### Application

| Where                                                          | What                                                                 |
| -------------------------------------------------------------- | -------------------------------------------------------------------- |
| Page background                                                | `--brand-canvas`                                                     |
| Card / panel background                                        | `--brand-surface` on canvas, or `--brand-canvas` with hairline border |
| Primary button background                                      | `--brand-coral`, text `--brand-canvas`                               |
| Primary button hover                                           | `--brand-coral-dark`                                                 |
| Link                                                           | `--brand-coral`, underline on hover                                  |
| Heading                                                        | `--brand-indigo` or `--brand-ink`                                    |
| Body text                                                      | `--brand-ink`                                                        |
| Secondary text                                                 | `--brand-slate`                                                      |
| Helper text / placeholder                                      | `--brand-mute`                                                       |
| Border / divider                                               | `--brand-hairline`                                                   |
| Admin chrome (sidebar, nav, header bar)                        | `--brand-indigo` background, white text, coral active state         |

---

## Voice

Write like a competent shopkeeper who likes their stuff. Short,
warm, direct. The reader is here to do something — get out of their way.

### Five rules

1. **Lead with the answer.** First sentence carries the point.
2. **Use sentences they can read once.** ≤ 14 words; cut anything that
   doesn't serve them.
3. **Sentence case everywhere.** Capitalize the first word and proper
   nouns. Nothing else.
4. **Show, don't claim.** "Create a product" beats "experience our
   intuitive product creation."
5. **Be positive.** "Press Save to publish" beats "Don't forget to
   save."

### Sentence case examples

| Yes                                | No                                |
| ---------------------------------- | --------------------------------- |
| Sign in                            | Sign In                           |
| Create your first product          | Create Your First Product         |
| Published products                 | Published Products                |
| Pop-up shop                        | Pop-Up Shop                       |
| MCP API keys                       | Mcp Api Keys                      |

(Proper nouns and acronyms — MCP, OAuth, API, WorkOS — stay capitalized.)

### Microcopy patterns

- **Buttons:** verb-first, ≤ 3 words. "Create product", "Sign in",
  "Publish change".
- **Empty states:** name what's missing + the one action that fills it.
- **Errors:** what failed + what to try, in that order. No blame.
- **Helper text:** what the field does + the constraint, if any.

---

## Application notes

### Admin panel (Payload)

- Sidebar/nav: indigo background, white text, coral active row.
- Buttons: coral primary, indigo secondary, ghost for tertiary.
- Forms: hairline borders, generous spacing, sentence-case labels.
- Headers: DM Serif Display for the H1 of a section; DM Sans Medium
  for everything below.
- Logo lives in the top-left nav slot and on the login splash.

### Storefront

- Hero: DM Serif Display heading, generous whitespace, single coral
  CTA.
- Product cards: surface background, hairline border, ink heading,
  slate body, coral price tag.
- Footer: minimal — brand line + a one-line caption.

### What to skip

- Gradient body text. Looks like 2017.
- More than one accent per screen.
- Italic anywhere — emphasize with Medium weight.
- Drop shadows on the logo or icons.
- Sentences over 25 words. If you need one, split it.
