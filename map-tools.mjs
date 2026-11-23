// Continuous, cardinal strokes avoid holes when the pointer moves several tiles.
export function gridStroke(a,b){
 const out=[];let x=a.x,z=a.z;const dx=Math.abs(b.x-x),dz=Math.abs(b.z-z),sx=Math.sign(b.x-x),sz=Math.sign(b.z-z);let tx=dx?.5/dx:Infinity,tz=dz?.5/dz:Infinity;
 out.push({x,z});while(x!==b.x||z!==b.z){if(tx<=tz){x+=sx;tx+=1/dx;}else{z+=sz;tz+=1/dz;}out.push({x,z});}return out;
}
export function zoneRectangle(a,b){const x=Math.min(a.x,b.x),z=Math.min(a.z,b.z);return {x,z,width:Math.abs(a.x-b.x)+1,depth:Math.abs(a.z-b.z)+1};}
export function roadConnections(x,z,hasRoad){return [[-1,0],[0,-1],[1,0],[0,1]].reduce((mask,[dx,dz],i)=>mask|(hasRoad(x+dx,z+dz)?1<<i:0),0);}
export function surfaceHeight(heights,n,x,z){
 x=Math.max(0,Math.min(n-1,x));z=Math.max(0,Math.min(n-1,z));const ix=Math.min(n-2,Math.floor(x)),iz=Math.min(n-2,Math.floor(z)),fx=x-ix,fz=z-iz,nw=heights[iz*n+ix],ne=heights[iz*n+ix+1],sw=heights[(iz+1)*n+ix],se=heights[(iz+1)*n+ix+1];
 return fx+fz<=1?nw*(1-fx-fz)+ne*fx+sw*fz:se*(fx+fz-1)+ne*(1-fz)+sw*(1-fx);
}
export function terrainQuadIndices(corners){
 const xs=corners.map(p=>p[0]),zs=corners.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs),find=(x,z)=>corners.findIndex(p=>Math.abs(p[0]-x)<.01&&Math.abs(p[1]-z)<.01),nw=find(minX,minZ),ne=find(maxX,minZ),sw=find(minX,maxZ),se=find(maxX,maxZ);
 return [nw,sw,ne,sw,se,ne];
}
export function shoreDistances(heights,n,seaLevel){
 const distances=new Float32Array(n*n).fill(n*2),queue=new Uint32Array(n*n);let first=0,last=0;heights.forEach((h,i)=>{if(h<=seaLevel){distances[i]=0;queue[last++]=i;}});
 while(first<last){const i=queue[first++],x=i%n,z=Math.floor(i/n),next=distances[i]+1;for(const[dx,dz]of[[-1,0],[1,0],[0,-1],[0,1]]){const nx=x+dx,nz=z+dz,j=nz*n+nx;if(nx<0||nx>=n||nz<0||nz>=n||distances[j]<=next)continue;distances[j]=next;queue[last++]=j;}}return distances;
}
