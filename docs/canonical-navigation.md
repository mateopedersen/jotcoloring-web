# Public catalog navigation

The owner chose `/collections/education/` for a main collection and
`/coloring-pages/numbers/111/` for an individual number. The public hierarchy now
has eleven curated collections in `src/taxonomy/navigation.ts`; it groups the
existing reviewed classification roots without rewriting artwork identities.
Every root has one navigation home. Related artwork may retain its accurate
secondary subject memberships. Distinct-row collection queries prevent double
counting artwork that belongs to several roots in one public collection.

`routes`, `categoryPath`, `catalogLocation`, `landingIdentity` and the reviewed number
subject helpers determine all menu/search/page/SEO/sitemap/notification paths.
Legacy root and nested subject URLs redirect once; existing artwork URLs remain
stable. Exact scoped numeral searches redirect to their real topic page, keeping
age, detail and pagination filters. Other searches remain ordinary search pages.
Number API scopes preserve the exact reviewed title/tag subject, signed cursor
binding and category constraints; larger numbers or scene counts cannot leak in.

Empty topics are absent from navigation and the prepared sitemap. Filtered and
empty views are noindex. Prepared XML contains canonical collections, nonempty
subjects, individual published art and the site's legitimate public pages, never
query URLs or legacy navigation aliases. Existing immutable fragments, readbacks,
generation fences, queue bounds and recovery remain in use. Jobs and web use the
same production media host when preparing image-sitemap records.

Before adding a new subject, register its identity and navigation home, review
its real artwork and short introductory text, prepare its source-bound social
cover, and run the complete route/subject coverage tests. A numeral release also
registers its reviewed number values and unique intros. The live preflight must
check every expected member, not infer counts from package names. A topic with
only a query URL is incomplete. Page metadata and the PNG cover bind to one
identity; source replacement, archive or metadata change invalidates that cover
at read time. The page can use its current verified example image while its
prepared cover is renewed. Existing content media approval gates stay in force.

The scoped navigation migration queues verified canonical upserts and actual
legacy redirects with a commit-bound revision. It backs up affected discovery
state before writes and does not delete historical receipts. A bounded operator
send can process only that revision while normal cron retains other work.
Canonical aliases coalesce before IndexNow delivery. Real live HTML, sitemap,
redirect targets and the existing verification key are checked before submission.
An accepted/key-pending receipt is not a claim of indexing. GSC and Bing sitemap
resubmission happen after live verification, through their real authenticated UI.

Owner update, November 4, replaces the November 3 prefix: all broad classification roots and curated navigation groups use `/collections/ID/`. Specific subjects use `/coloring-pages/TOPIC/`, numeral series keep `/coloring-pages/numbers/NUMBER/`, and individual artwork keeps `/coloring/SLUG/`. Ocean is a distinct navigation collection with its existing Ocean classification root. Freshwater scenery is not inferred to be Ocean merely from a water keyword.

`/coloring-pages/` is the directory; `/coloring-pages/all/` is the complete drawing gallery. `catalogAllPath` makes scoped full galleries without a `view=pages` query. The old query and every previous root, singular collection or nested subject route redirect in one hop, retaining genuine search/facet values. Changing the gallery's theme keeps it in a gallery rather than returning the visitor to a directory. The shared source-scope resolver binds continuation to the actual canonical path.

New reviewed content updates real published counts and appears in its correct existing collection and subject through the normal publication transaction. New subjects need registered identities, their accurate reviewed parent and unique source-grounded text. Broad root versus specific subject is determined by taxonomy hierarchy, never by a filename guess. Source artwork IDs, healthy PDF/WebP bytes, approvals and review versions do not change when a navigation address changes. The lightweight root route vocabulary has a coverage test against the full hierarchy.

Main directories show their child collections and immediate subjects rather than flattening all grandchildren into the same level. Source-bound covers for moved pages require new path/identity bindings and actual visual review; accepted unchanged covers are preserved. Canonical links, visible breadcrumbs, schema breadcrumbs, search suggestions, filters, related links, public caches, sitemap entries and discovery notices use the same route contract.
