// Native tunables; reconstructed connectivity/shortage allocation.
// Consumers never join pipes or connect two overlapping service areas.
export function solveWater(pipes,sources,consumers,{radius=7}={}){
 const nodes=[...pipes.map(p=>({...p,pipe:true})),...sources],parent=nodes.map((_,i)=>i),byTile=new Map();
 const find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
 const join=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent[b]=a;};
 nodes.forEach((n,i)=>{for(let z=n.z;z<n.z+(n.depth||1);z++)for(let x=n.x;x<n.x+(n.width||1);x++){const k=x+','+z;if(!byTile.has(k))byTile.set(k,[]);byTile.get(k).push(i);}});
 for(const[k,ids]of byTile){const[x,z]=k.split(',').map(Number);for(const i of ids)for(const[dx,dz]of[[0,0],[1,0],[-1,0],[0,1],[0,-1]])for(const j of byTile.get((x+dx)+','+(z+dz))||[])join(i,j);}
 const circuits=new Map(),coverage=new Map();nodes.forEach((n,i)=>{const id=find(i);if(!circuits.has(id))circuits.set(id,{id,supply:0,demand:0,pipes:[],sources:[],consumers:[]});const c=circuits.get(id);if(n.pipe)c.pipes.push(n.id);else{c.sources.push(n.id);c.supply+=Math.max(0,Number(n.generation)||0);}});
 for(const[k,ids]of byTile){const[x,z]=k.split(',').map(Number),id=find(ids[0]);for(let dz=-radius;dz<=radius;dz++)for(let dx=-radius;dx<=radius;dx++){const key=(x+dx)+','+(z+dz);if(!coverage.has(key))coverage.set(key,new Set());coverage.get(key).add(id);}}
 const states=new Map();let demand=0;
 for(const n of consumers){const usage=Math.max(0,Number(n.consumption)||0);demand+=usage;const nearby=new Set();for(let z=n.z;z<n.z+(n.depth||1);z++)for(let x=n.x;x<n.x+(n.width||1);x++)for(const id of coverage.get(x+','+z)||[])nearby.add(id);
  const choices=[...nearby].map(id=>circuits.get(id)).sort((a,b)=>(b.supply-b.demand)-(a.supply-a.demand)||a.id-b.id),c=choices[0];if(c){c.demand+=usage;c.consumers.push(n.id);states.set(n.id,{circuit:c.id});}else states.set(n.id,{circuit:null,watered:false,ratio:0});
 }
 let supply=0,connectedDemand=0,wateredCount=0,shortageCount=0;const pipeStates=new Map();
 for(const c of circuits.values()){supply+=c.supply;if(c.supply>0)connectedDemand+=c.demand;c.ratio=c.supply>0?(c.demand?Math.min(1,c.supply/c.demand):1):0;for(const id of c.pipes)pipeStates.set(id,{circuit:c.id,ratio:c.ratio,active:c.supply>0});for(const id of c.consumers){const watered=c.ratio>=1;states.set(id,{circuit:c.id,ratio:c.ratio,watered});if(watered)wateredCount++;else if(c.supply>0)shortageCount++;}}
 return {states,pipeStates,coverage,circuits:[...circuits.values()],supply,demand,connectedDemand,wateredCount,shortageCount};
}
