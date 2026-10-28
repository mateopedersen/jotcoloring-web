# JotColoring

Printable coloring pages and a browser coloring studio, built with Astro and Cloudflare Workers. The catalog uses D1 plus a separate search projection; original files, published files, private generation jobs and recovery copies use separate R2 buckets for staging and production.

The reviewed initial collection contains 18 AI-assisted illustrations. Published outlines stay monochrome except for the small orange **JotColoring™** credit at bottom right. Homepage previews compare color with the outline. Catalog PDFs must remain below **1,000,000 bytes**.

## Run locally

Use Node.js 24.19 and pnpm 11.25. Run `pnpm install --frozen-lockfile`, apply the local D1 migrations, prepare the private media with the documented data tools, and run `pnpm dev`. Original PNGs, generated derivatives, database files and credentials are deliberately excluded from this repository. A fresh checkout does not contain a fabricated catalog.

The studio saves projects and favorites in IndexedDB. It supports painting, region selection and grouping, layers, local PDF import, 500 insertable variants from 25 original vector drawings, and real PDF/WEBP/ZIP export. Imported PDF layers are flattened; semantic groups come from authored objects or explicit user grouping.

## Verify and publish

Run `pnpm check`, `pnpm test`, `python3 -m unittest discover -s tests -p ops_test.py`, and `python3 scripts/ops/secret_scan.py`. Build with `pnpm build:staging` or `pnpm build:production`. `node scripts/ops/deploy.mjs staging` checks the exact target without publishing; add `--apply` only for an authorized deployment. The same check supports `production` and refuses a build with mismatched databases or storage.

Workers Builds is the intended automatic deployment authority. The GitHub workflow verifies source without deployment credentials. See the operations guide for the final configured build commands and resource inventory.

## AI and privacy

AI inference is isolated in a dedicated **Workers Free** account. The main paid account sends signed, bounded requests to that gateway and never falls back to its own paid AI binding in `free_only` mode. Missing configuration disables generation. Cloudflare's free quota is account-wide; keep the dedicated account on Workers Free. Private inputs expire after 24 hours and generated results after seven days. Browser studio projects are not uploaded automatically.

## Documentation

- [Project state](PROJECT_STATE.md) and [resource inventory](RESOURCE_INVENTORY.md)
- [Operations and content import](docs/OPERATIONS.md)
- [Recovery](docs/RECOVERY_RUNBOOK.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Measured capacity and growth assumptions](docs/capacity-report.md)
- [PostgreSQL migration rehearsal](docs/data-migration-runbook.md)
- [Acceptance evidence](docs/acceptance.json)

An 18-record test is not a five-million-record load test. Read each evidence file's scope and outstanding checks before treating a target as verified.

## Artwork license and contact

Personal and non-commercial educational use is free under the site's artwork license. Commercial use requires written permission from **jotcoloring@gmail.com**. Publishing source code does not place the artwork in the public domain or grant exclusive rights in AI-assisted elements. JotColoring™ is a brand credit, not a claim of registered trademark status. Third-party packages retain their own licenses.
