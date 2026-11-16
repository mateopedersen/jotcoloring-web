import {permitsAdvertising} from './model';
import {ADVERTISING_PROVIDER_ORIGIN} from './units';

// Advertising permissions are limited to the clean adult-specific route. The
// client still requires both fresh on-page age confirmation and separate consent.
export function jotContentSecurityPolicy(url:URL){
 const ad=permitsAdvertising(url.pathname,url.search)?` ${ADVERTISING_PROVIDER_ORIGIN}`:'';
 return `default-src 'self'; img-src 'self' data: blob: https://media.jotcoloring.com https://assets.jotcoloring.com${ad}; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'wasm-unsafe-eval'${ad}; worker-src 'self' blob:; connect-src 'self' https://media.jotcoloring.com https://assets.jotcoloring.com ws://127.0.0.1:*${ad}; frame-src ${ad?"'self' ":''}https://docs.google.com${ad}; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`;
}
