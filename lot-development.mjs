// Native lot recipes; developer demand and stage progression remain under reconstruction.
export function lotDimensions(lot,q=0){return q%2?[lot.size[1],lot.size[0]]:[...lot.size];}
export function lotPoint(lot,q,x,z){const [w,d]=lot.size.map(n=>n*16);return q===1?[d-z,x]:q===2?[w-x,d-z]:q===3?[z,w-x]:[x,z];}
export function lotBuilding(lot,kind,seed=0){const choices=lot.choices.filter(b=>kind==='industrial'?b.capacityByType['00004200']>0:b.capacity[kind]>0&&b.wealth===1);return choices[(seed>>>0)%choices.length]||null;}
export function selectDevelopment(game,c,{cellAt,hasRoad,powered}){
 if(c.level||!powered(c.x,c.z))return null;const zone={residential:1,commercial:4,industrial:8}[c.kind];if(!zone)return null;
 const seed=(Math.imul(c.x,73856093)^Math.imul(c.z,19349663))>>>0;
 const candidates=(game.lots||[]).filter(l=>l.stage===1&&l.zones.includes(zone)&&lotBuilding(l,c.kind,seed));
 candidates.sort((a,b)=>b.size[0]*b.size[1]-a.size[0]*a.size[1]||((parseInt(a.tgi.slice(-8),16)^seed)>>>0)-((parseInt(b.tgi.slice(-8),16)^seed)>>>0));
 for(const lot of candidates)for(let q=0;q<4;q++){
  const [w,d]=lotDimensions(lot,q);let fit=true;for(let dz=0;dz<d&&fit;dz++)for(let dx=0;dx<w;dx++){const part=cellAt(c.x+dx,c.z+dz);if(!part||part.kind!==c.kind||part.level){fit=false;break;}}if(!fit)continue;
  const front=q===0?Array.from({length:w},(_,i)=>[c.x+i,c.z+d]):q===1?Array.from({length:d},(_,i)=>[c.x-1,c.z+i]):q===2?Array.from({length:w},(_,i)=>[c.x+i,c.z-1]):Array.from({length:d},(_,i)=>[c.x+w,c.z+i]);
  if(!front.some(([x,z])=>hasRoad(x,z)))continue;
  return {lot,rotation:q,width:w,depth:d,building:lotBuilding(lot,c.kind,seed),seed};
 }
 return null;
}
