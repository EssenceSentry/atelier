# atelier: notes for coding agents

atelier is a starter kit and a Copier template. To start a new app, generate
it (see README.md) instead of copying files from here. These notes are for
working on atelier itself.

## Where things live

- `packages/theme`: the three directions. Tokens are single `light-dark()`
  pairs; the Vite plugin picks the direction and builds artifacts.
- `packages/kit/src`: the screens, blocks, shadcn components and example data
  that both the gallery and generated projects use. Files import each other
  through `@/`.
- `apps/gallery`: renders every screen in every direction and mode; its
  scripts take the screenshots.
- `template/` and `copier.yml`: the project template. Most of its code is
  symlinks into `packages/`, so a kit change reaches new projects without
  copying. Template syntax is `[[ ]]` and `[% %]`; a literal `[[` needs
  `[% raw %]`.

## Before committing

```bash
npm run lint && npm run typecheck
node template/scripts/check-colours.mjs packages/kit/src
npm run gallery              # then, in another shell:
npm run capture              # screenshots of every screen, direction and mode
npm run try-template -- --kind <kind> --theme <theme>
```

Run `try-template` for every kind a change can affect. For visual changes
to the theme or the kit, offer reviews of the gallery by the `ui-critic` and
`hig-critic` agents (`agents/`, linked into `~/.claude/agents`).
`node packages/theme/scripts/contrast.mjs` measures every text token on every
surface; it reports known failures today, and becomes a CI gate once the
tokens pass. Generated code must
already pass its own Biome and colour checks; a failing hook fails the first
commit.

## Rules

- Colours come from theme tokens. Wrap deliberate content colours in
  `check-colours: off` / `check-colours: on` comments that say why.
- Keep chart series in their validated slot order; never cycle past the last.
- Keep actions pinned by commit hash with the version in a comment, and use
  the same hashes here and in `template/`.
- `skills/atelier/SKILL.md` is the skill agents load to use atelier. Update it in the
  same commit as any change to what projects get or how to start one.
- Commit messages never credit an AI assistant as an author. Stage explicit
  paths, never `git add -A` or `git add .`.
