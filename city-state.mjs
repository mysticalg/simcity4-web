// Saved-lot layout checked against sebamarynissen/sc4 (MIT; THIRD_PARTY.md).
const demandKind=n=>n>=0x1010&&n<=0x1030?'residential':n>=0x3110&&n<=0x3330?'commercial':n>=0x4100&&n<=0x4400?'industrial':null;
export function readSavedLots(a){
 const v=new DataView(a.buffer,a.byteOffset,a.byteLength),out=[];let start=0;
 while(start<a.length){
  const size=v.getUint32(start,true),end=start+size;if(size<80||end>a.length)throw Error('Invalid saved lot size');
  if(v.getUint16(start+12,true)!==8)throw Error('Unsupported saved lot version');
  const lot={id:'lot:'+start,offset:start,memory:v.getUint32(start+8,true),exemplarId:v.getUint32(start+14,true),flags:a[start+18],minX:a[start+19],minZ:a[start+20],maxX:a[start+21],maxZ:a[start+22],commuteX:a[start+23],commuteZ:a[start+24],height:v.getFloat32(start+25,true),width:a[start+37],depth:a[start+38],orientation:a[start+39],zoneType:a[start+42],wealth:a[start+43],buildingId:v.getUint32(start+48,true),capacities:[],totalCapacities:[]};
  let p=start+53;const industrial=v.getUint32(p,true);p+=industrial?8:4;const agricultural=v.getUint32(p,true);p+=agricultural?8:4;lot.linkedIndustrial=industrial;lot.linkedAgricultural=agricultural;
  const groups=a[p++];for(let g=0;g<groups;g++){const count=a[p++];for(let i=0;i<count;i++){lot.capacities.push({type:v.getUint32(p,true),count:v.getUint16(p+4,true)});p+=6;}}
  const totalCount=a[p++];for(let i=0;i<totalCount;i++){lot.totalCapacities.push({type:v.getUint32(p,true),count:v.getUint16(p+4,true)});p+=6;}
  if(p+18>end)throw Error('Truncated lot occupancy');lot.wealthValues=[0,4,8].map(k=>v.getFloat32(p+k,true));p+=14;
  const propertyCount=v.getUint32(p,true);p+=4;
  if(propertyCount>10000)throw Error('Invalid lot property count');
  for(let i=0;i<propertyCount;i++){const type=a[p+12],key=a[p+13],stride={1:1,2:2,3:4,7:4,8:8,9:4,11:1,12:1}[type];if(!stride)throw Error('Unsupported lot property type');p+=16;let n=1;if(key===0x80||type===12){n=v.getUint32(p,true);p+=4;}p+=n*stride;if(p>end-5)throw Error('Lot property outside record');}
  lot.commuteCount=v.getUint32(p,true);p+=4;if(p>end-1||lot.minX>lot.maxX||lot.minZ>lot.maxZ)throw Error('Invalid lot bounds');
  lot.powered=!!(lot.flags&0x10);lot.watered=!!(lot.flags&8);lot.historical=!!(lot.flags&0x20);lot.occupants={residential:0,commercial:0,industrial:0};
  for(const c of lot.capacities){const kind=demandKind(c.type);if(kind)lot.occupants[kind]+=c.count;}
  out.push(lot);start=end;
 }return out;
}

