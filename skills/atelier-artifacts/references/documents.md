# Documents and media

Markdown: family/mount `markdown`, `{source}`. GFM tables, task lists, strikethrough,
math (`$...$`, `$$...$$`) through KaTeX. Raw HTML is omitted; links pass through
react-markdown's URL checks. It spans the full card width in every theme.

MyST: family/mount `myst`, `{source,references?}`. Real MyST AST parsing in a worker
supports directives/admonitions, roles, math, cross references, proofs, tabs,
definition lists and citations. `references` is keyed by citation id, with
`{label,title,note?}`. Unknown directives and unresolved references remain visible.
No Sphinx/autodoc, Python execution, project-wide cross-document build or arbitrary
raw HTML. Limits: 500,000 characters, eight-second parse timeout.

MyST matches the syntax family of the user's documentation; it does not import
auto-classifier's docs build plugins or copy its theme. Use the recipe's syntax;
verify any additional directive rather than assuming full Sphinx compatibility.

Media: family/mount `media`, one of:

```js
{type:"compare",before:dataURL,after:dataURL,beforeAlt:"Original",afterAlt:"Processed",position:50}
{type:"image",src:dataURL,alt:"Evidence image"}
{type:"audio",src:dataURL}
{type:"video",src:dataURL,track:{src:vttDataURL,kind:"captions",srclang:"en",label:"English"}}
```

The comparison slider is keyboard-accessible and updates its clipping boundary.
Pass `controls: cell.controls` for a left control rail (create that cell with
`controls:true`); retain this option on updates. The adapter owns its slider/zoom
controls and removes them on updates/destroy. Canvas snapshots omit the DOM rail.
Images have pan/zoom/reset. Browser media controls handle playback. Supply local
embedded/data sources in portable artifacts; a path on the author's computer will
not work in a delivered HTML file. Avoid giant videos in portable HTML.

Carousel: family/mount `carousel`, `{slides:[{src?,alt?,title?,text?}],embla?,onSelect?}`.
Real Embla supports swipe and previous/next buttons. Use slides for parallel evidence,
not as the main notebook navigation. Do not autoplay analytical content by default.
