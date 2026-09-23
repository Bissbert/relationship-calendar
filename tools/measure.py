#!/usr/bin/env python3
"""Report repository facts used in the documentation.

This script deliberately uses only the Python standard library. It measures
the files the site serves (the same set tools/build-dist.sh copies) and the
PNGs captured for the README.
"""

from pathlib import Path
import struct


ROOT = Path(__file__).resolve().parent.parent
TEXT_GLOBS = ("index.html", "favicon.svg", "_headers", "css/*.css", "js/*.js")
BINARY_GLOBS = ("fonts/*.woff2",)


def png_size(path):
    """Return the width and height from a PNG's IHDR chunk."""
    with path.open("rb") as stream:
        if stream.read(8) != b"\x89PNG\r\n\x1a\n":
            raise ValueError(f"not a PNG: {path}")
        length = struct.unpack(">I", stream.read(4))[0]
        chunk_type = stream.read(4)
        if chunk_type != b"IHDR" or length < 8:
            raise ValueError(f"missing PNG header: {path}")
        width, height = struct.unpack(">II", stream.read(8))
        return width, height


def collect(globs):
    return [path for pattern in globs for path in sorted(ROOT.glob(pattern))]


def main():
    text_files = collect(TEXT_GLOBS)
    fonts = collect(BINARY_GLOBS)

    total_lines = 0
    total_bytes = 0
    print(f"Runtime files: {len(text_files) + len(fonts)}")
    for path in text_files:
        lines = path.read_text(encoding="utf-8").count("\n")
        size = path.stat().st_size
        total_lines += lines
        total_bytes += size
        print(f"{path.relative_to(ROOT)}: {lines} lines, {size} bytes")
    print(f"Code total: {total_lines} lines, {total_bytes} bytes")

    font_bytes = 0
    for path in fonts:
        size = path.stat().st_size
        font_bytes += size
        print(f"{path.relative_to(ROOT)}: {size} bytes")
    print(f"Font total: {font_bytes} bytes")
    print(f"Runtime total: {total_bytes + font_bytes} bytes")

    media = sorted((ROOT / "media").glob("*.png"))
    print(f"PNG media files: {len(media)}")
    for path in media:
        width, height = png_size(path)
        print(
            f"{path.relative_to(ROOT)}: {width}x{height} pixels, "
            f"{path.stat().st_size} bytes"
        )


if __name__ == "__main__":
    main()
