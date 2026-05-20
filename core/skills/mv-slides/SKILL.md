---
name: mv-slides
description: >
  Creates Multiverse-branded Google Slides decks using the official brand guidelines.
  Trigger this skill whenever someone asks to create a presentation, slide deck, or template
  that should follow Multiverse branding — e.g. "make a deck", "create slides", "build a
  presentation", "multiverse slides", "branded deck", "village hall template", "all-hands deck".
  Also trigger when an existing deck needs brand reconciliation or when slide formatting
  guidance is needed.
user-invocable: true
---

# Multiverse Slides Skill

Builds Multiverse-branded `.pptx` files using `python-pptx`, applies the correct brand spec,
then hands the file to the user to upload to Google Drive (Drive auto-converts `.pptx` to
Google Slides on "Open with → Google Slides").

> **Why not upload automatically?** The Drive MCP tool's `base64Content` parameter cannot
> handle binary files larger than ~20 KB. A minimal python-pptx deck is ~27 KB; a realistic
> deck is 40–50 KB. Upload is always a manual step — tell the user clearly where the file is.

---

## Brand spec

### Colour palette

Primary palette — use these for backgrounds, titles, and accents:

| Name | Hex | Use |
|------|-----|-----|
| Ultraviolet | `#5200F2` | Cover slides, section dividers (use sparingly) |
| Lunar 50 | `#F5F4F0` | **Primary background** — default for all content slides |
| Lunar 700 | `#706E6A` | Body text, eyebrow labels |
| Blackhole | `#14140F` | Titles and headings on Lunar backgrounds |
| Sunbeam | `#FFD815` | Accent bar, highlight on one keyword in a title |
| Starlight | `#F0EEE9` | Alternative light background (use sparingly) |
| Eclipse | `#1A0057` | Dark dividers, leadership / closing slides |
| White | `#FFFFFF` | Text on dark (Ultraviolet / Eclipse / Blackhole) backgrounds |

> **Hex values are calibrated approximations.** The source of truth is the brand guidelines
> deck (Drive file ID `19yCvhpI6TnCD1J_Afm4zNlJzTvDLjdZKERf62JV5fOg`). If exact fidelity
> matters, read that file first with `mcp__claude_ai_Google_Drive__read_file_content` and
> cross-check the colour swatches. The deck is too large (>10 MB) to export via the MCP tool.

Secondary palette (data / charts / infographics only — not backgrounds or headings):
Dark Ultraviolet, Dark Sunbeam, Soft Galaxy, Galaxy, Lunar 600, Dark Eclipse.

### Typography

Font family: **Inter** throughout.

| Role | Size | Weight | Line spacing |
|------|------|--------|-------------|
| Expressive (hero / cover) | 56 pt | Medium | 0.8 |
| Large type | 46 pt | Medium | 0.85 |
| Page header / slide title | 24 pt | Medium | 0.9 |
| Regular header | 14 pt | Medium | 1.0 |
| Large body | 12 pt | Bold + Normal | 1.25 |
| Regular body | 9 pt | Bold + Normal | 1.25 |
| Small body / notes | 7 pt | Bold + Normal | 1.25 |
| Footer | 5 pt | Normal | 1.0 |

Rules:
- Minimum font size 7 pt (except source/base/page numbers)
- Default body size 12 pt
- Text must not be justified
- Body paragraph spacing = 2× line spacing
- Highlights (Sunbeam or Eclipse fill) used sparingly — one keyword in a title only

### Slide layout rules

- **Background**: Lunar 50 is the default. Ultraviolet and Starlight are used sparingly —
  covers and section dividers only.
- **Titles**: Blackhole on Lunar/Starlight backgrounds; white on Ultraviolet/Eclipse/Blackhole.
- **Sunbeam accent bar**: Thin rectangle (≈ 0.55" × 0.06"), top-left, on every content slide.
- **Content area**: starts at x=0.6", y=1.55" with width 12.13" (leave top strip for eyebrow + title).
- **Slide dimensions**: 13.33" × 7.5" (Google Slides widescreen 16:9).
- **Shapes**: scale from corners only — never stretch vertically or horizontally.
- **Accessibility**: every slide needs a header text box (tagged as header); no decorative images.

### Common slide types

| Type | Background | Title colour | Notes |
|------|-----------|-------------|-------|
| Cover | Ultraviolet | White | Large type (46 pt), subtitle 24 pt, team/date line 14 pt |
| Section divider | Ultraviolet | White | Team/section name at 56 pt expressive |
| Content (1-col) | Lunar 50 | Blackhole | Eyebrow label (9 pt, Lunar 700) + 24 pt header + body |
| Content (2-col) | Lunar 50 | Blackhole | Thin vertical divider at midpoint |
| Q&A | Lunar 50 | Blackhole | Header + time/ground-rules line + open notes area |
| Leadership / closing | Eclipse | White | Sunbeam accent bar, 46 pt title |

---

## Workflow

### Step 1 — Understand the deck structure

Ask (or infer from context):
- How many sections / teams?
- What slide types are needed per section?
- Any custom colour overrides?

### Step 2 — Generate the PPTX

Use the helper functions in `<skill-dir>/assets/slide_builder.py`. The file contains
re-usable functions for every common slide type and the brand colour constants.

Read it:
```
<skill-dir>/assets/slide_builder.py
```

Then write a generation script that calls those helpers, e.g.:

```python
# Example — 3-team showcase deck
from slide_builder import *

prs = new_presentation()

make_cover(prs, title="Treat Village Hall", subtitle="[Month YYYY]",
           footer="Driver: [Team Name]",
           teams="Atlas  ·  Sync Learning  ·  Async Learning")

for name, num in [("Atlas", 1), ("Sync Learning", 2), ("Async Learning", 3)]:
    make_divider(prs, name, section=f"{num}/3", note="9 min demo  ·  2 min Q&A")
    make_demo(prs, team=name)
    make_qa(prs, team=name, note="2 minutes  ·  Deeper questions → follow-up")

make_leadership_divider(prs, "Leadership", note="14 min — rolls up early if no update")
make_content(prs, eyebrow="Leadership", title="What's coming / Direction update")
make_qa(prs, team="Leadership", title="Q&A for Yuval")

save_and_report(prs, "/tmp/my_deck.pptx")
```

### Step 3 — Report the file location

Always end with a clear message:

```
Deck saved to /tmp/<filename>.pptx

To open in Google Slides:
1. Go to drive.google.com
2. Drag the file from Finder → drop it into Drive
3. Right-click → Open with → Google Slides
```

Do **not** claim the deck is in Drive until the user confirms they've done this step.

---

## Checklist before declaring done

- [ ] Lunar 50 is the default background on all content slides
- [ ] Ultraviolet used only for covers / dividers
- [ ] All titles are Blackhole (on light) or White (on dark)
- [ ] Sunbeam accent bar on every content slide
- [ ] Inter font specified on every text box
- [ ] Slide dimensions set to 13.33" × 7.5"
- [ ] File saved to `/tmp/` and user told to upload manually
