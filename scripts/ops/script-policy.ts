/** Static HTML compatibility gate for this app's strict self-only script CSP. */
export function inspectScripts(html: string, origin: string) {
  const problems: string[] = [], modules: string[] = [], externalClassic: string[] = [];
  let inlineExecutable = 0, dataScripts = 0, ignoredBeacon = 0;
  for (const [index, match] of [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].entries()) {
    const attrs: Record<string,string> = {};
    for (const attr of match[1].matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) attrs[attr[1].toLowerCase()] = attr[2] ?? attr[3] ?? attr[4] ?? '';
    const type = (attrs.type || '').trim().toLowerCase();
    const executable = !type || type === 'module' || /^(text|application)\/(java|ecma)script$/.test(type);
    if (!executable) { dataScripts++; continue; }
    if (attrs.src) {
      let url: URL;
      try { url = new URL(attrs.src.replaceAll('&amp;', '&'), origin); } catch { problems.push(`script ${index}: malformed source`); continue; }
      if (url.origin !== origin) {
        if (type !== 'module' && url.hostname === 'static.cloudflareinsights.com' && /^\/beacon(?:\.min)?\.js(?:\/|$)/.test(url.pathname)) { ignoredBeacon++; continue; }
        externalClassic.push(url.origin + url.pathname);
        problems.push(`script ${index}: executable source is not same-origin`);
      } else if (!['http:', 'https:'].includes(url.protocol)) problems.push(`script ${index}: unsupported protocol`);
      else if (type === 'module') modules.push(url.pathname + url.search);
    } else if (match[2].trim()) { inlineExecutable++; problems.push(`script ${index}: inline executable body conflicts with script-src self`); }
  }
  return {status: problems.length ? 'FAIL' : 'PASS', inline_executable: inlineExecutable, data_scripts: dataScripts, same_origin_modules: [...new Set(modules)], external_executable: externalClassic, ignored_cloudflare_beacons: ignoredBeacon, problems};
}
