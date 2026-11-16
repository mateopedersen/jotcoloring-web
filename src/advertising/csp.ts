import {permitsAdvertising} from './model';
import {ADVERTISING_PROVIDER_ORIGIN} from './units';

// Advertising permissions are limited to the clean adult-specific route. The
// client still requires both fresh on-page age confirmation and separate consent.
export function jotContentSecurityPolicy(url:URL){
 const eligible=permitsAdvertising(url.pathname,url.search,url.hash);
 const ad=eligible?` ${ADVERTISING_PROVIDER_ORIGIN}`:'';
 const adImages=eligible?' https://static.nresystems.com https://cdn.storageimagedisplay.com':'';
 // The unmodified provider tag creates an about:blank frame with a rotating
 // inline creative. Its per-impression body cannot be pinned with a CSP hash.
 // Allow that mechanism only here; HTML event attributes remain blocked.
 const adInline=eligible?" 'unsafe-inline'":'';
 return `default-src 'self'; img-src 'self' data: blob: https://media.jotcoloring.com https://assets.jotcoloring.com${ad}${adImages}; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'wasm-unsafe-eval'${ad}${adInline}; script-src-attr 'none'; worker-src 'self' blob:; connect-src 'self' https://media.jotcoloring.com https://assets.jotcoloring.com ws://127.0.0.1:*${ad}; frame-src ${ad?"'self' ":''}https://docs.google.com${ad}; frame-ancestors 'none'; base-uri 'self'; form-action 'self'${eligible?"; object-src 'none'":''}`;
}