export class ImportedCity {
 constructor({lots=[],networks=[],pipes=[],wires=[],tiles,profile={},networkCosts={}}){
  this.networkCosts=networkCosts;this.tiles=tiles;this.half=tiles/2;this.profile=profile;this.lots=new Map(lots.map(l=>[l.id,l]));this.deleted=new Set();this.buildings=new Map();this.scenery=new Map();this.sceneryOccupancy=new Map();this.occupancy=new Map();this.networks=new Map();this.networkOccupancy=new Map();this.pipes=new Map(pipes.map(p=>[p.id,{...p,x:p.xTile-this.half,z:p.zTile-this.half}]));this.wires=new Map(wires.map(w=>[w.id,{...w,x:w.xTile-this.half,z:w.zTile-this.half,line:true,links:w.poles.map(p=>'pole:'+p)}]));this.pipeOccupancy=new Map([...this.pipes.values()].map(p=>[p.x+','+p.z,p.id]));
  for(const lot of lots)for(let z=lot.minZ;z<=lot.maxZ;z++)for(let x=lot.minX;x<=lot.maxX;x++){const key=(x-this.half)+','+(z-this.half);if(!this.occupancy.has(key))this.occupancy.set(key,[]);this.occupancy.get(key).push(lot.id);}
  networks.forEach((n,i)=>{const xs=n.vertices.map(v=>v.position[0]),zs=n.vertices.map(v=>v.position[2]),x=Math.round(Math.min(...xs)/16)-this.half,z=Math.round(Math.min(...zs)/16)-this.half,id=n.id||'network:'+i,types=n.crossings?.map(c=>c.type)||[];const node={...n,id,x,z,road:types.some(t=>[0,2,3,6,10,12].includes(t))};this.networks.set(id,node);if(!this.networkOccupancy.has(x+','+z))this.networkOccupancy.set(x+','+z,[]);this.networkOccupancy.get(x+','+z).push(id);});
 }
 pipeAt(x,z){const p=this.pipes.get(this.pipeOccupancy.get(x+','+z));return p&&!this.deleted.has(p.id)?p:undefined;}
 activePipes(){return [...this.pipes.values()].filter(p=>!this.deleted.has(p.id));}
 activeWires(){return [...this.wires.values()].filter(w=>!this.deleted.has(w.id));}
 utilityObjects(){return [...this.lots.values()].filter(l=>!this.deleted.has(l.id)).map(l=>{const bs=this.buildings.get(l.id)||[];return {id:l.id,x:l.minX-this.half,z:l.minZ-this.half,width:l.maxX-l.minX+1,depth:l.maxZ-l.minZ+1,consumption:bs.reduce((n,b)=>n+b.powerConsumed,0),generation:bs.reduce((n,b)=>n+b.powerGenerated,0),waterConsumed:bs.reduce((n,b)=>n+b.waterConsumed,0),waterProduced:bs.reduce((n,b)=>n+b.waterProduced,0)};});}
 lotAt(x,z){return (this.occupancy.get(x+','+z)||[]).map(id=>this.lots.get(id)).find(l=>!this.deleted.has(l.id));}
 networkAt(x,z){return (this.networkOccupancy.get(x+','+z)||[]).map(id=>this.networks.get(id)).find(n=>!this.deleted.has(n.id));}
 roadAt(x,z){return (this.networkOccupancy.get(x+','+z)||[]).map(id=>this.networks.get(id)).some(n=>n.road&&!this.deleted.has(n.id));}
 ownerForBounds(min,max,buildingId){const x=(min[0]+max[0])/32-this.half,z=(min[2]+max[2])/32-this.half,owners=(this.occupancy.get(Math.floor(x)+','+Math.floor(z))||[]).map(id=>this.lots.get(id));return owners.find(l=>buildingId!==undefined&&l.buildingId===buildingId)?.id||owners[0]?.id||null;}
 ownerForTile(x,z){return this.lotAt(x-this.half,z-this.half)?.id||null;}
 attachBuilding(owner,props){if(!owner)return;if(!this.buildings.has(owner))this.buildings.set(owner,[]);this.buildings.get(owner).push({name:props['00000020'],bulldozeCost:Math.max(0,Number(props['099afacd'])||0),powerConsumed:Number(props['27812854'])||0,powerGenerated:Number(props['27812852'])||0,waterConsumed:Number(props['c8ed2d84'])||0,waterProduced:Number(props['88ed3303'])||0,buildingValue:Number(props['e91a0b5f'])||0,monthlyCost:Number(props['ea54d286'])||0,budgetDepartment:Number(props['ea54d283'])||0});}
 registerBuilding(b,props){let owner=this.ownerForBounds(b.min,b.max,b.instance);if(!owner){const minX=Math.max(0,Math.floor(b.min[0]/16)),minZ=Math.max(0,Math.floor(b.min[2]/16)),maxX=Math.min(this.tiles-1,Math.ceil(b.max[0]/16)-1),maxZ=Math.min(this.tiles-1,Math.ceil(b.max[2]/16)-1);const lot={id:b.id,minX,minZ,maxX,maxZ,buildingId:b.instance,zoneType:15,occupants:{residential:0,commercial:0,industrial:0},standalone:true};this.lots.set(lot.id,lot);for(let z=minZ;z<=maxZ;z++)for(let x=minX;x<=maxX;x++){const key=(x-this.half)+','+(z-this.half);if(!this.occupancy.has(key))this.occupancy.set(key,[]);this.occupancy.get(key).push(lot.id);}owner=lot.id;}this.attachBuilding(owner,props);return owner;}
 registerScenery(b,props){const owner=this.ownerForBounds(b.min,b.max),x=Math.floor((b.min[0]+b.max[0])/32)-this.half,z=Math.floor((b.min[2]+b.max[2])/32)-this.half,item={id:b.id,owner:owner||b.id,x,z,flora:b.flora,name:props['00000020'],bulldozeCost:Number(props['099afacd'])||0};this.scenery.set(item.id,item);const key=x+','+z;if(!this.sceneryOccupancy.has(key))this.sceneryOccupancy.set(key,[]);this.sceneryOccupancy.get(key).push(item.id);return item.owner;}
 sceneryAt(x,z){return (this.sceneryOccupancy.get(x+','+z)||[]).map(id=>this.scenery.get(id)).filter(s=>s.owner===s.id&&!this.deleted.has(s.id));}
 clearScenery(x,z,width=1,depth=1){let count=0;for(let dz=0;dz<depth;dz++)for(let dx=0;dx<width;dx++)for(const s of this.sceneryAt(x+dx,z+dz)){this.deleted.add(s.id);count++;}return count;}
 demolitionCost(id){if(this.networks.has(id))return Math.max(...this.networks.get(id).crossings.map(c=>this.networkCosts[c.type]??5));if(this.pipes.has(id))return 1;if(this.lots.has(id)){const records=this.buildings.get(id)||[];return records.length?records.reduce((sum,b)=>sum+b.bulldozeCost,0):5;}return this.scenery.get(id)?.bulldozeCost??5;}
 demolish(id){if(!this.lots.has(id)&&!this.networks.has(id)&&!this.scenery.has(id)&&!this.pipes.has(id)&&!this.wires.has(id))return false;if(this.deleted.has(id))return false;this.deleted.add(id);return true;}
 restoreEdits(ids=[]){this.deleted=new Set(ids.filter(id=>this.lots.has(id)||this.networks.has(id)||this.scenery.has(id)||this.pipes.has(id)||this.wires.has(id)));}
 totals(){const result={residents:this.profile.residents||0,commercialJobs:this.profile.commercialJobs||0,industrialJobs:this.profile.industrialJobs||0};for(const id of this.deleted){const l=this.lots.get(id);if(l){result.residents-=l.occupants.residential;result.commercialJobs-=l.occupants.commercial;result.industrialJobs-=l.occupants.industrial;}}for(const k of Object.keys(result))result[k]=Math.max(0,result[k]);result.jobs=result.commercialJobs+result.industrialJobs;return result;}
 summary(){return {wires:this.activeWires().length,pipes:this.pipes.size,remainingPipes:this.activePipes().length,lots:this.lots.size,remainingLots:[...this.lots.keys()].filter(id=>!this.deleted.has(id)).length,buildings:[...this.buildings.values()].reduce((n,bs)=>n+bs.length,0),remainingBuildings:[...this.buildings].filter(([id])=>!this.deleted.has(id)).reduce((n,[,bs])=>n+bs.length,0),networks:this.networks.size,roads:[...this.networks.values()].filter(n=>n.road&&!this.deleted.has(n.id)).length,deleted:[...this.deleted],...this.totals()};}
}
