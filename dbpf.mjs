// DBPF 1.0, RefPack/QFS, FSH, S3D and binary exemplar readers.
// Format references and attribution: THIRD_PARTY.md.
export const hex = n => (n >>> 0).toString(16).padStart(8, '0');
const ascii = (a, p, n) => new TextDecoder('windows-1252').decode(a.subarray(p, p+n));
export function readIndex(bytes, fileSize=bytes.length) {
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(ascii(bytes,0,4)!=='DBPF') throw Error('Not a DBPF archive');
  if(v.getUint32(4,true)>1 || v.getUint32(8,true)!==0 || v.getUint32(32,true)!==7) throw Error('Only DBPF 1.0 / index 7 supported');
  const count=v.getUint32(36,true), offset=v.getUint32(40,true), size=v.getUint32(44,true);
  if(count>2000000 || size!==count*20 || offset+size>fileSize) throw Error('Invalid DBPF index');
  if(bytes.length<offset+size) return {count,offset,size};
  const entries=[];
  for(let i=0;i<count;i++) {
    const p=offset+i*20, type=v.getUint32(p,true), group=v.getUint32(p+4,true), instance=v.getUint32(p+8,true), start=v.getUint32(p+12,true), length=v.getUint32(p+16,true);
    if(start+length>fileSize) throw Error('Resource outside archive');
    entries.push({type,group,instance,offset:start,size:length,tgi:[type,group,instance].map(hex).join('-')});
  }
  return {count,offset,size,entries};
}
export function decompress(a) {
  if(a.length<9 || a[4]!==0x10 || a[5]!==0xfb) return a;
  const length=(a[6]<<16)|(a[7]<<8)|a[8], out=new Uint8Array(length);
  let p=9, d=0, done=false;
  function literals(n){if(p+n>a.length || d+n>length) throw Error('Truncated QFS literals');out.set(a.subarray(p,p+n),d);p+=n;d+=n;}
  function back(offset,n){if(offset>d||d+n>length)throw Error('Invalid QFS back reference');for(let i=0;i<n;i++){out[d]=out[d-offset];d++;}}
  while(p<a.length&&!done){
    const c=a[p++];let n,o,b,e;
    if(c<0x80){b=a[p++];n=c&3;o=((c&0x60)<<3)+b+1;literals(n);back(o,((c&0x1c)>>2)+3);}
    else if(c<0xc0){b=a[p++];e=a[p++];literals(b>>6);back(((b&63)<<8)+e+1,(c&63)+4);}
    else if(c<0xe0){b=a[p++];e=a[p++];const f=a[p++];literals(c&3);back(((c&16)<<12)+(b<<8)+e+1,((c&12)<<6)+f+5);}
    else if(c<0xfc)literals(((c&31)<<2)+4);
    else {literals(c&3);done=true;}
  }
  if(d!==length)throw Error(`QFS size mismatch: ${d}/${length}`);
  return out;
}
export function exemplar(a){
  if(!['EQZB','CQZB'].includes(ascii(a,0,4)))throw Error('Text exemplar unsupported');
  const v=new DataView(a.buffer,a.byteOffset,a.byteLength), props={};let p=24;
  const count=v.getUint32(20,true); if(count>100000)throw Error('Invalid property count');
  for(let i=0;i<count;i++){
    const id=v.getUint32(p,true),type=v.getUint16(p+4,true),key=v.getUint16(p+6,true);p+=9;
    let n=1;if(key===0x80){n=v.getUint32(p,true);p+=4;}else if(key!==0)throw Error('Invalid property key');
    if(n>1000000)throw Error('Invalid property size');
    if(type===0xc00){props[hex(id)]=ascii(a,p,n).replace(/\0/g,'');p+=n;continue;}
    const format={0x100:['getUint8',1],0x200:['getUint16',2],0x300:['getUint32',4],0x700:['getInt32',4],0x800:['getBigInt64',8],0x900:['getFloat32',4],0xb00:['getUint8',1]}[type];
    if(!format)throw Error('Unknown property type '+hex(type));
    const values=[];for(let k=0;k<n;k++){const x=v[format[0]](p,true);values.push(typeof x==='bigint'?String(x):x);p+=format[1];}
    props[hex(id)]=n===1?values[0]:values;
  }return {parent:[8,12,16].map(p=>hex(v.getUint32(p,true))).join('-'),props};
}
export function terrain(a){
  const n=Math.sqrt((a.length-2)/4);if(!Number.isInteger(n)||![65,129,257].includes(n))throw Error('Unsupported terrain dimensions');
  const v=new DataView(a.buffer,a.byteOffset,a.byteLength),heights=new Float32Array(n*n);
  for(let x=0;x<n;x++)for(let y=0;y<n;y++){const h=v.getFloat32(2+4*(x*n+y),true);if(!Number.isFinite(h)||Math.abs(h)>100000)throw Error('Invalid height');heights[y*n+x]=h;}
  return {n,heights};
}
function rgb565(v){return [(v>>11)*255/31,((v>>5)&63)*255/63,(v&31)*255/31,255];}
export function fsh(a){
  if(ascii(a,0,4)!=='SHPI')throw Error('Not FSH');
  const v=new DataView(a.buffer,a.byteOffset,a.byteLength),p=v.getUint32(20,true),fmt=a[p],w=v.getUint16(p+4,true),h=v.getUint16(p+6,true);
  if(!w||!h||w*h>16777216)throw Error('Invalid texture size');
  const rgba=new Uint8Array(w*h*4);let s=p+16;
  if([0x60,0x61,0x62].includes(fmt)){
    for(let by=0;by<h;by+=4)for(let bx=0;bx<w;bx+=4){
      const alpha=new Uint8Array(16).fill(255);
      if(fmt===0x61){for(let k=0;k<16;k++)alpha[k]=((a[s+(k>>1)]>>((k&1)*4))&15)*17;s+=8;}
      if(fmt===0x62){const x=a[s],y=a[s+1],table=[x,y];if(x>y){for(let k=1;k<=6;k++)table.push(((7-k)*x+k*y)/7);}else{for(let k=1;k<=4;k++)table.push(((5-k)*x+k*y)/5);table.push(0,255);}let bits=0n;for(let k=0;k<6;k++)bits|=BigInt(a[s+2+k])<<BigInt(8*k);for(let k=0;k<16;k++)alpha[k]=table[Number((bits>>BigInt(3*k))&7n)];s+=8;}
      const c0=v.getUint16(s,true),c1=v.getUint16(s+2,true),c=[rgb565(c0),rgb565(c1)],bits=v.getUint32(s+4,true);s+=8;
      if(c0>c1||fmt!==0x60){c.push(c[0].map((x,k)=>k===3?255:(2*x+c[1][k])/3),c[0].map((x,k)=>k===3?255:(x+2*c[1][k])/3));}else{c.push(c[0].map((x,k)=>k===3?255:(x+c[1][k])/2),[0,0,0,0]);}
      for(let k=0;k<16;k++){const x=bx+(k&3),y=by+(k>>2);if(x>=w||y>=h)continue;const col=c[(bits>>>(2*k))&3],q=(y*w+x)*4;rgba.set(col,q);rgba[q+3]=col[3]*alpha[k]/255;}
    }
  }else{
    for(let k=0;k<w*h;k++){
      let c;
      if(fmt===0x7d||fmt===0x7f){c=[a[s+2],a[s+1],a[s],fmt===0x7d?a[s+3]:255];s+=fmt===0x7d?4:3;}
      else{const x=v.getUint16(s,true);s+=2;if(fmt===0x78)c=rgb565(x);else if(fmt===0x7e)c=[((x>>10)&31)*255/31,((x>>5)&31)*255/31,(x&31)*255/31,(x&0x8000)?255:0];else if(fmt===0x6d)c=[((x>>8)&15)*17,((x>>4)&15)*17,(x&15)*17,(x>>12)*17];else throw Error('Unsupported FSH encoding '+hex(fmt));}rgba.set(c,k*4);
    }
  }return {w,h,rgba,fmt};
}
export function s3d(a){
  const v=new DataView(a.buffer,a.byteOffset,a.byteLength);
  if(ascii(a,0,4)!=='3DMD')throw Error('Not S3D');
  const minor=v.getUint16(18,true),verts=[],indices=[],prims=[],mats=[],groups=[];
  for(let start=8;start+8<=a.length;){
    const tag=ascii(a,start,4),size=v.getUint32(start+4,true);
    if(!['HEAD','VERT','INDX','PRIM','MATS','ANIM'].includes(tag))throw Error('Invalid S3D section '+tag);
    let p=start+8;const u8=()=>v.getUint8(p++),u16=()=>{const x=v.getUint16(p,true);p+=2;return x;},u32=()=>{const x=v.getUint32(p,true);p+=4;return x;},f32=()=>{const x=v.getFloat32(p,true);p+=4;return x;};
    if(tag==='VERT'){const n=u32();for(let g=0;g<n;g++){u16();const n=u16();u32();const pos=[],uv=[];for(let k=0;k<n;k++){pos.push(f32(),f32(),f32());uv.push(f32(),f32());}verts.push({pos,uv});}}
    if(tag==='INDX'){const n=u32();for(let g=0;g<n;g++){u16();u16();const n=u16(),arr=[];for(let k=0;k<n;k++)arr.push(u16());indices.push(arr);}}
    if(tag==='PRIM'){const n=u32();for(let g=0;g<n;g++){const n=u16(),arr=[];for(let k=0;k<n;k++)arr.push({type:u32(),first:u32(),count:u32()});prims.push(arr);}}
    if(tag==='MATS'){const n=u32();for(let g=0;g<n;g++){const flags=u32();u8();u8();u8();u8();const threshold=u16();u32();u8();const n=u8(),textures=[];for(let k=0;k<n;k++){const id=u32();u8();u8();if(minor>=5){u8();u8();}u16();u16();const len=u8();p+=len;textures.push(id);}mats.push({flags,threshold,textures});}}
    if(tag==='ANIM'){const frames=u16();u16();u16();u32();f32();const n=u16();for(let g=0;g<n;g++){const len=u8();u8();const name=ascii(a,p,Math.max(0,len-1));p+=len;let first;for(let k=0;k<frames;k++){const row=[u16(),u16(),u16(),u16()];if(k===0)first=row;}if(first)groups.push({name,vert:first[0],indx:first[1],prim:first[2],mats:first[3]});}}
    if(tag==='ANIM')break; // Original files can have stale ANIM section lengths.
    start=['VERT','INDX','PRIM','MATS'].includes(tag)?p:start+size;
  }return {verts,indices,prims,mats,groups};
}
