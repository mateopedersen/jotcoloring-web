"""Build complete social fonts from bundled OFL sources (fonttools and brotli).

Run from the repository root. Existing ASCII outlines and metrics must remain
identical; adding Latin Extended must not silently change accepted typography.
"""
from pathlib import Path
from tempfile import TemporaryDirectory
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.merge import Merger
from fontTools.pens.recordingPen import RecordingPen

BASE = Path("public/fonts/outfit")


def signature(font, codepoint):
    glyph = font.getBestCmap()[codepoint]
    pen = RecordingPen()
    font.getGlyphSet()[glyph].draw(pen)
    return font["hmtx"][glyph], pen.value


for weight in (550, 750, 800):
    target = BASE / f"og-outfit-{weight}.ttf"
    existing = TTFont(target)
    ascii_glyphs = {c: signature(existing, c) for c in range(32, 127)}
    with TemporaryDirectory() as directory:
        sources = []
        for subset in ("latin", "latin-ext"):
            font = TTFont(BASE / f"outfit-{subset}-wght-normal.woff2")
            font = instantiateVariableFont(font, {"wght": weight}, inplace=False)
            font.flavor = None
            source = Path(directory) / f"{subset}.ttf"
            font.save(source)
            sources.append(str(source))
        merged = Merger().merge(sources)
        for codepoint, expected in ascii_glyphs.items():
            assert signature(merged, codepoint) == expected, (weight, codepoint)
        for char in "DončićVučevićSchröderDëminJokićPorziņģisŞengün":
            assert ord(char) in merged.getBestCmap(), (weight, char)
        merged.recalcTimestamp = False
        merged.save(target)
    print(f"Complete Latin and Latin Extended font: {weight}")
