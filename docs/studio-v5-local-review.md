# Studio v5 — local review

Local verification completed on 2026-10-30. Publication is tracked separately in the GitHub release pull requests and deployment receipt. No new paid service or paid inference is introduced.

## Content and scope

The shelf contains 10,000 generated compositions, not 10,000 separately hand-drawn illustrations: 125 source-bound vector subjects × 20 composition layouts × 4 geometry/detail variants. The original 1,000-page module remains as a legacy compatibility/test fixture; the active shelf uses v5. The Elements library has 817 choices: 125 clean subject objects, 192 decorative variants, and the existing 500 ornamented objects.

## Creative capabilities

1. **10,000 coloring compositions** — Choose among 125 vector subjects in 20 layouts and four detail levels. (library-10000)
2. **100 additional subject drawings** — Explore new animals, buildings, instruments, toys, food, and patterns. (subjects-new)
3. **Detail that changes the drawing** — Each difficulty changes actual ornament and pattern density. (detail-geometry)
4. **Twenty composition families** — Try portraits, arches, postcards, mandalas, quilts, and more. (scene-layouts)
5. **Save a starter to your shelf** — Keep a coloring page before opening a project. (shelf-favorites)
6. **Recently opened starters** — Return to your last 80 opened starter pages. (shelf-recent)
7. **Mark a page as finished** — Track which starter compositions you have completed. (shelf-finished)
8. **Hide finished pages** — Explore pages you have not marked as completed. (shelf-hide)
9. **Compact or comfortable cards** — Choose how many previews fit on your shelf. (library-density)
10. **Remember your library filters** — Return to the same filters on this device. (library-memory)
11. **Filter by an exact subject** — Focus on any of the 125 drawing subjects. (subject-filter)
12. **Filter by composition** — Find arches, shelf layouts, geometric mosaics, or another layout. (layout-filter)
13. **Combine difficulty levels** — Browse more than one detail level at once. (multi-detail)
14. **Search familiar subject names** — Find a rabbit with bunny, a cat with kitty, and more. (library-aliases)
15. **Alphabetical browsing** — Put the shelf in title order. (library-name-sort)
16. **Simple-to-detailed browsing** — Order the current results by difficulty. (library-detail-sort)
17. **Remove one filter at a time** — Use visible filter chips without resetting everything. (filter-chips)
18. **Clear filters together** — Return to the full shelf with one action. (filter-reset)
19. **Inspect before opening** — See a larger drawing before creating an artwork project. (starter-preview)
20. **Magnify the preview** — Look closely at small coloring spaces. (starter-magnify)
21. **Compare four detail levels** — Keep the subject and layout while changing difficulty. (starter-level-compare)
22. **Related compositions** — Preview other layouts of the same subject. (starter-related)
23. **A subject palette to start with** — Open a page with optional coordinated colors. (starter-palette)
24. **A daily page** — A consistent daily suggestion from the shelf. (starter-daily)
25. **A non-repeating surprise** — Choose a random result, avoiding repeats in the current session. (starter-surprise)
26. **Jump to a result page** — Reach any page in your current filtered shelf. (starter-page-jump)
27. **Import and export your shelf** — Move saved and finished starter IDs between browsers. (shelf-portable)
28. **Download original vector line art** — Save the code-authored SVG for a starter. (starter-svg)
29. **Download a blank PNG** — Keep an uncolored image without first making a project. (starter-png)
30. **Download a blank PDF** — Get a print document below the 1 MB limit. (starter-pdf)
31. **192 decorative element variants** — Add colorable frames, ribbons, seals, nature motifs, and symbols. (decorative-elements)
32. **125 standalone subject elements** — Build your own scene with the same vector subjects. (subject-elements)
33. **Arrange elements in a row** — Space unlocked elements evenly across the canvas. (element-row)
34. **Arrange elements in a grid** — Build a neatly spaced set of elements. (element-grid)
35. **Arrange elements in a circle** — Build circular compositions from unlocked elements. (element-ring)
36. **Center or fit a selected element** — Place an element in the middle and size it to the page. (element-center-fit)
37. **Mirror an element left to right** — Reflect geometry and its fillable parts together. (element-flip-x)
38. **Mirror an element top to bottom** — Reflect geometry vertically. (element-flip-y)
39. **Lock an element** — Protect its position and colors from accidental changes. (element-lock)
40. **Color an element with your palette** — Fill named parts while keeping matching parts coordinated. (element-palette)
41. **Copy and paste element colors** — Transfer colors between matching named parts. (element-color-transfer)
42. **Reset element colors** — Return one unlocked element to its original line art. (element-clear-colors)
43. **Eight lettering recipes** — Try storybook, bold, outlined, handwritten, and other styles. (lettering-styles)
44. **Curved lettering** — Bend text upward or downward while keeping it editable. (lettering-curve)
45. **Letter spacing** — Give individual letters more or less room. (lettering-tracking)
46. **Line spacing** — Control the space between lines of a text object. (lettering-lines)
47. **Adjustable outline lettering** — Choose the stroke width of colorable text. (lettering-outline-width)
48. **Soft text shadow** — Give a text object a little depth. (lettering-shadow)
49. **Center text on the page** — Align and position a selected text object together. (lettering-center)
50. **Duplicate a text object** — Keep its font, curve, color, and spacing. (lettering-duplicate)
51. **Change text capitalization** — Choose uppercase, lowercase, or title case. (lettering-case)
52. **Four ready-made heading starters** — Start a birthday page, thank-you note, or personal masterpiece. (lettering-templates)
53. **Named color stories** — Keep up to 32 reusable palettes on this device. (named-palettes)
54. **Canvas-side quick colors** — Use swatches beside the canvas, or the number keys 1–9. (quick-palette)
55. **Purpose-built layer starters** — Add background, multiply shadow, or screen highlight layers. (smart-layers)
56. **Undo only the active layer’s last mark** — Keep later work on other layers. (layer-last-mark)
57. **Woven, brick, and scallop fills** — Use three additional two-color fill patterns. (fill-materials)
58. **Twelve- and sixteen-part symmetry** — Create denser radial paintings. (radial-more)
59. **Optional coloring timer** — Pause automatically while the tab is hidden. (session-timer)
60. **Searchable tool finder** — Use Ctrl or Command K to find a Studio action. (tool-finder)

