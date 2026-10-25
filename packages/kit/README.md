# @atelier/kit

The screens, blocks and components that atelier apps start from. The gallery
renders them in every direction and mode.

| Folder | What it holds |
|---|---|
| `src/screens` | One starting screen per kind: monitor, review, lab, report |
| `src/blocks` | App bar, stat tiles, status badges, sparklines, meters, chart frame, generated thumbnails |
| `src/components/ui` | shadcn/ui components on Base UI, as the shadcn CLI generated them |
| `src/lib` | Example data and `cn` |

Files import each other through the `@/` alias, which the gallery points at
this folder.
