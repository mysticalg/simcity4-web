import {readIndex,decompress,exemplar,hex} from './dbpf.mjs';
let local=false,archives=[],resources=new Map(),textureIds=new Map();
export async function openLocal(){
  if(!['127.0.0.1','localhost'].includes(location.hostname)||new URLSearchParams(location.search).has('import'))return null;
  const r=await fetch('./api/catalog');if(!r.ok)return null;local=true;return r.json();
}
export async function importFiles(files,onProgress=()=>{}){
  local=false;archives=[];resources=new Map();textureIds=new Map();const counts={},names=new Map(),models=[],cities=[];
  const selected=[...files].filter(f=>/\.(dat|sc4|sc4model|sc4desc|sc4lot)$/i.test(f.name));
  for(let k=0;k<selected.length;k++){
    const file=selected[k],head=new Uint8Array(await file.slice(0,96).arrayBuffer());if(String.fromCharCode(...head.slice(0,4))!=='DBPF')continue;
    try{
      const m=readIndex(head,file.size),idx=new Uint8Array(await file.slice(m.offset,m.offset+m.size).arrayBuffer()),fake=new Uint8Array(96+m.size);fake.set(head);fake.set(idx,96);new DataView(fake.buffer).setUint32(40,96,true);
      const entries=readIndex(fake,Math.max(file.size,fake.length)).entries,id=archives.length,name=(file.webkitRelativePath||file.name).replace(/^[^/]+\//,'');
      archives.push({file,id,name,size:file.size,count:entries.length,entries});
      entries.forEach((e,i)=>{e.archive=id;e.index=i;resources.set(e.tgi,e);counts[hex(e.type)]=(counts[hex(e.type)]||0)+1;if(e.type===0x7ab50e44)textureIds.set(e.instance,e);});
      if(/\.sc4$/i.test(name)){const e=entries.find(e=>e.type===0xa9dd6ff4&&e.instance===1);if(e)cities.push({name:name.replace(/^Regions\//,''),tgi:e.tgi,archive:id,index:e.index,subfiles:Object.fromEntries(entries.filter(e=>[0xa9bd882d,0xc9c05c6e,0xa9bc9ab6,0x49b9e602,0xc97f987c,0x2977aa47,0xa9c05c85].includes(e.type)).map(e=>[hex(e.type),e.index]))});}
    }catch(e){onProgress(`Skipping ${file.name}: ${e.message}`);}
    if(k%8===0){onProgress(`Indexing your files: ${k+1}/${selected.length}`);await new Promise(r=>setTimeout(r,0));}
  }
  const exemplars=[...resources.values()].filter(e=>e.type===0x6534284a);
  for(let i=0;i<exemplars.length;i++){
    try{const ex=exemplar(await getResource('tgi='+exemplars[i].tgi)),name=ex.props['00000020'],key=ex.props['27812820']||ex.props['27812821'];if(typeof name==='string'&&Array.isArray(key)&&key.length>=3){names.set(key.slice(0,3).map(hex).join('-'),name);for(let zoom=0;zoom<5;zoom++)for(let rot=0;rot<4;rot++)names.set([key[0],key[1],key[2]+zoom*256+rot*16].map(hex).join('-'),name+` · z${zoom+1} r${rot}`);}}catch{}
    if(i%200===0){onProgress(`Reading model names: ${i}/${exemplars.length}`);await new Promise(r=>setTimeout(r,0));}
  }
  for(const e of resources.values())if(e.type===0x5ad0e817)models.push({tgi:e.tgi,group:e.group,instance:e.instance,name:names.get(e.tgi)||e.tgi});
  if(!archives.length)throw Error('No supported game archives found. Select the installed or extracted SimCity 4 folder.');
  return {archives:archives.map(({id,name,size,count})=>({id,name,size,count})),counts,models:models.sort((a,b)=>a.name.localeCompare(b.name)),cities};
}
async function readEntry(e){if(!e)throw Error('Resource unavailable');const a=archives[e.archive],b=await a.file.slice(e.offset,e.offset+e.size).arrayBuffer();return decompress(new Uint8Array(b));}
export async function getResource(query){
  if(local){const r=await fetch('./api/resource?'+query);if(!r.ok)throw Error('Resource not found');return decompress(new Uint8Array(await r.arrayBuffer()));}
  const q=new URLSearchParams(query),e=q.has('archive')?archives[Number(q.get('archive'))]?.entries[Number(q.get('index'))]:resources.get(q.get('tgi'));return readEntry(e);
}
export async function getTexture(id,group){
  if(local){const r=await fetch(`./api/texture?id=${id}&group=${group}`);if(!r.ok)return null;return decompress(new Uint8Array(await r.arrayBuffer()));}
  const e=resources.get([0x7ab50e44,group,id].map(hex).join('-'))||resources.get([0x7ab50e44,0x1abe787d,id].map(hex).join('-'))||textureIds.get(id);return e?readEntry(e):null;
}