## Photo converter

The existing MIT-licensed Informative Drawings model remains local. A source-supported contour cleanup follows it: weak isolated texture is removed, short weak branches are pruned on a temporary topology map, closed loops and strong lines are retained, and the original coordinate grid is preserved. A new cleanup-strength control is separate from detail and smoothing. Manual correction tools can erase, restore, and close a gap; corrections are bounded, undoable, and included in downloads and Studio. No newly trained model or universal likeness score is claimed.

Research references: [Informative Drawings author project](https://carolineec.github.io/informative_drawings/), [original code](https://github.com/carolineec/informative-drawings), [XDoG paper](https://www.cs.princeton.edu/courses/archive/spring18/cos426/papers/Winnemoeller12.pdf). Interaction references: [Procreate color workflow](https://help.procreate.com/procreate/handbook/colors/colors-interface), [Krita multibrush](https://docs.krita.org/en/reference_manual/tools/multibrush.html), [W3C dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

## Storage and compatibility

Favorites, completion marks, named palettes, and projects stay in the browser. The shelf JSON is bounded and validated. Existing project schema 3 remains supported; lettering and element transform fields are optional. Editable backup validation accepts the new fields and rejects nonfinite or unbounded values. SVG starter downloads are real native vector paths; painted Studio SVG exports remain embedded raster artwork, as labeled in the UI.

## Verification

- 10,000/10,000 compositions rasterized to distinct, nonempty grayscale images. No duplicate rendered output at the tested 128 × 176 resolution.
- All 125 subjects visually inspected in five contact sheets.
- Machine-readable catalog evidence: outputs/studio-v5/catalog-audit.json.
- Eight photo types compared locally, including the previously supplied portrait, a second portrait, cat, cup, rocket, grayscale, dark, and rotated inputs. Private source images and comparisons remain in ignored .local storage. These are regression examples, not proof for every possible photo.
- Browser interaction and final test results are recorded in outputs/studio-v5/verification.json after QA.

## Homepage

Section spacing is shared, large-screen category navigation stays alongside long galleries, and incomplete filtered rows fill the available width. Existing public catalog content and publication state are unchanged.

## Final local QA

299 tests passed, 0 failed. Type check: 0 errors and 0 warnings (one pre-existing browser-API deprecation hint). Production build and route bundle budgets passed. The seven Studio inspector panels had no horizontal overflow at 390 px. Homepage and photo page were checked at 320, 390, 768, and 1440 target widths.

A real browser conversion took 6.8 seconds on this workstation; this is not a mobile performance guarantee. Its PDF download was 50,992 bytes. A painted Studio project with curved lettering exported successfully in seven formats; its PDF was 89,683 bytes and the WEBP was 42,044 bytes. Editable backup validation covers the new lettering, locks, reflection, and fill-rule fields.

The first complete raster audit found 96 duplicate difficulty variants; those were corrected. The final complete pass contains 10,000 distinct, nonempty grayscale renderings and no failures. This verifies variation and raster validity, not a claim that every composition was individually hand illustrated or visually reviewed.
