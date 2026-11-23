import assert from'node:assert/strict';import fs from'node:fs';import zlib from'node:zlib';import{solvePower,radiationBounds,responseCurve}from'../power.mjs';
const game=JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('../assets/index.bin',import.meta.url)))).catalog.game,wind=game.facilities.find(b=>/WindPower/.test(b.name)),coal=game.facilities.find(b=>/CoalPowerPlant/.test(b.name));
assert.deepEqual(game.initialFunds,[500000,200000,100000]);assert.equal(game.powerRadiationRadius,2);assert.equal(wind.powerGenerated,200);assert.equal(wind.plopCost,500);assert.equal(wind.monthlyCost,50);assert.equal(coal.powerGenerated,6000);assert.equal(coal.plopCost,10000);assert.equal(coal.monthlyCost,250);
assert.deepEqual(radiationBounds({minX:0,minZ:255,maxX:2,maxZ:255},2,256),{minX:0,minZ:253,maxX:4,maxZ:255});
const source={id:'plant',x:0,z:0,width:2,depth:1,generation:wind.powerGenerated},load={id:'home',x:20,z:0,consumption:50};
assert.equal(solvePower([source,load]).states.get('home').powered,false);
const lines=Array.from({length:17},(_,i)=>({id:'line'+i,x:i+3,z:0,line:true}));let result=solvePower([source,...lines,load]);assert.equal(result.states.get('home').powered,true);assert.equal(result.supply,200);assert.equal(result.demand,50);
result=solvePower([source,...lines.filter(n=>n.x!==10),load]);assert.equal(result.states.get('home').powered,false,'Removing a mid-line conductor must disconnect the far load');
assert.equal(solvePower([source,{id:'corner',x:3,z:2,consumption:10}]).states.get('corner').powered,true);assert.equal(solvePower([source,{id:'outside',x:4,z:2,consumption:10}]).states.get('outside').powered,false);
result=solvePower([source,...[0,1,2].map(z=>({id:'consumer'+z,x:2,z,consumption:100}))]);assert.equal(result.demand,300);assert.equal(result.states.get('consumer0').brownout,true);assert(Math.abs(result.states.get('consumer0').ratio-2/3)<1e-8);
assert.equal(responseCurve(game.powerFundingCurve,50),25);assert.equal(responseCurve(game.powerFundingCurve,100),100);assert.equal(responseCurve(game.powerFundingCurve,120),110);assert.equal(responseCurve(game.powerFundingCurve,0),0);
console.log('Native data values, clamped radiation bounds, connected/disconnected supply, overload and funding: passed');

const endpointSource={id:'source',x:0,z:0,generation:100},endpointLoad={id:'load',x:11,z:0,consumption:10},spans=[{id:'wireA',x:1,z:0,line:true,links:['pole:1','pole:2']},{id:'wireB',x:10,z:0,line:true,links:['pole:2','pole:3']}];
assert(solvePower([endpointSource,...spans,endpointLoad]).states.get('load').powered,'Saved endpoint references join a native span');
assert(!solvePower([endpointSource,spans[0],{...spans[1],links:['pole:4','pole:5']},endpointLoad]).states.get('load').powered,'Independent spans must stay disconnected');
