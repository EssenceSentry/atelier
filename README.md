# atelier

An opinionated starter kit for the tools I build with agents: live job
monitors, human review stations, explorable labs and analytical reports. The
goal is that an agent starts from finished, consistent pieces instead of
building a plain version from scratch.

## Layout

| Path | What it is |
|---|---|
| [packages/theme](packages/theme) | Three visual directions as tokens, with Instrument as the default |
| [apps/gallery](apps/gallery) | Every screen in every direction; the visual check |

## Stack

Static single-page apps: Vite, React, TypeScript, Tailwind v4, shadcn/ui on
Base UI, Observable Plot for charts, Playwright for screenshot checks. Python
tools serve the built files from their wheel with FastAPI and push updates
over server-sent events.

## Choosing a direction

Each project sets `theme` in its `app.config.json` to `instrument` (default),
`editorial` or `console`. See [packages/theme](packages/theme/README.md).

## Run the gallery

```bash
npm install
npm run gallery
```

## Not built yet

- Project templates for monitor, review, lab and report, with the theme as a
  generator question.
- A block registry that agents add pieces from.
- An agent skill that picks the template and runs the screenshot check.
- The Python side: a FastAPI server with live updates and the wheel packaging
  of built files.
