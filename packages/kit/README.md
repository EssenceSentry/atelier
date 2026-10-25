# @atelier/kit

The screens, blocks and components that atelier projects start from. The
gallery renders them in every direction, and the project template copies them
into each new project, so the gallery's screenshots check exactly what
projects get.

| Folder | What it holds |
|---|---|
| `src/screens` | One starting screen per project kind: monitor, review, lab, report |
| `src/blocks` | App bar, stat tiles, status badges, sparklines, meters, chart frame, loading, empty and error states, live indicator, generated thumbnails |
| `src/components/ui` | shadcn/ui components on Base UI, as the shadcn CLI generated them |
| `src/lib` | Example data, `cn`, and `useLiveState` for state served over server-sent events |

Files import each other through the `@/` alias, which every app points at this
folder (the gallery) or at its own copy (generated projects).
