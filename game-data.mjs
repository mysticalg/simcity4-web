// Definitions compiled from the original exemplar/cohort bank, including bundled data.
import {hex} from './dbpf.mjs?v=0.16.1';
export const IDS={utilities:'6534284a-e7e2c2db-c911e35b',budget:'6534284a-e7e2c2db-0bff6824',traffic:'6534284a-e7e2c2db-c9133286',pipes:'6534284a-084344e0-095117db'};
const array=x=>Array.isArray(x)?x:[x];
const number=(x,fallback=0)=>Number.isFinite(Number(x))?Number(x):fallback;
export function compileGameData(bank){
  const cache=new Map(),buildings=new Map();
  function merged(tgi,chain=new Set()){
    if(cache.has(tgi))return cache.get(tgi);
    const ex=bank.get(tgi);if(!ex||chain.has(tgi))return {};
    const next=new Set(chain);next.add(tgi);const props={...merged(ex.parent,next),...ex.props};cache.set(tgi,props);return props;
  }
  const utilities=merged(IDS.utilities),budget=merged(IDS.budget),traffic=merged(IDS.traffic),pipeTuning=merged(IDS.pipes),facilities=[],waterFacilities=[],growables={residential:[],commercial:[],industrial:[]};
  for(const [tgi,ex]of bank){if(!tgi.startsWith('6534284a-'))continue;const p=merged(tgi);if(p['00000010']!==2)continue;
    const model=p['27812821']||p['27812820'];if(!Array.isArray(model)||model[0]!==0x5ad0e817)continue;
    const size=array(p['27812810']);if(size.length!==3||!size.every(Number.isFinite))continue;
    const capacities=array(p['27812834']),capacity={residential:0,commercial:0,industrial:0},capacityByType={},wealth=number(p['27812832'],1);
    // Wealth fallback capacities are alternatives, not simultaneous occupants.
    for(let i=0;i+1<capacities.length;i+=2){const code=capacities[i],n=number(capacities[i+1]);capacityByType[hex(code)]=n;if([0x1010,0x1020,0x1030].includes(code)&&(code&0xf0)===wealth*16)capacity.residential=n;else if([0x3110,0x3120,0x3130,0x3320,0x3330].includes(code)&&(code&0xf0)===wealth*16)capacity.commercial=n;else if([0x4100,0x4200,0x4300,0x4400].includes(code))capacity.industrial=n;}
    const blueprint={tgi,name:p['00000020']||tgi,model,size,wealth,buildingValue:number(p['e91a0b5f']),budgetDepartment:number(p['ea54d283']),powerGenerated:number(p['27812852']),powerConsumed:number(p['27812854']),waterProduced:number(p['88ed3303']),waterSource:number(p['48f23a7e']),waterConsumed:number(p['c8ed2d84']),monthlyCost:number(p['ea54d286']),plopCost:number(p['49cac341']),bulldozeCost:number(p['099afacd']),capacity,capacityByType,source:'original exemplar'};
    blueprint.label=({1:'Coal power plant',2:'Hydrogen power plant',3:'Gas power plant',5:'Nuclear power plant',6:'Oil power plant',7:'Solar power plant',8:'Waste-to-energy plant',9:'Wind turbine'})[number(p['27812853'])]||(capacity.residential?'Residential building':capacity.commercial?'Commercial building':capacity.industrial?'Industrial building':blueprint.name);
    if(blueprint.powerGenerated>0&&blueprint.plopCost>0&&[1,2,3,5,6,7,8,9].includes(number(p['27812853']))){const lotId=number(p['ea260589']),lot=merged('6534284a-a8fbd372-'+hex(lotId));blueprint.footprint=Array.isArray(lot['88edc790'])?lot['88edc790']:[Math.ceil(size[0]/16),Math.ceil(size[2]/16)];facilities.push(blueprint);}
    if(blueprint.waterProduced>0&&blueprint.plopCost>0){const lot=merged('6534284a-a8fbd372-'+hex(number(p['ea260589'])));blueprint.footprint=Array.isArray(lot['88edc790'])?lot['88edc790']:[Math.ceil(size[0]/16),Math.ceil(size[2]/16)];blueprint.label=/LargeWater/.test(blueprint.name)?'Large water pump':/Tower/.test(blueprint.name)?'Water tower':'Water pump';waterFacilities.push(blueprint);}
    buildings.set(tgi,{...blueprint,families:array(p['27812870']).filter(Number.isFinite)});
    if(size[0]<=15&&size[2]<=15){for(const kind of Object.keys(growables))if(capacity[kind]>0)growables[kind].push(blueprint);}
  }
  for(const kind of Object.keys(growables))growables[kind].sort((a,b)=>a.capacity[kind]-b.capacity[kind]||a.tgi.localeCompare(b.tgi));
  const byIID=new Map(),byFamily=new Map(),objects=new Map();
  for(const [tgi,ex] of bank){if(!tgi.startsWith('6534284a-'))continue;const p=merged(tgi),type=p['00000010'],model=p['27812821']||p['27812820'];if(![2,30,15].includes(type)||!Array.isArray(model)||model[0]!==0x5ad0e817)continue;const obj={tgi,model,size:p['27812810']};objects.set(tgi,obj);const id=parseInt(tgi.split('-')[2],16);if(!byIID.has(id))byIID.set(id,[]);byIID.get(id).push(obj);for(const family of array(p['27812870']).filter(Number.isFinite)){if(!byFamily.has(family))byFamily.set(family,[]);byFamily.get(family).push(obj);}}
  const resolve=(ids,type)=>ids.flatMap(id=>[...(byIID.get(id)||[]),...(byFamily.get(id)||[])]).filter(o=>merged(o.tgi)['00000010']===type);
  const lots=[];
  for(const [tgi] of bank){if(!tgi.startsWith('6534284a-'))continue;const p=merged(tgi),size=p['88edc790'],stage=number(p['27812837']),zones=array(p['88edc793']);if(!Array.isArray(size)||!stage||stage>8||!zones.some(z=>z>=1&&z<=9))continue;
    const raw=Object.entries(p).filter(([k,v])=>k.startsWith('88edc9')&&Array.isArray(v)&&v.length>=13).map(([k,v])=>v),building=raw.find(v=>v[0]===0);if(!building)continue;
    const choices=resolve(building.slice(12),2).map(o=>buildings.get(o.tgi)).filter(Boolean);if(!choices.length)continue;
    const decoded=raw.map(v=>({type:v[0],lod:v[1],orientation:v[2]&7,x:(v[3]|0)/65536,y:(v[4]|0)/65536,z:(v[5]|0)/65536,minX:(v[6]|0)/65536,minZ:(v[7]|0)/65536,maxX:(v[8]|0)/65536,maxZ:(v[9]|0)/65536,ids:v.slice(12),...(v[0]===1?{choices:resolve(v.slice(12),30)}:{})}));
    lots.push({tgi,name:p['00000020'],size,stage,zones,wealth:number(p['88edc795']),choices:choices.map(b=>({...b,families:undefined})),objects:decoded});
  }
  waterFacilities.sort((a,b)=>a.plopCost-b.plopCost);
  facilities.sort((a,b)=>a.plopCost-b.plopCost);
  const developers={};for(const code of [0x1010,0x1020,0x1030,0x3110,0x3120,0x3130,0x3320,0x3330,0x4100,0x4200,0x4300,0x4400]){const tgi='6534284a-67cd5fa1-'+hex(code),p=merged(tgi);developers[hex(code)]={tgi,name:p['00000020'],stageCount:number(p['87cd6360']),stages:Array.from({length:number(p['87cd6360'])},(_,i)=>p[hex(0x87cd6361+i)]||[]),waterCap:number(p['87cd6370']),powerCap:number(p['87cd6373']),fireCap:number(p['87cd6371']),parkCap:number(p['87cd6372'])};}
  const zoningProps=merged('6534284a-e7e2c2db-e9482490'),zoning={colors:array(zoningProps['e94825b8']).map(Number),alpha:number(zoningProps['e94825b7'])/255,source:'6534284a-e7e2c2db-e9482490',costs:array(zoningProps['e94825b4']).map(Number),bulldozeCosts:array(zoningProps['e94825b5']).map(Number)};
  const residential=merged('6534284a-e7e2c2db-69189c84'),at=(curve,x)=>{if(x<=curve[0])return curve[1];for(let i=2;i<curve.length;i+=2)if(x<=curve[i])return curve[i-1]+(curve[i+1]-curve[i-1])*(x-curve[i-2])/(curve[i]-curve[i-2]);return curve.at(-1);};
  const trafficTuning={source:IDS.traffic,speeds:traffic['491332e8'],capacities:traffic['a92356b3'],congestion:traffic['a92356b9'],maxTime:traffic['a92356ba'],startCost:traffic['a92356bc'][1],volumePerPopulation:traffic['491332e6'],workforce:['c929cc8d','6929cc92','4929cc97'].map(id=>at(residential['4941a92b'],at(residential['6941a67f'],residential[id]))/100)};
  const networkTools=Object.fromEntries([['road','0781214f',0],['street','492a03a3',3]].map(([kind,id,type])=>{const tgi='6534284a-084344e0-'+id,p=merged(tgi);return [kind,{tgi,type,cost:number(p['4a2d49b9']),bulldoze:number(p['ea86e3b5']),monthly:number(traffic['6a84493e'][type]),maxSlope:number(p['879d12e7'])}];}));
  return {networkTools,traffic:trafficTuning,developers,zoning,lots,sources:IDS,waterFacilities,waterPipeRadius:number(utilities['68f5436a']),waterFundingCurve:utilities['6a410bf2']||null,waterPipeMonthlyCost:number(utilities['8a84778f']),waterPipeCost:number(pipeTuning['4a2d49b9']),waterPipeBulldozeCost:number(pipeTuning['ea86e3b5']),initialFunds:array(budget['6a9c7718']).map(x=>number(x)),maxTaxRate:number(budget['890e0a99']),taxDifficultyMultipliers:array(budget['ebff69e7']).map(x=>number(x)),powerLineMonthlyCost:number(utilities['a9132ef9']),networkMonthlyCosts:array(traffic['6a84493e']).map(x=>number(x)),initialTaxRates:array(budget['0c032488']).map(x=>number(x)),powerRadiationRadius:number(utilities['a911e2f1']),powerFundingCurve:utilities['6911e2df']||null,roadMonthlyCost:number(array(traffic['6a84493e'])[0]),powerLineCost:number(utilities['0a5f596b']),powerPoleCost:number(utilities['4a5f5953']),facilities,growables};
}
export function growableForLevel(game,kind,level){
  let list=game?.growables?.[kind];if(!list?.length)return null;
  const initial=list.filter(b=>kind==='industrial'?b.capacityByType['00004200']>0:b.wealth===1);if(initial.length)list=initial;
  // Growth selection is reconstructed; these three size bands are provisional.
  const band=[8,24,64][Math.min(2,Math.max(0,level-1))];return list.find(b=>b.capacity[kind]>=band)||list.at(-1);
}
