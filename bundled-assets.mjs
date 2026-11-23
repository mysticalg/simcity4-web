import {decompress,hex} from './dbpf.mjs?v=0.5.0';
let manifest=null;const packCache=new Map();
async function gunzip(bytes){return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());}
async function download(url){let last;for(let attempt=0;attempt<3;attempt++){try{const r=await fetch(url,{cache:attempt?'reload':'default'});if(!r.ok)throw Error(`Asset download failed (${r.status})`);return new Uint8Array(await r.arrayBuffer());}catch(e){last=e;}}throw last;}
export async function openBundled(){
  const bytes=await gunzip(await download(new URL('./assets/index.bin?v=0.5.0',import.meta.url)));manifest=JSON.parse(new TextDecoder().decode(bytes));if(manifest.format!==1)throw Error('Unsupported asset package');return manifest.catalog;
}
async function pack(id){
  if(packCache.has(id)){const cached=packCache.get(id);packCache.delete(id);packCache.set(id,cached);return cached;}
  const task=(async()=>{const info=manifest.packs[id];if(!info)throw Error('Missing asset pack');const bytes=await download(new URL('./assets/'+info.file,import.meta.url));const digest=await crypto.subtle.digest('SHA-256',bytes),hash=[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');if(hash!==info.sha256)throw Error('Asset pack integrity check failed');const decoded=await gunzip(bytes);if(decoded.length!==info.decodedBytes)throw Error('Truncated asset pack');return decoded;})();
  packCache.set(id,task);while(packCache.size>12)packCache.delete(packCache.keys().next().value);
  try{return await task;}catch(e){packCache.delete(id);throw e;}
}
async function entry(key){const ref=manifest?.resources[key];if(!ref)throw Error('Resource unavailable: '+key);const bytes=await pack(ref[0]);return decompress(bytes.subarray(ref[1],ref[1]+ref[2]));}
export function bundledResource(query){const q=new URLSearchParams(query);return entry(q.has('archive')?'@'+q.get('archive')+':'+q.get('index'):q.get('tgi'));}
export async function bundledTexture(id,group){const key=manifest?.textures[hex(group)+':'+hex(id)]||manifest?.textures[hex(0x1abe787d)+':'+hex(id)]||manifest?.textures[hex(id)];return key?entry(key):null;}
