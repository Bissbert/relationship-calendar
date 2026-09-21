#!/usr/bin/env python3
"""Report repository facts used in the documentation.

This script deliberately uses only the Python standard library. It measures
the files shipped by the static app and the PNGs captured for the README.
"""

from pathlib import Path
import struct


ROOT = Path(__file__).resolve().parent.parent
RUNTIME_FILES = (
    Path("index.html"),
    Path("js/app.js"),
    Path("js/Blob.js"),
    Path("js/ics.min.js"),
    Path("js/FileSaver.min.js"),
)


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


def report_file(path):
    absolute = ROOT / path
    text = absolute.read_text(encoding="utf-8")
    return text.count("\n"), absolute.stat().st_size


def main():
    total_lines = 0
    total_bytes = 0
    print(f"Runtime files: {len(RUNTIME_FILES)}")
    for path in RUNTIME_FILES:
        lines, size = report_file(path)
        total_lines += lines
        total_bytes += size
        print(f"{path}: {lines} lines, {size} bytes")
    print(f"Runtime total: {total_lines} lines, {total_bytes} bytes")

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
