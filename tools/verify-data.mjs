import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {readIndex,decompress,terrain,savedBuildings,savedNetworks,savedLotTextures,savedScenery} from '../dbpf.mjs';
import {readSavedLots} from '../city-state.mjs';
const game=path.resolve(process.env.SC4_DATA||'../../work/extracted/app'),report={cities:0,buildings:0,lots:0,networks:0,lotTiles:0,props:0,flora:0,roadHeightErrors:[]};
function scan(dir){for(const f of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,f.name);if(f.isDirectory())scan(p);else if(/\.sc4$/i.test(p)){
const a=fs.readFileSync(p),idx=readIndex(a).entries,entry=(t)=>idx.find(e=>e.type===t&&(t!==0xa9dd6ff4||e.instance===1));
const raw=e=>decompress(a.subarray(e.offset,e.offset+e.size)),te=entry(0xa9dd6ff4);if(!te)continue;const map=terrain(raw(te));report.cities++;
const be=entry(0xa9bd882d),ne=entry(0xc9c05c6e),le=entry(0xc97f987c);if(be)report.buildings+=savedBuildings(raw(be)).length;if(le)report.lotTiles+=savedLotTextures(raw(le)).length;
const lots=entry(0xc9bd5d4a);if(lots)report.lots+=readSavedLots(raw(lots)).length;
for(const [t,flora,key]of[[0x2977aa47,false,'props'],[0xa9c05c85,true,'flora']]){const e=entry(t);if(e)report[key]+=savedScenery(raw(e),flora).length;}
if(ne){const networks=savedNetworks(raw(ne));report.networks+=networks.length;for(const n of networks)for(const v of n.vertices){const [x,y,z]=v.position,ix=Math.round(x/16),iz=Math.round(z/16);if(ix>=0&&ix<map.n&&iz>=0&&iz<map.n&&Math.abs(x-ix*16)<.01&&Math.abs(z-iz*16)<.01)report.roadHeightErrors.push(Math.abs(map.heights[iz*map.n+ix]-y));}}
}}}
scan(path.join(game,'Regions'));report.roadHeightErrors.sort((a,b)=>a-b);const medianRoadHeightError=report.roadHeightErrors[Math.floor(report.roadHeightErrors.length/2)];assert(medianRoadHeightError<.01,'Terrain and saved roads must agree on world axes and heights');const result={...report,roadHeightErrors:undefined,medianRoadHeightError,sampledRoadVertices:report.roadHeightErrors.length};fs.writeFileSync('research/savegame-audit.json',JSON.stringify(result,null,2));console.log(result);
