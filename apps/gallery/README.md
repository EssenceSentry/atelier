# @atelier/gallery

Renders the kit's four screens (monitor, review, lab, report) in every
direction and mode, plus a states page with the loading, empty, error and
status blocks. The screens, blocks and components live in
`packages/kit`; this app adds only the switcher. It is the visual check for
the theme and the kit, and so for what generated projects start from.

```bash
npm run dev:board   # every direction; ?d=, ?m= and ?s= pick direction, mode, screen
npm run dev         # the direction set in app.config.json, instrument by default
```

## Checks

With `dev:board` running on port 5188:

```bash
npm run capture
```

It screenshots every direction, mode and screen at desktop size, plus the
four screens at phone width, into `captures/`. It fails on a chart that
did not render or a console error.

`node scripts/check-theme.mjs <url> <png>` confirms that a single-theme build
renders its own direction with no direction switcher.

Thumbnails are generated landscapes, so the gallery needs no network and ships
no third-party images.

## As an artifact

```bash
npm run build:artifact
node scripts/check-artifact.mjs
```

The build writes `dist/artifact/index.html`, ready to publish as a claude.ai
artifact. The check loads it in a page shaped like the artifact host's, with a
similar content security policy, and fails if light or dark does not follow the
system setting and `data-theme`, if a chart does not render in any direction or
screen, or if the page scrolls sideways at phone width.
