# Collection introductions

Owner direction, November 5, 2026. This supersedes the former generated coloring
advice in `landing-guidance.json` and `number-guidance.json`.

The collection header introduces the actual printable collection. Lead with its
specific subject and natural American English search language, such as “free
panda coloring pages.” Describe varieties supported by the reviewed catalog.
Explain how to choose a drawing and reach its printable PDF, image download, or
online coloring option. Keep these statements natural and useful; do not repeat
keywords, list unrelated search terms, promise rankings, or write palette advice
to pad the introduction. Each collection needs distinct copy and a distinct
opening. There is no Google prescribed word count.

The current concise header copy is 40–107 words. It is deliberately separate
from the accepted short SEO/social identity and individual artwork descriptions.
Do not overwrite those source bound records during a visitor copy edit. Current
counts remain dynamic UI data; never hard code them into prose. Do not invent
age suitability, difficulty, unseen subjects, personal authorship, or official
endorsement of branded characters or public figures.

## New or changed topics

1. Inspect the source artwork through the existing intake review process. Record
   the accepted subject, franchise, and actual scenes in the short topic identity.
2. Write the collection introduction individually. Use the real varieties in
   that topic and explain choosing, downloading, or coloring its drawings. Do not
   reuse a Welcome sentence, a palette recipe, or a shared paragraph with only
   the topic name changed.
3. Add an entry to `src/taxonomy/landing-introductions.json`. Use
   `collection:ID`, `topic:ID`, or `number:VALUE`, matching the canonical location.
   Copy the accepted short identity exactly into `sourceIntro`; put the new
   paragraph in `text`. `reviewedLandingIntroduction` invalidates it when that
   short identity changes.
4. Run `pnpm test`. The collection copy tests traverse every canonical topic,
   collection, and number series. Missing or stale entries, duplicate openings,
   rejected padding, unsupported fixed counts, and malformed text fail the
   release checks. A runtime fallback displays only the current accepted short
   description; it never invents a longer introduction for an unreviewed topic.
5. Preview the header at phone and desktop widths. Check that the entire paragraph
   is readable and the first drawing or subject links remain easy to reach.
   Publish through the existing reviewed GitHub deployment workflow.

Artwork replacement continues to invalidate its existing image reviews through
the normal import pipeline. This copy binding is an additional text freshness
check, not a substitute for reviewing pixels or verifying uploaded files.
