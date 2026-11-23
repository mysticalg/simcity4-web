// Definitions compiled from the original exemplar/cohort bank, including bundled data.
import {hex} from './dbpf.mjs?v=0.7.0';
export const IDS={utilities:'6534284a-e7e2c2db-c911e35b',budget:'6534284a-e7e2c2db-0bff6824',traffic:'6534284a-e7e2c2db-c9133286',pipes:'6534284a-084344e0-095117db'};
const array=x=>Array.isArray(x)?x:[x];
const number=(x,fallback=0)=>Number.isFinite(Number(x))?Number(x):fallback;
export function compileGameData(bank){
  const cache=new Map();
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
    const blueprint={tgi,name:p['00000020']||tgi,model,size,wealth,powerGenerated:number(p['27812852']),powerConsumed:number(p['27812854']),waterProduced:number(p['88ed3303']),waterSource:number(p['48f23a7e']),waterConsumed:number(p['c8ed2d84']),monthlyCost:number(p['ea54d286']),plopCost:number(p['49cac341']),bulldozeCost:number(p['099afacd']),capacity,capacityByType,source:'original exemplar'};
    blueprint.label=({1:'Coal power plant',2:'Hydrogen power plant',3:'Gas power plant',5:'Nuclear power plant',6:'Oil power plant',7:'Solar power plant',8:'Waste-to-energy plant',9:'Wind turbine'})[number(p['27812853'])]||(capacity.residential?'Residential building':capacity.commercial?'Commercial building':capacity.industrial?'Industrial building':blueprint.name);
    if(blueprint.powerGenerated>0&&blueprint.plopCost>0&&[1,2,3,5,6,7,8,9].includes(number(p['27812853']))){const lotId=number(p['ea260589']),lot=merged('6534284a-a8fbd372-'+hex(lotId));blueprint.footprint=Array.isArray(lot['88edc790'])?lot['88edc790']:[Math.ceil(size[0]/16),Math.ceil(size[2]/16)];facilities.push(blueprint);}
    if(blueprint.waterProduced>0&&blueprint.plopCost>0){const lot=merged('6534284a-a8fbd372-'+hex(number(p['ea260589'])));blueprint.footprint=Array.isArray(lot['88edc790'])?lot['88edc790']:[Math.ceil(size[0]/16),Math.ceil(size[2]/16)];blueprint.label=/LargeWater/.test(blueprint.name)?'Large water pump':/Tower/.test(blueprint.name)?'Water tower':'Water pump';waterFacilities.push(blueprint);}
    if(size[0]<=15&&size[2]<=15){for(const kind of Object.keys(growables))if(capacity[kind]>0)growables[kind].push(blueprint);}
  }
  for(const kind of Object.keys(growables))growables[kind].sort((a,b)=>a.capacity[kind]-b.capacity[kind]||a.tgi.localeCompare(b.tgi));
  waterFacilities.sort((a,b)=>a.plopCost-b.plopCost);
  facilities.sort((a,b)=>a.plopCost-b.plopCost);
  return {sources:IDS,waterFacilities,waterPipeRadius:number(utilities['68f5436a']),waterFundingCurve:utilities['6a410bf2']||null,waterPipeMonthlyCost:number(utilities['8a84778f']),waterPipeCost:number(pipeTuning['4a2d49b9']),waterPipeBulldozeCost:number(pipeTuning['ea86e3b5']),initialFunds:array(budget['6a9c7718']).map(x=>number(x)),initialTaxRates:array(budget['0c032488']).map(x=>number(x)),powerRadiationRadius:number(utilities['a911e2f1']),powerFundingCurve:utilities['6911e2df']||null,roadMonthlyCost:number(array(traffic['6a84493e'])[0]),powerLineCost:number(utilities['0a5f596b']),powerPoleCost:number(utilities['4a5f5953']),facilities,growables};
}
export function growableForLevel(game,kind,level){
  let list=game?.growables?.[kind];if(!list?.length)return null;
  const initial=list.filter(b=>kind==='industrial'?b.capacityByType['00004200']>0:b.wealth===1);if(initial.length)list=initial;
  // Growth selection is reconstructed; these three size bands are provisional.
  const band=[8,24,64][Math.min(2,Math.max(0,level-1))];return list.find(b=>b.capacity[kind]>=band)||list.at(-1);
}
