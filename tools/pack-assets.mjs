import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';import crypto from 'node:crypto';
import {readIndex,decompress,hex} from '../dbpf.mjs';
const root=path.resolve(import.meta.dirname,'..'),game=path.resolve(process.env.SC4_DATA||path.join(root,'../../work/extracted/app')),out=path.join(root,'assets');
fs.mkdirSync(out,{recursive:true});
const catalog=JSON.parse(fs.readFileSync(path.join(root,'research/inventory.json'),'utf8')),archives=[],byTgi=new Map();
for(const a of catalog.archives){const file=path.join(game,a.name),fd=fs.openSync(file,'r'),head=Buffer.alloc(96);fs.readSync(fd,head,0,96,0);const m=readIndex(head,a.size),bytes=Buffer.alloc(96+m.size);head.copy(bytes);fs.readSync(fd,bytes,96,m.size,m.offset);bytes.writeUInt32LE(96,40);const entries=readIndex(bytes,Math.max(a.size,bytes.length)).entries;archives[a.id]={fd,entries};entries.forEach((e,i)=>{e.archive=a.id;e.index=i;byTgi.set(e.tgi,e);});}
const coreTypes=new Set([0x6534284a,0x05342861,0x5ad0e817,0x7ab50e44]);
const items=new Map();
for(const e of byTgi.values())if(coreTypes.has(e.type))items.set(e.tgi,e);
for(const a of catalog.archives)if(/\.sc4$/i.test(a.name))for(const e of archives[a.id].entries)items.set('@'+a.id+':'+e.index,e);
// Prefer assets observed in the default city first, so its initial download is small.
const priority=new Set();const trace=path.join(root,'../../work/startup-resources.json');
const textureById=new Map();for(const e of byTgi.values())if(e.type===0x7ab50e44)textureById.set(e.instance,e);
if(fs.existsSync(trace))for(const query of JSON.parse(fs.readFileSync(trace,'utf8'))){
  if(!query.startsWith('/api/')){priority.add(query);continue;}const u=new URL(query,'http://local'),q=u.searchParams;
  if(u.pathname==='/api/resource')priority.add(q.has('archive')?'@'+q.get('archive')+':'+q.get('index'):q.get('tgi'));
  if(u.pathname==='/api/texture'){const id=Number(q.get('id')),group=Number(q.get('group')),e=byTgi.get([0x7ab50e44,group,id].map(hex).join('-'))||byTgi.get([0x7ab50e44,0x1abe787d,id].map(hex).join('-'))||textureById.get(id);if(e)priority.add(e.tgi);}
}
const ordered=[...items].sort(([a],[b])=>Number(priority.has(b))-Number(priority.has(a))||a.localeCompare(b));
const resources={},textures={},packs=[];let parts=[],size=0,totalRaw=0,totalPacked=0;
function flush(){if(!parts.length)return;const raw=Buffer.concat(parts,size),gzip=zlib.gzipSync(raw,{level:9}),sha256=crypto.createHash('sha256').update(gzip).digest('hex'),file=`p${String(packs.length).padStart(3,'0')}-${sha256.slice(0,12)}.bin`;fs.writeFileSync(path.join(out,file),gzip);packs.push({file,sha256,bytes:gzip.length,decodedBytes:raw.length});totalPacked+=gzip.length;parts=[];size=0;}
let wasPriority=true;
for(const [key,e]of ordered){if(wasPriority&&!priority.has(key)){flush();wasPriority=false;}if(size&&size+e.size>8*1024*1024)flush();const bytes=Buffer.alloc(e.size);fs.readSync(archives[e.archive].fd,bytes,0,e.size,e.offset);resources[key]=[packs.length,size,e.size];parts.push(bytes);size+=e.size;totalRaw+=e.size;
if(!key.startsWith('@')&&e.type===0x7ab50e44){textures[hex(e.group)+':'+hex(e.instance)]=key;textures[hex(e.instance)]=key;}}
flush();
const manifest={format:1,catalog,resources,textures,packs},index=zlib.gzipSync(Buffer.from(JSON.stringify(manifest)),{level:9});fs.writeFileSync(path.join(out,'index.bin'),index);
const keep=new Set(packs.map(p=>p.file));for(const name of fs.readdirSync(out))if(/^p\d{3}-[a-f0-9]{12}\.bin$/.test(name)&&!keep.has(name))fs.unlinkSync(path.join(out,name));
for(const a of archives)if(a)fs.closeSync(a.fd);
const report={format:1,resourceCount:ordered.length,packCount:packs.length,rawBytes:totalRaw,downloadBytes:totalPacked,indexBytes:index.length,startupResources:priority.size};fs.writeFileSync(path.join(root,'research/asset-package.json'),JSON.stringify(report,null,2));console.log(report);
