# tannvi's website

This folder is the whole website. You edit the words in `content/`, and GitHub rebuilds the site by itself a minute or two after every change.

## Adding a new poem or post

1. On GitHub, open `content/pieces/` and click **Add file → Create new file**.
2. Name it with the date and a short name, like `2026-10-02-small-hours.md`.
3. Paste this at the top and fill it in:

```
---
title: "small hours"
date: 2026-10-02
collections: [Poetry, Blues]
---
first line of the poem
second line of the poem

a new stanza starts after an empty line
```

4. Click **Commit changes**. That's it. It shows up on Scratch, in the sky, and gets its own artwork.

### Things you can put at the top

| Line | What it does |
|---|---|
| `title:` | The title. Keep the quotes. |
| `date:` | Year-month-day. Decides where it sits in the sky and the web address. |
| `collections:` | Any of `Poetry`, `Blues`, `Purple`. Poetry marks it as a poem (anything else counts as prose). Blues and Purple pick the colour. |
| `style: italic` | Sets the whole piece in italics. `bold italic` also works. |
| `warning: "Self harm"` | Hides the piece behind a gentle content note until the reader chooses to read on. |

### Writing inside a piece

- One line in the file = one line on the page.
- An empty line starts a new stanza or paragraph.
- `*like this*` makes italics, `**like this**` makes bold.
- If a line is only `--` or `~~`, or starts with a number and a full stop, put a backslash in front (`\-\-`, `\~\~`, `1\.`) so it shows exactly as typed.

## Taking a piece down

Delete its file, or move it into a folder called `content/archive/` (anything outside `content/pieces/` is not published).

## Other pages

- About page: `content/about.md`
- Links at the bottom and "Writing elsewhere": `content/links.md`
- Lists: `content/lists/before-i-die.md` and `content/lists/25-before-25.md`. Wrap an item in `~~` when it's done and the ring updates by itself.
- Anthologies: `content/anthologies.md`

## Colours and fonts

All in the first few lines of `assets/style.css`. Change `--ember` or `--maroon` and the whole site follows.

## Old WordPress links

Pieces live at the same addresses they had on WordPress (for example `/2023/11/02/we-are-grey/`), and `/category/scratch/...`, `/before-i-die/`, `/25-before-25/` and `/anthologies/` all exist too. So if tannvi.home.blog is set to redirect here, old links land on the right page.
