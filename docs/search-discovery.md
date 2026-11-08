# Shared search discovery

Search uses the existing D1 FTS5 index. No inference request, model download, catalog rewrite or new image rendition is required.

`SEARCH_COLLECTION_OPTIONS` comes from the canonical taxonomy, navigation groups and numeral series. Every shared search form uses the complete directory. Limit the number of displayed matches, never truncate the directory to the first 200 topics. A new registered subject enters this same path without a second hand-maintained suggestion list.

Collection links appear immediately from the local directory while the drawing request is debounced. Keep those links usable when suggestions fail. Label them as coloring page collections, separate from the individual drawing results. Submitted searches also show published collection links through `SearchCollections.astro`, including age-scoped searches.

Load the suggestion UI on pointer/focus/input intent so it does not increase the site's initial JavaScript graph or compete with the first artwork images. If focus precedes module initialization, process the current input after initialization. An initial `pageshow` event must not close an active search while images finish loading. Only a back/forward cache restoration resets stale UI. Preserve the keyboard-selected link when the drawing response arrives; never let a superseded request replace the current query.

Search transport is shared across the page's forms, with at most two running requests and one pending latest query. Reuse identical requests and coalesce skipped intermediate queries. Typing or closing a panel invalidates its result sequence without aborting the transport on every key. Actual Chromium and WebKit comparisons reproduced a stalled next request after that repeated cancellation. Each request has a four-second deadline including queue time; a deadline aborts that transport, clears the busy state and leaves collection navigation and ordinary submitted search usable. A late response cannot replace a newer result. Other previews and downloads retain their normal cancellation behavior.

Artwork retrieval keeps every meaningful model, character and scene term. Broad aliases may expand genuine subject identities; a specific alias such as BYD Dolphin must not expand into every BYD drawing. Discovery of a parent collection is navigation, not permission to broaden the drawing query. Preserve franchise aliases and the specific HUNTR/X identity. `topic-aliases.ts` supplies the same reviewed franchise names to retrieval and navigation. Inside a longer request, only that recognized identity expands to its published topic membership; the remaining character, model and scene terms stay required. Numbers and explicit letter names keep their exact subjects.

Natural request words are removed before the semantic token limit, so a long request does not discard the important model or scene at its end. Spelling correction uses a bounded vocabulary pass rather than separate repeated reads for every word. Do not silently drop unknown scene words to fabricate matches. Recognized subject queries keep stable cursor ordering while unrelated items publish.

Verification covers all current directory options, future directories larger than 1,000 subjects, short prefixes, exact model modifiers, long requests, typos, numeral identity, letter identity, source-scoped filters and complete cursors. Test real search suggestions with the network delayed, keyboard/touch selection, request cancellation and browser error fallback. After publishing, check actual API results and collection navigation in mobile and desktop Chromium and WebKit.

FTS5 syntax and prefix behavior follow the [official SQLite FTS5 documentation](https://www.sqlite.org/fts5.html). The ranking and scope rules above are application policy.

Run `node scripts/qa/search-discovery.mjs production` after publication (or use `staging`). Set `GITHUB_SHA` to verify the exact reviewed release. The smoke check is serial and read only.
