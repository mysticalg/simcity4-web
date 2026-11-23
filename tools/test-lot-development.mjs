import assert from 'node:assert/strict';import fs from 'node:fs';import zlib from 'node:zlib';import {selectDevelopment,lotDimensions,lotPoint} from '../lot-development.mjs';
const manifest=JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('../assets/index.bin',import.meta.url)))),game=manifest.catalog.game;
assert.equal(game.lots.length,1733);const recipe=game.lots.find(l=>l.name==='R$1_1x3'&&l.stage===1);assert(recipe);assert.deepEqual(recipe.size,[1,3]);assert(recipe.objects.some(o=>o.type===2));assert(recipe.objects.some(o=>o.type===1&&o.choices.length));assert(recipe.choices.every(b=>b.source==='original exemplar'));
for(const kind of ['residential','commercial','industrial'])for(let side=0;side<4;side++){
 const c={x:0,z:0,kind,level:0},cells=new Map();for(let z=0;z<3;z++)for(let x=0;x<3;x++)cells.set(x+','+z,{x,z,kind,level:0});
 const hasRoad=(x,z)=>side===0?z===3&&x>=0&&x<3:side===1?x===-1&&z>=0&&z<3:side===2?z===-1&&x>=0&&x<3:x===3&&z>=0&&z<3;
 const args={cellAt:(x,z)=>cells.get(x+','+z),hasRoad,powered:()=>true},plan=selectDevelopment(game,c,args);assert(plan,kind+' must develop beside each road edge');assert(plan.building.capacity[kind]>0);assert.equal(plan.lot.stage,1);assert.deepEqual([plan.width,plan.depth],lotDimensions(plan.lot,plan.rotation));assert.equal(selectDevelopment(game,c,{...args,powered:()=>false}),null);assert.equal(selectDevelopment(game,c,{...args,hasRoad:()=>false}),null);
 // A different zone or existing building must prevent a recipe spanning that tile.
 cells.set('0,0',{...c,kind:'road'});assert.equal(selectDevelopment(game,c,args),null);
}
assert.deepEqual(lotPoint({size:[1,3]},1,8,48),[0,8]);assert.deepEqual(lotPoint({size:[1,3]},2,8,48),[8,0]);console.log('1733 original recipes, building-family resolution, multi-tile zone assembly, four road orientations and power/occupancy gates: passed');
