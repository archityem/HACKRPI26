#!/usr/bin/env python3
"""Refresh the standalone page from the editable prototype; no dependencies."""
import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "prototype" / "elsewhere.html"
OUTPUT = ROOT / "index.html"
START = "<!-- ELSEWHERE_SOURCE_START -->"
END = "<!-- ELSEWHERE_SOURCE_END -->"


def build():
    fragment = SOURCE.read_text(encoding="utf-8")
    if len(fragment.encode("utf-8")) > 1_000_000:
        raise SystemExit("Prototype source must remain under 1 MB.")
    page = OUTPUT.read_text(encoding="utf-8")
    match = re.search(r'(<iframe\b[^>]*\bdata-srcdoc=")([^"]*)(")', page)
    if not match:
        raise SystemExit("index.html is missing its preview frame.")
    document = html.unescape(match[2])
    if document.count(START) != 1 or document.count(END) != 1:
        raise SystemExit("index.html must contain exactly one source marker pair.")
    start = document.index(START) + len(START)
    end = document.index(END)
    if end < start:
        raise SystemExit("Source markers are in the wrong order.")
    document = document[:start] + "\n" + fragment + "\n" + document[end:]
    output = page[:match.start(2)] + html.escape(document, quote=True) + page[match.end(2):]
    if output != page:
        OUTPUT.write_text(output, encoding="utf-8")
    print("Ready: index.html")


if __name__ == "__main__":
    build()
