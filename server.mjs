import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readIndex,decompress,exemplar,hex} from './dbpf.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const game=path.resolve(process.env.SC4_DATA || path.join(root,'../../work/extracted/app'));
const archives=[],resources=new Map(),models=[],cities=[],counts={},names=new Map();
function scan(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())scan(p);else if(/\.(dat|sc4|sc4model|sc4desc|sc4lot)$/i.test(e.name)){
  const fd=fs.openSync(p,'r'),size=fs.statSync(p).size,head=Buffer.alloc(96);fs.readSync(fd,head,0,96,0);
  if(head.toString('ascii',0,4)!=='DBPF'){fs.closeSync(fd);continue;}
  const meta=readIndex(head,size),buf=Buffer.alloc(meta.size+96);head.copy(buf);const idx=Buffer.alloc(meta.size);fs.readSync(fd,idx,0,meta.size,meta.offset);
  // Build a compact synthetic archive for the shared index parser.
  const fake=Buffer.alloc(96+meta.size);head.copy(fake);idx.copy(fake,96);fake.writeUInt32LE(96,40);
  const entries=readIndex(fake,Math.max(size,fake.length)).entries;
  const id=archives.length,archive={id,name:path.relative(game,p).replaceAll('\\','/'),size,count:entries.length,fd,entries};archives.push(archive);
  entries.forEach((e,i)=>{e.archive=id;e.index=i;resources.set(e.tgi,e);counts[hex(e.type)]=(counts[hex(e.type)]||0)+1;});
}}}
function raw(e){const a=Buffer.alloc(e.size);fs.readSync(archives[e.archive].fd,a,0,e.size,e.offset);return a;}
function data(e){return decompress(raw(e));}
if(!fs.existsSync(game)){console.error('Game data missing. Set SC4_DATA to the extracted/installed SimCity 4 folder.');process.exit(1);}
scan(game);
for(const e of resources.values())if(e.type===0x6534284a){try{const ex=exemplar(data(e)),name=ex.props['00000020'],r=ex.props['27812820']||ex.props['27812821'];if(typeof name==='string'&&Array.isArray(r)&&r.length>=3){names.set([r[0],r[1],r[2]].map(hex).join('-'),name);for(let zoom=0;zoom<5;zoom++)for(let rot=0;rot<4;rot++)names.set([r[0],r[1],r[2]+zoom*256+rot*16].map(hex).join('-'),name+` · z${zoom+1} r${rot}`);}}catch{}}
for(const e of resources.values())if(e.type===0x5ad0e817)models.push({tgi:e.tgi,group:e.group,instance:e.instance,name:names.get(e.tgi)||e.tgi});
for(const a of archives)if(/\.sc4$/i.test(a.name)){const e=a.entries.find(e=>e.type===0xa9dd6ff4&&e.instance===1);if(e)cities.push({name:a.name.replace(/^Regions\//,''),tgi:e.tgi,archive:a.id,index:e.index,subfiles:Object.fromEntries(a.entries.filter(e=>[0xa9bd882d,0xc9c05c6e,0xa9bc9ab6,0x49b9e602,0xc97f987c,0x2977aa47,0xa9c05c85].includes(e.type)).map(e=>[hex(e.type),e.index]))});}
const summary={archives:archives.map(({id,name,size,count})=>({id,name,size,count})),counts,models:models.sort((a,b)=>a.name.localeCompare(b.name)),cities};
fs.mkdirSync(path.join(root,'research'),{recursive:true});fs.writeFileSync(path.join(root,'research/inventory.json'),JSON.stringify(summary,null,2));
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.ico':'image/x-icon'};
const server=http.createServer((req,res)=>{try{
  const u=new URL(req.url,'http://localhost');
  if(u.pathname==='/api/catalog'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(summary));return;}
  if(u.pathname==='/api/resource'){
    let e;if(u.searchParams.has('archive'))e=archives[Number(u.searchParams.get('archive'))]?.entries[Number(u.searchParams.get('index'))];else e=resources.get(u.searchParams.get('tgi'));
    if(!e){res.writeHead(404);res.end('Resource not found');return;}
    res.setHeader('Content-Type','application/octet-stream');res.end(raw(e));return;
  }
  if(u.pathname==='/api/texture'){
    const id=Number(u.searchParams.get('id')),group=Number(u.searchParams.get('group'));
    const e=resources.get([0x7ab50e44,group,id].map(hex).join('-'))||resources.get([0x7ab50e44,0x1abe787d,id].map(hex).join('-'))||[...resources.values()].find(e=>e.type===0x7ab50e44&&e.instance===id);
    if(!e){res.writeHead(404);res.end('Texture unavailable');return;}res.end(raw(e));return;
  }
  const p=path.resolve(root,'.'+decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));
  if(!p.startsWith(root+path.sep)||p.includes(path.sep+'.')){res.writeHead(403);res.end();return;}
  if(!fs.existsSync(p)||!fs.statSync(p).isFile()){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',mime[path.extname(p)]||'application/octet-stream');fs.createReadStream(p).pipe(res);
}catch(e){res.writeHead(500);res.end(e.message);}});
server.listen(Number(process.env.PORT||4174),'127.0.0.1',()=>console.log(`SC4 Web foundation: http://127.0.0.1:${server.address().port}\n${archives.length} archives, ${resources.size} unique resources, ${models.length} models, ${cities.length} city terrains. Data: ${game}`));
