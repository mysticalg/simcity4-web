// Original lot recipes and developer curves; allocation/demand scheduling remains reconstructed.
export function lotDimensions(lot,q=0){return q%2?[lot.size[1],lot.size[0]]:[...lot.size];}
export function lotPoint(lot,q,x,z){const [w,d]=lot.size.map(n=>n*16);return q===1?[d-z,x]:q===2?[w-x,d-z]:q===3?[z,w-x]:[x,z];}
export function zoneDensity(c,x=c.x,z=c.z){return c.zoneDensities?.[(z-c.z)*(c.width||1)+x-c.x]??c.density??(c.kind==='industrial'?2:1);}
export function zoneType(kind,density){return ({residential:0,commercial:3,industrial:6}[kind]??0)+density;}
export function zoneCost(game,kind,density){return game.zoning.costs[zoneType(kind,density)];}
export function developerCode(kind,density=1){return kind==='residential'?'00001010':kind==='commercial'?'00003110':density===1?'00004100':'00004200';}
export function curveAt(curve,x){if(!curve.length)return 0;if(x<=curve[0])return curve[1];for(let i=2;i<curve.length;i+=2)if(x<=curve[i]){const t=(x-curve[i-2])/(curve[i]-curve[i-2]);return curve[i-1]+(curve[i+1]-curve[i-1])*t;}return curve.at(-1);}
export function stageWeights(developer,population){return developer.stages.map(curve=>Math.max(0,curveAt(curve,population)));}
export function lotBuilding(lot,kind,seed=0,density=kind==='industrial'?2:1){const code=developerCode(kind,density),choices=lot.choices.filter(b=>b.capacityByType[code]>0&&(kind==='industrial'||b.wealth===1));return choices[(seed>>>0)%choices.length]||null;}
const indexes=new WeakMap();
function index(game){if(!indexes.has(game))indexes.set(game,{lots:new Map(game.lots.map(l=>[l.tgi,l]))});return indexes.get(game);}
function random(seed){let n=seed>>>0;n=Math.imul(n^(n>>>16),0x21f0aaad);n=Math.imul(n^(n>>>15),0x735a2d97);return ((n^(n>>>15))>>>0)/4294967296;}
export function selectDevelopment(game,c,{cellAt,hasRoad,powered,watered=()=>false,landAt=()=>true,capacityOf=null,cohortPopulation=()=>0,month=0}){
 if(!['residential','commercial','industrial'].includes(c.kind)||!powered(c.x,c.z))return null;const density=zoneDensity(c),developer=game.developers?.[developerCode(c.kind,density)];if(!developer)return null;
 const seed=(Math.imul(c.x,73856093)^Math.imul(c.z,19349663))>>>0,weights=stageWeights(developer,cohortPopulation(developerCode(c.kind,density))),total=weights.reduce((a,b)=>a+b,0);let roll=random(seed^Math.imul(month,0x9e3779b9))*total,stage=1;for(let i=0;i<weights.length;i++){roll-=weights[i];if(roll<0){stage=i+1;break;}}if(stage<=(c.level||0)||!total)return null;
 const candidates=(game.lots||[]).filter(l=>l.stage<=stage&&l.stage>(c.level||0)&&lotBuilding(l,c.kind,seed,density)&&!(c.kind==='industrial'&&density===1&&l.name==='Farm Field'));
 candidates.sort((a,b)=>b.stage-a.stage||b.size[0]*b.size[1]-a.size[0]*a.size[1]||((parseInt(a.tgi.slice(-8),16)^seed)>>>0)-((parseInt(b.tgi.slice(-8),16)^seed)>>>0));
 for(const lot of candidates)for(let q=0;q<4;q++){
  const [w,d]=lotDimensions(lot,q),consumed=new Set(),densities=[];let fit=true;
  for(let dz=0;dz<d&&fit;dz++)for(let dx=0;dx<w;dx++){const x=c.x+dx,z=c.z+dz,part=cellAt(x,z),tileDensity=part?zoneDensity(part,x,z):0;if(!part||part.kind!==c.kind||(part.level||0)>=lot.stage||!lot.zones.includes(zoneType(c.kind,tileDensity))||!landAt(x,z)||(lot.stage>developer.waterCap&&!watered(x,z))){fit=false;break;}consumed.add(part);densities.push(tileDensity);}if(!fit)continue;
  const building=lotBuilding(lot,c.kind,seed,density),oldCapacity=[...consumed].reduce((sum,part)=>sum+(capacityOf?capacityOf(part):(part.lot?index(game).lots.get(part.lot)?.choices.find(b=>b.tgi===part.blueprint)?.capacity[c.kind]||0:0)),0);if(oldCapacity>=building.capacity[c.kind])continue;
  const front=q===0?Array.from({length:w},(_,i)=>[c.x+i,c.z+d]):q===1?Array.from({length:d},(_,i)=>[c.x-1,c.z+i]):q===2?Array.from({length:w},(_,i)=>[c.x+i,c.z-1]):Array.from({length:d},(_,i)=>[c.x+w,c.z+i]);if(!front.some(([x,z])=>hasRoad(x,z)))continue;
  return {lot,rotation:q,width:w,depth:d,building,seed,consumed:[...consumed],densities};
 }
 return null;
}
