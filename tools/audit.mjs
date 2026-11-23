import fs from 'node:fs';
import path from 'node:path';
import {readIndex,decompress,s3d,fsh,terrain,exemplar,hex} from '../dbpf.mjs';
const game=path.resolve(process.env.SC4_DATA||'../../work/extracted/app'),report={archives:0,entries:0,types:{},decoded:{},failures:[]};
function visit(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,item.name);if(item.isDirectory())visit(p);else if(/\.(dat|sc4)$/i.test(p)){
  const bytes=fs.readFileSync(p);if(bytes.toString('ascii',0,4)!=='DBPF')continue;
  const index=readIndex(bytes);report.archives++;report.entries+=index.count;
  for(const e of index.entries){const type=hex(e.type);report.types[type]=(report.types[type]||0)+1;const fn={0x5ad0e817:s3d,0x7ab50e44:fsh,0xa9dd6ff4:terrain,0x6534284a:exemplar}[e.type];if(!fn)continue;
    // Terrain archives contain additional resources of the same type at other groups.
    if(e.type===0xa9dd6ff4&&(e.group!==0xe98f9525||e.instance!==1))continue;
    try{fn(decompress(bytes.subarray(e.offset,e.offset+e.size)));report.decoded[type]=(report.decoded[type]||0)+1;}catch(err){report.failures.push({archive:path.relative(game,p),tgi:e.tgi,error:err.message});}
  }
}}}
visit(game);fs.mkdirSync('research',{recursive:true});fs.writeFileSync('research/decoder-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,failures:report.failures.length},null,2));
