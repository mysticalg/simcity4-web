// Native SC4PATHS geometry and traffic exemplar tuning; allocation is reconstructed.
export function readPaths(text){
 const lines=text.replace(/--[^\r\n]*/g,'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);let i=0;
 if(lines[i++]!=='SC4PATHS')throw Error('Invalid SC4PATHS signature');const version=lines[i++];if(!['1.0','1.1','1.2'].includes(version))throw Error('Unsupported SC4PATHS version');
 const num=()=>{const n=Number(lines[i++]);if(!Number.isFinite(n))throw Error('Invalid path number');return n;},count=num(),stops=version==='1.0'?0:num(),terrainVariance=num(),paths=[],stopPaths=[];
 const coord=()=>{const a=lines[i++]?.split(',').map(Number);if(a?.length!==3||!a.every(Number.isFinite))throw Error('Invalid path coordinate');return a;};
 for(let p=0;p<count;p++){const transport=num(),classNumber=num(),entry=num(),exit=num(),junction=version==='1.2'?num():0,n=num();if(n<1||n>10000)throw Error('Invalid path length');paths.push({transport,classNumber,entry,exit,junction,points:Array.from({length:n},coord)});}
 for(let p=0;p<stops;p++)stopPaths.push({uk:num(),transport:num(),classNumber:num(),entry:num(),exit:num(),point:coord()});
 if(i!==lines.length)throw Error('Unexpected path data');return {version,terrainVariance,paths,stopPaths};
}
const dirs=[[-1,0],[0,-1],[1,0],[0,1]],key=(x,z)=>x+','+z;
export function pathTransitions(def,vertices){
 if(!def)return [];const corner=(u,v)=>vertices.find(p=>Math.abs(p.uv[0]-u)<.001&&Math.abs(p.uv[1]-v)<.001)?.position,a=corner(0,0),b=corner(1,0),c=corner(0,1);if(!a||!b||!c)return [];
 const side=s=>{if(s===255)return s;const [x,z]=dirs[s],dx=(b[0]-a[0])*x+(c[0]-a[0])*z,dz=(b[2]-a[2])*x+(c[2]-a[2])*z;return Math.abs(dx)>Math.abs(dz)?dx<0?0:2:dz<0?1:3;};
 return def.paths.filter(p=>p.transport===1).map(p=>({entry:side(p.entry),exit:side(p.exit),length:p.points.slice(1).reduce((n,q,i)=>n+Math.hypot(...q.map((v,j)=>v-p.points[i][j])),0)}));
}
export function speedFactor(curve,ratio){if(ratio<=curve[0])return curve[1];for(let i=2;i<curve.length;i+=2)if(ratio<=curve[i])return curve[i-1]+(curve[i+1]-curve[i-1])*(ratio-curve[i-2])/(curve[i]-curve[i-2]);return curve.at(-1);}
class Heap{a=[];push(v){let i=this.a.length;this.a.push(v);while(i){const p=(i-1)>>1;if(this.a[p].cost<=v.cost)break;this.a[i]=this.a[p];i=p;}this.a[i]=v;}pop(){const out=this.a[0],v=this.a.pop();if(this.a.length){let i=0;while(i*2+1<this.a.length){let c=i*2+1;if(c+1<this.a.length&&this.a[c+1].cost<this.a[c].cost)c++;if(this.a[c].cost>=v.cost)break;this.a[i]=this.a[c];i=c;}this.a[i]=v;}return out;}}
export function solveTraffic(roads,lots,tuning){
 const nodes=new Map(roads.map(r=>[key(r.x,r.z),r])),volumes=new Map(),states=new Map(),routes=[],jobs=lots.filter(l=>l.jobs>0).map(l=>({...l,remaining:l.jobs})),dest=new Map();
 function access(l){const out=new Set();for(let z=l.z;z<l.z+l.depth;z++)for(let x=l.x;x<l.x+l.width;x++)for(const [dx,dz]of dirs){const k=key(x+dx,z+dz),r=nodes.get(k);if(r&&![2,12].includes(r.type))out.add(k);}return [...out];}
 for(const j of jobs)for(const k of access(j)){if(!dest.has(k))dest.set(k,[]);dest.get(k).push(j);}
 let workers=0,employed=0,totalTime=0;
 for(const home of lots.filter(l=>l.residents>0).sort((a,b)=>a.id.localeCompare(b.id))){const wanted=Math.floor(home.residents*(tuning.workforce?.[Math.max(0,(home.wealth||1)-1)]??.42)),starts=access(home),assigned=[];let left=wanted;workers+=wanted;
  // One shortest-path search can allocate a household among several reachable employers.
  const queue=new Heap(),best=new Map(),prev=new Map(),done=new Set();for(const k of starts){const id=k+':255',cost=tuning.startCost;best.set(id,cost);queue.push({id,k,entry:255,cost});}
  while(queue.a.length&&left>0){const cur=queue.pop();if(done.has(cur.id)||cur.cost>tuning.maxTime)continue;done.add(cur.id);
   for(const j of dest.get(cur.k)||[]){if(j.remaining<=0)continue;const count=Math.min(left,j.remaining);left-=count;j.remaining-=count;employed+=count;totalTime+=cur.cost*count;const path=[];for(let id=cur.id;id;id=prev.get(id))path.push(id.slice(0,id.lastIndexOf(':')));path.reverse();for(const k of new Set(path))volumes.set(k,(volumes.get(k)||0)+count*tuning.volumePerPopulation);const route={home:home.id,job:j.id,workers:count,time:cur.cost,path};assigned.push(route);routes.push(route);if(!left)break;}
   const r=nodes.get(cur.k);for(const p of r.transitions){if(p.entry!==cur.entry&&cur.entry!==255)continue;if(p.exit===255)continue;const [dx,dz]=dirs[p.exit],k=key(r.x+dx,r.z+dz),n=nodes.get(k),entry=(p.exit+2)%4;if(!n||!n.transitions.some(t=>t.entry===entry))continue;
    const capacity=tuning.capacities[r.type]||1,speed=tuning.speeds[r.type]||0,factor=speedFactor(tuning.congestion,(volumes.get(cur.k)||0)/capacity);if(!speed||factor<=0)continue;
    const cost=cur.cost+p.length*60/(1000*speed*factor),id=k+':'+entry;if(cost<=tuning.maxTime&&cost<(best.get(id)??Infinity)){best.set(id,cost);prev.set(id,cur.id);queue.push({id,k,entry,cost});}
   }
  }
  states.set(home.id,{workers:wanted,employed:wanted-left,unemployed:left,reason:!starts.length?'No road access':left?'No reachable job capacity':'Jobs accessible',routes:assigned});
 }
 return {workers,employed,unemployed:workers-employed,averageTime:employed?totalTime/employed:0,jobSpaces:jobs.reduce((n,j)=>n+j.jobs,0),vacancies:jobs.reduce((n,j)=>n+j.remaining,0),states,volumes,routes,nodes};
}

