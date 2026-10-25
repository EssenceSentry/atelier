# @atelier/gallery

Four sample screens (monitor, review, lab, report) in every direction. It is
the visual check for `@atelier/theme` and the place new blocks are tried before
they go into templates.

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
monitor and report at phone width, into `captures/`. It fails on a chart that
did not render or a console error.

`node scripts/check-theme.mjs <url> <png>` confirms that a single-theme build
renders its own direction with no direction switcher.

Thumbnails are generated landscapes, so the gallery needs no network and ships
no third-party images.
