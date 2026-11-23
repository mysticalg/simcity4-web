import {pathTransitions} from './traffic.mjs?v=0.15.0';
export const roadDirections=[[-1,0],[0,-1],[1,0],[0,1]];
const key=(x,z)=>x+','+z;
export function nativeRoadMask(n){const c=n.crossings[0];return [c.west,c.north,c.east,c.south].reduce((mask,v,i)=>mask|(v?1<<i:0),0);}
// Only ordinary, full-tile road pieces can be replaced by the supplied road templates.
// Diagonal/special connectors, bridges and combined networks retain their native paths.
export function regularRoad(n,paths){
 if(n.crossings.length!==1||n.crossings[0].type!==0||!paths['69668828:'+n.texture.toString(16)])return false;
 const c=n.crossings[0];if([c.west,c.north,c.east,c.south].some(v=>v!==0&&v!==2))return false;
 const xs=n.vertices.map(v=>v.position[0]),zs=n.vertices.map(v=>v.position[2]),x=Math.min(...xs),z=Math.min(...zs);
 return Math.abs(Math.max(...xs)-x-16)<.01&&Math.abs(Math.max(...zs)-z-16)<.01&&n.vertices.every(v=>(Math.abs(v.position[0]-x)<.01||Math.abs(v.position[0]-x-16)<.01)&&(Math.abs(v.position[2]-z)<.01||Math.abs(v.position[2]-z-16)<.01));
}
export function acceptsNewRoad(n,side,paths){
 if(regularRoad(n,paths))return true;
 if(!n.crossings.some(c=>[0,3,6,10].includes(c.type)))return false;
 const def=paths['69668828:'+n.texture.toString(16)]||paths['a966883f:'+n.texture.toString(16)];return pathTransitions(def,n.vertices).some(p=>p.entry===side||p.exit===side);
}
export function roadMaskAt(x,z,hasNewRoad,nativeAt,paths){
 return roadDirections.reduce((mask,[dx,dz],side)=>mask|((hasNewRoad(x+dx,z+dz)||nativeAt(x+dx,z+dz).some(n=>acceptsNewRoad(n,(side+2)%4,paths)))?1<<side:0),0);
}
export function planRoadTopology(networks,deleted,newRoads,paths){
 const all=new Map(),added=new Set(newRoads.map(r=>key(r.x,r.z))),replacements=new Map();
 for(const n of networks){const k=key(n.x,n.z);if(!all.has(k))all.set(k,[]);all.get(k).push(n);}
 const activeAt=(x,z)=>(all.get(key(x,z))||[]).filter(n=>!deleted.has(n.id));
 for(const n of networks){if(deleted.has(n.id)||!regularRoad(n,paths))continue;const originalMask=nativeRoadMask(n);let mask=originalMask;
  roadDirections.forEach(([dx,dz],side)=>{const k=key(n.x+dx,n.z+dz);if(added.has(k))mask|=1<<side;else if(originalMask&(1<<side)){const adjacent=(all.get(k)||[]).filter(a=>a.crossings.some(c=>[0,2,3,6,10,12].includes(c.type)));if(adjacent.length&&adjacent.every(a=>deleted.has(a.id)))mask&=~(1<<side);}});
  if(mask!==originalMask)replacements.set(n.id,{id:n.id,x:n.x,z:n.z,mask,originalMask});
 }
 return {replacements,newMasks:new Map(newRoads.map(r=>[key(r.x,r.z),roadMaskAt(r.x,r.z,(x,z)=>added.has(key(x,z)),activeAt,paths)]))};
}
