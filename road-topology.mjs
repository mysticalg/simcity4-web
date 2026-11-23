import {pathTransitions} from './traffic.mjs?v=0.16.1';
export const roadDirections=[[-1,0],[0,-1],[1,0],[0,1]];
const key=(x,z)=>x+','+z;
export const portsMask=ports=>ports.reduce((mask,v,i)=>mask|(v?1<<i:0),0);
export function nativePorts(n){return roadDirections.map((_,i)=>{const c=n.crossings.filter(c=>[c.west,c.north,c.east,c.south][i]);return c.length===1?c[0].type+1:c.length?-1:0;});}
export function regularSurface(n,paths){
 if(!n.crossings.length||!n.crossings.every(c=>[0,3].includes(c.type))||nativePorts(n).includes(-1))return false;
 return regularRoad({...n,crossings:[{...n.crossings[0],type:0}]},paths)&&n.crossings.every(c=>[c.west,c.north,c.east,c.south].every(v=>v===0||v===2));
}
export function nativeRoadMask(n){const c=n.crossings[0];return [c.west,c.north,c.east,c.south].reduce((mask,v,i)=>mask|(v?1<<i:0),0);}
// Only ordinary, full-tile road pieces can be replaced by the supplied road templates.
// Diagonal/special connectors, bridges and combined networks retain their native paths.
export function regularRoad(n,paths){
 if(n.crossings.length!==1||n.crossings[0].type!==0||(n.texture!==0x100&&!paths['69668828:'+n.texture.toString(16)]))return false;
 const c=n.crossings[0];if([c.west,c.north,c.east,c.south].some(v=>v!==0&&v!==2))return false;
 const xs=n.vertices.map(v=>v.position[0]),zs=n.vertices.map(v=>v.position[2]),x=Math.min(...xs),z=Math.min(...zs);
 return Math.abs(Math.max(...xs)-x-16)<.01&&Math.abs(Math.max(...zs)-z-16)<.01&&n.vertices.every(v=>(Math.abs(v.position[0]-x)<.01||Math.abs(v.position[0]-x-16)<.01)&&(Math.abs(v.position[2]-z)<.01||Math.abs(v.position[2]-z-16)<.01));
}
export function acceptsNewRoad(n,side,paths){
 if(regularSurface(n,paths))return true;
 if(!n.crossings.some(c=>[0,3,6,10].includes(c.type)))return false;
 const def=paths['69668828:'+n.texture.toString(16)]||paths['a966883f:'+n.texture.toString(16)];return pathTransitions(def,n.vertices).some(p=>p.entry===side||p.exit===side);
}
export function roadMaskAt(x,z,hasNewRoad,nativeAt,paths){
 return roadDirections.reduce((mask,[dx,dz],side)=>mask|((hasNewRoad(x+dx,z+dz)||nativeAt(x+dx,z+dz).some(n=>acceptsNewRoad(n,(side+2)%4,paths)))?1<<side:0),0);
}
export function planRoadTopology(networks,deleted,newRoads,paths){
 const all=new Map(),added=new Map(newRoads.map((r,i)=>[key(r.x,r.z),{...r,rank:i,kind:r.kind||'road'}])),replacements=new Map();
 for(const n of networks){const k=key(n.x,n.z);if(!all.has(k))all.set(k,[]);all.get(k).push(n);}
 const activeAt=(x,z)=>(all.get(key(x,z))||[]).filter(n=>!deleted.has(n.id));
 for(const n of networks){if(deleted.has(n.id)||!regularSurface(n,paths))continue;const originalPorts=nativePorts(n),ports=[...originalPorts],originalMask=portsMask(originalPorts);
  roadDirections.forEach(([dx,dz],side)=>{const k=key(n.x+dx,n.z+dz);if(added.has(k))ports[side]=added.get(k).kind==='street'?4:1;else if(originalPorts[side]){const adjacent=(all.get(k)||[]).filter(a=>a.crossings.some(c=>[0,2,3,6,10,12].includes(c.type)));if(adjacent.length&&adjacent.every(a=>deleted.has(a.id)))ports[side]=0;}});
  if(ports.join(',')!==originalPorts.join(','))replacements.set(n.id,{id:n.id,x:n.x,z:n.z,mask:portsMask(ports),originalMask,ports,originalPorts,kind:n.crossings.some(c=>c.type===0)?'road':'street'});
 }
 const newPorts=new Map(newRoads.map(r=>{const here=added.get(key(r.x,r.z)),ports=roadDirections.map(([dx,dz],side)=>{const neighbor=added.get(key(r.x+dx,r.z+dz));if(neighbor)return (neighbor.rank>here.rank?neighbor.kind:here.kind)==='street'?4:1;return activeAt(r.x+dx,r.z+dz).some(n=>acceptsNewRoad(n,(side+2)%4,paths))?here.kind==='street'?4:1:0;});return [key(r.x,r.z),ports];}));
 return {replacements,newPorts,newMasks:new Map([...newPorts].map(([k,p])=>[k,portsMask(p)]))};
}
