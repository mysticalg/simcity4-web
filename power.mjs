// Reconstructed distribution model. Capacity and radius come from original data.
// Native brownout allocation, neighbor deals, wear and timing remain unverified.
export function radiationBounds(bounds,radius,width,depth=width){
  return {minX:Math.max(0,bounds.minX-radius),minZ:Math.max(0,bounds.minZ-radius),maxX:Math.min(width-1,bounds.maxX+radius),maxZ:Math.min(depth-1,bounds.maxZ+radius)};
}
export function responseCurve(points,value){
  if(!Array.isArray(points)||points.length<2)return 0;if(value<=points[0])return points[1];for(let i=2;i+1<points.length;i+=2)if(value<=points[i]){const t=(value-points[i-2])/(points[i]-points[i-2]);return points[i-1]+(points[i+1]-points[i-1])*t;}return points.at(-1);
}
export function solvePower(objects,{radius=2}={}){
  const nodes=objects.filter(o=>o.conducts!==false),parent=nodes.map((_,i)=>i),rank=new Uint8Array(nodes.length);
  const find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
  function union(a,b){a=find(a);b=find(b);if(a===b)return;if(rank[a]<rank[b])[a,b]=[b,a];parent[b]=a;if(rank[a]===rank[b])rank[a]++;}
  const links=new Map();nodes.forEach((n,i)=>{for(const id of n.links||[]){if(links.has(id))union(i,links.get(id));else links.set(id,i);}});
  const occupancy=new Map(),bounds=n=>({minX:n.x,minZ:n.z,maxX:n.x+(n.width||1)-1,maxZ:n.z+(n.depth||1)-1});
  nodes.forEach((n,i)=>{const b=bounds(n);for(let z=b.minZ;z<=b.maxZ;z++)for(let x=b.minX;x<=b.maxX;x++){const k=x+','+z;if(!occupancy.has(k))occupancy.set(k,[]);occupancy.get(k).push(i);}});
  nodes.forEach((n,i)=>{const b=bounds(n),r=n.line?1:radius;for(let z=b.minZ-r;z<=b.maxZ+r;z++)for(let x=b.minX-r;x<=b.maxX+r;x++){if(n.line&&(x<b.minX||x>b.maxX)&&(z<b.minZ||z>b.maxZ))continue;for(const j of occupancy.get(x+','+z)||[])union(i,j);}});
  const circuits=new Map();nodes.forEach((n,i)=>{const root=find(i);if(!circuits.has(root))circuits.set(root,{id:root,supply:0,demand:0,objects:[]});const c=circuits.get(root);c.supply+=Math.max(0,Number(n.generation)||0);c.demand+=Math.max(0,Number(n.consumption)||0);c.objects.push(n.id);});
  const states=new Map();let supply=0,demand=0,connectedDemand=0,poweredCount=0,brownoutCount=0;
  for(const c of circuits.values()){c.ratio=c.supply>0?(c.demand?Math.min(1,c.supply/c.demand):1):0;supply+=c.supply;demand+=c.demand;if(c.supply>0)connectedDemand+=c.demand;for(const id of c.objects){const powered=c.ratio>=1,brownout=c.ratio>0&&c.ratio<1;states.set(id,{circuit:c.id,powered,brownout,ratio:c.ratio});if(powered)poweredCount++;if(brownout)brownoutCount++;}}
  return {states,circuits:[...circuits.values()],supply,demand,connectedDemand,poweredCount,brownoutCount};
}
