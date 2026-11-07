import {createHash,createHmac} from 'node:crypto';

const encode=(value:string)=>encodeURIComponent(value).replace(/[!'()*]/g,character=>`%${character.charCodeAt(0).toString(16).toUpperCase()}`);
const hash=(value:Uint8Array|string)=>createHash('sha256').update(value).digest('hex');
const hmac=(key:Uint8Array|string,value:string)=>createHmac('sha256',key).update(value).digest();

export function signedR2Request(input:{accountId:string;bucket:string;key:string;method:'GET'|'PUT';accessKeyId:string;secretAccessKey:string;body?:Uint8Array;headers?:Record<string,string>;now?:Date}){
 if(!/^[a-f0-9]{32}$/.test(input.accountId)||!/^[a-z0-9-]{3,63}$/.test(input.bucket)||!input.accessKeyId||!input.secretAccessKey)throw new Error('Invalid scoped R2 credentials or target.');
 if(!/^[A-Za-z0-9][A-Za-z0-9_./-]*$/.test(input.key)||input.key.includes('..'))throw new Error('Invalid scoped R2 object key.');
 const host=`${input.accountId}.r2.cloudflarestorage.com`,uri=`/${encode(input.bucket)}/${input.key.split('/').map(encode).join('/')}`,url=`https://${host}${uri}`;
 const date=(input.now||new Date()).toISOString().replace(/[:-]|\.\d{3}/g,''),dateStamp=date.slice(0,8),payloadHash=hash(input.body||new Uint8Array());
 const rawHeaders:Record<string,string>={...(input.headers||{}),'host':host,'x-amz-content-sha256':payloadHash,'x-amz-date':date};
 const entries=Object.entries(rawHeaders).map(([key,value])=>[key.toLowerCase(),value.trim().replace(/\s+/g,' ')] as const).sort(([a],[b])=>a.localeCompare(b));
 const canonicalHeaders=entries.map(([key,value])=>`${key}:${value}\n`).join(''),signedHeaders=entries.map(([key])=>key).join(';');
 const canonicalRequest=[input.method,uri,'',canonicalHeaders,signedHeaders,payloadHash].join('\n');
 const scope=`${dateStamp}/auto/s3/aws4_request`,stringToSign=['AWS4-HMAC-SHA256',date,scope,hash(canonicalRequest)].join('\n');
 const dateKey=hmac(`AWS4${input.secretAccessKey}`,dateStamp),regionKey=hmac(dateKey,'auto'),serviceKey=hmac(regionKey,'s3'),signingKey=hmac(serviceKey,'aws4_request'),signature=createHmac('sha256',signingKey).update(stringToSign).digest('hex');
 const headers:Record<string,string>={...rawHeaders,Authorization:`AWS4-HMAC-SHA256 Credential=${input.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`};
 return {url,headers};
}
