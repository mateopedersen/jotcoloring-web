/** Keep the public brand on one secure origin without redirecting previews. */
export function productionCanonicalURL(url:URL,environment:string|undefined):URL|undefined {
 if(environment!=='production'||!['jotcoloring.com','www.jotcoloring.com'].includes(url.hostname))return;
 if(url.protocol==='https:'&&url.hostname==='jotcoloring.com'&&!url.port)return;
 const canonical=new URL(url);canonical.hostname='jotcoloring.com';canonical.protocol='https:';canonical.port='';return canonical;
}
