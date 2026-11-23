/** Static HTML compatibility gate for this app's strict self-only script CSP. */
import {parse, type DefaultTreeAdapterTypes} from 'parse5';

const javascriptType = /^(?:application|text)\/(?:x-)?(?:java|ecma)script$|^text\/(?:javascript1\.[0-5]|jscript|livescript)$/;

function* scriptElements(parent: DefaultTreeAdapterTypes.ParentNode): Generator<DefaultTreeAdapterTypes.Element> {
  for (const node of parent.childNodes) {
    if ('tagName' in node && node.tagName === 'script') yield node;
    if ('childNodes' in node) yield* scriptElements(node);
  }
}

export function inspectScripts(html: string, origin: string) {
  const problems: string[] = [], modules: string[] = [], externalClassic: string[] = [];
  let inlineExecutable = 0, dataScripts = 0, ignoredBeacon = 0;
  for (const [index, script] of [...scriptElements(parse(html))].entries()) {
    const attrs = new Map(script.attrs.map(attr => [attr.name, attr.value]));
    const language = attrs.get('language');
    const type = (attrs.get('type') ?? (language ? `text/${language}` : '')).trim().toLowerCase();
    const executable = !type || type === 'module' || javascriptType.test(type);
    if (!executable) { dataScripts++; continue; }
    const source = attrs.get(script.namespaceURI === 'http://www.w3.org/2000/svg' ? 'href' : 'src');
    if (source) {
      let url: URL;
      try { url = new URL(source, origin); } catch { problems.push(`script ${index}: malformed source`); continue; }
      if (url.origin !== origin) {
        if (type !== 'module' && url.origin === 'https://static.cloudflareinsights.com' && /^\/beacon(?:\.min)?\.js(?:\/|$)/.test(url.pathname)) { ignoredBeacon++; continue; }
        externalClassic.push(url.origin + url.pathname);
        problems.push(`script ${index}: executable source is not same-origin`);
      } else if (!['http:', 'https:'].includes(url.protocol)) problems.push(`script ${index}: unsupported protocol`);
      else if (type === 'module') modules.push(url.pathname + url.search);
    } else if (script.childNodes.some(node => 'value' in node && node.value.trim())) {
      inlineExecutable++;
      problems.push(`script ${index}: inline executable body conflicts with script-src self`);
    }
  }
  return {status: problems.length ? 'FAIL' : 'PASS', inline_executable: inlineExecutable, data_scripts: dataScripts, same_origin_modules: [...new Set(modules)], external_executable: externalClassic, ignored_cloudflare_beacons: ignoredBeacon, problems};
}
