# Collection introductions

Owner direction, updated November 13, 2026. This supersedes the former generated coloring
advice in `landing-guidance.json` and `number-guidance.json`.

The collection header introduces the actual printable collection. Lead with its
specific subject and natural American English search language, such as “free
panda coloring pages.” Describe varieties supported by the reviewed catalog.
Explain what visitors can find in that collection: its subject groups, drawing
varieties, or relevant activities. Do not copy a representative artwork caption
into a category header. For example, Sports introduces its current basketball,
karate, gymnastics, and winter sports collections, not Barbie fastening skates
beside a particular bench. A number collection introduces the numeral and its
designs, not an unrelated animal from one sample drawing.

File controls already explain PDF, Image, and Studio. Mention those actions only
where they help; they are not mandatory sentences in every overview.
Keep these statements natural and useful; do not repeat
keywords, list unrelated search terms, promise rankings, or write palette advice
to pad the introduction. Each collection needs distinct copy and a distinct
opening. There is no Google prescribed word count.

The current concise header copy is a collection overview, not a scene inventory.
It is deliberately separate
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
   Copy the accepted short identity exactly into `sourceIntro`, set
   `purpose: "category-overview"`, and put the individually written overview in
   `text`. This purpose records the required editorial scope; it does not claim a
   new visual review. `reviewedLandingIntroduction` invalidates it when that
   short identity changes. Never generate the overview by appending `sourceIntro`
   or an individual drawing description to a repeated opening.
4. Run `pnpm test`. The collection copy tests traverse every canonical topic,
   collection, and number series. Missing or stale entries, missing overview
   scope, duplicate openings,
   rejected padding, unsupported fixed counts, and malformed text fail the
   release checks. A runtime fallback displays only the current accepted short
   description; it never invents a longer introduction for an unreviewed topic.
5. Preview the header at phone and desktop widths. Check that the entire paragraph
   is readable and the first drawing or subject links remain easy to reach.
   Publish through the existing reviewed GitHub deployment workflow.

Artwork replacement continues to invalidate its existing image reviews through
the normal import pipeline. This copy binding is an additional text freshness
check, not a substitute for reviewing pixels or verifying uploaded files.
