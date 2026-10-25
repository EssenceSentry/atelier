"""Print a page of Apple's Human Interface Guidelines as plain text.

The HIG site renders with JavaScript, but each page is also served as DocC
JSON. This turns that JSON into readable text for a reviewing agent.

    python3 hig-text.py charting-data
    python3 hig-text.py --index      # the page slugs linked from the HIG home
"""

from __future__ import annotations

import json
import sys
import urllib.request

BASE = "https://developer.apple.com/tutorials/data/design/human-interface-guidelines"


def fetch(slug: str) -> dict:
    """Download one HIG page as DocC JSON."""
    path = f"{BASE}/{slug}.json" if slug else f"{BASE}.json"
    with urllib.request.urlopen(path, timeout=30) as response:  # noqa: S310 - fixed Apple host
        return json.load(response)


def inline(parts: list[dict], refs: dict) -> str:
    """Flatten inline content: text, emphasis, code and references."""
    out = []
    for part in parts:
        kind = part.get("type")
        if kind == "text":
            out.append(part.get("text", ""))
        elif kind in ("emphasis", "strong", "newTerm"):
            out.append(inline(part.get("inlineContent", []), refs))
        elif kind == "codeVoice":
            out.append(f"`{part.get('code', '')}`")
        elif kind == "reference":
            out.append(refs.get(part.get("identifier", ""), {}).get("title", ""))
        elif kind == "image":
            continue
        else:
            out.append(inline(part.get("inlineContent", []), refs))
    return "".join(out)


def blocks(items: list[dict], refs: dict, indent: str = "") -> list[str]:
    """Render block content (headings, paragraphs, lists, asides, tables)."""
    lines = []
    for block in items:
        kind = block.get("type")
        if kind == "heading":
            lines += ["", f"{'#' * block.get('level', 2)} {block.get('text', '')}"]
        elif kind == "paragraph":
            lines.append(indent + inline(block.get("inlineContent", []), refs))
        elif kind in ("unorderedList", "orderedList"):
            for item in block.get("items", []):
                body = blocks(item.get("content", []), refs)
                text = " ".join(line.strip() for line in body if line.strip())
                lines.append(f"{indent}- {text}")
        elif kind == "aside":
            body = blocks(block.get("content", []), refs)
            text = " ".join(line.strip() for line in body if line.strip())
            lines.append(f"{indent}> {text}")
        elif kind == "table":
            for row in block.get("rows", []):
                cells = [" ".join(blocks(cell, refs)).strip() for cell in row]
                lines.append(indent + " | ".join(cells))
    return lines


def main(argv: list[str]) -> int:
    """Print the requested page, or the index of page slugs."""
    if not argv:
        print(__doc__)
        return 2
    if argv[0] == "--index":
        page = fetch("")
        slugs = sorted(
            ref["url"].rsplit("/", 1)[-1]
            for ref in page.get("references", {}).values()
            if ref.get("url", "").startswith("/design/human-interface-guidelines/")
        )
        print("\n".join(dict.fromkeys(slugs)))
        return 0
    page = fetch(argv[0])
    refs = page.get("references", {})
    title = page.get("metadata", {}).get("title", argv[0])
    lines = [f"# {title}", "", inline(page.get("abstract", []), refs)]
    for section in page.get("primaryContentSections", []):
        lines += blocks(section.get("content", []), refs)
    print("\n".join(lines).strip())
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
