import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url);const wranglerRequire=createRequire(require.resolve('wrangler/package.json'));
const {Miniflare,convertV4MiniflareOptions}=wranglerRequire('miniflare');
export function localStorage(){return new Miniflare(convertV4MiniflareOptions({resourcePersistencePath:path.resolve('.wrangler/state/v3'),modules:true,script:'export default {fetch(){return new Response("Local seed storage")}}',compatibilityDate:'2026-10-28',d1Databases:{CATALOG_DB:'local-catalog',SEARCH_DB:'local-search'},r2Buckets:{PUBLISHED:'jotcoloring-local-published',ORIGINALS:'jotcoloring-local-originals'}}))}
