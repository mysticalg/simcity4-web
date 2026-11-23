// Native brush masks and operation callbacks; application cadence is reconstructed.
export const terrainToolKinds=new Set(['raise','lower','level']);
export function sampleBrush(mask,u,v){
 if(u<0||u>1||v<0||v>1)return 0;const x=u*(mask.width-1),z=v*(mask.height-1),ix=Math.floor(x),iz=Math.floor(z),jx=Math.min(mask.width-1,ix+1),jz=Math.min(mask.height-1,iz+1),tx=x-ix,tz=z-iz,a=mask.pixels[iz*mask.width+ix]*(1-tx)+mask.pixels[iz*mask.width+jx]*tx,b=mask.pixels[jz*mask.width+ix]*(1-tx)+mask.pixels[jz*mask.width+jx]*tx;return a*(1-tz)+b*tz;
}
export function terrainBrushPlan({heights,n,config,kind,x,z,target,locked=()=>false}){
 const brush=config.brushes[kind];if(!brush)throw Error('Unknown terrain brush');const width=Math.max(...brush.components.map(c=>c.widths[4])),cx=(x+.5)*16,cz=(z+.5)*16,half=(n-1)/2,changes=new Map(),protectedVertices=new Set();
 const value=i=>changes.get(i)?.after??heights[i],inside=(gx,gz)=>gx>=0&&gz>=0&&gx<n&&gz<n;
 const write=(gx,gz,next)=>{if(!inside(gx,gz))return;const i=gz*n+gx;if(locked(gx-half,gz-half)){protectedVertices.add(i);return;}const after=Math.fround(Math.max(config.minHeight,Math.min(config.maxHeight,next)));if(Math.abs(after-heights[i])<.00001)changes.delete(i);else changes.set(i,{index:i,before:heights[i],after});};
 for(const c of brush.components){const w=c.widths[4],strength=c.strengths[4],mask=config.masks[c.texture],left=cx-w/2,top=cz-w/2;for(let gz=Math.max(0,Math.ceil(top/16+half));gz<=Math.min(n-1,Math.floor((cz+w/2)/16+half));gz++)for(let gx=Math.max(0,Math.ceil(left/16+half));gx<=Math.min(n-1,Math.floor((cx+w/2)/16+half));gx++){
  const pixel=sampleBrush(mask,((gx-half)*16-left)/w,((gz-half)*16-top)/w),i=gz*n+gx,current=value(i);
  if(c.operation===0){const delta=(pixel-c.base)*strength;if(Math.abs(delta)>.00001)write(gx,gz,current+delta);}
  else if(c.operation===5&&Number.isFinite(target)&&pixel>0){const step=pixel*strength/256;write(gx,gz,current+Math.sign(target-current)*Math.min(Math.abs(target-current),step));}
  else if(c.operation===2&&pixel>0){
   // Native smoothing transfers excess slope to each of eight neighbours.
   for(const [dx,dz]of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]){const nx=gx+dx,nz=gz+dz;if(!inside(nx,nz))continue;const ni=nz*n+nx,excess=value(i)-value(ni)-16*Math.hypot(dx,dz);if(excess<=0)continue;if(locked(gx-half,gz-half)||locked(nx-half,nz-half)){protectedVertices.add(i);continue;}const delta=excess*pixel*strength/256;write(gx,gz,value(i)-delta);write(nx,nz,value(ni)+delta);}
  }
 }}
 const records=[...changes.values()];return {kind,x:x+.5-width/32,z:z+.5-width/32,width:width/16,depth:width/16,brushMetres:width,price:records.length?brush.costs[4]:0,changes:records,protectedVertices:protectedVertices.size,target};
}
export function applyHeightChanges(heights,changes,reverse=false){for(const c of changes)heights[c.index]=reverse?c.before:c.after;}
export function heightEdits(heights,base){const edits=[];for(let i=0;i<heights.length;i++)if(heights[i]!==base[i])edits.push([i,heights[i]]);return edits;}
export function restoreHeightEdits(heights,base,edits,min,max){
 if(!Array.isArray(edits)||edits.length>heights.length)throw Error('Invalid terrain edits');const seen=new Set();for(const e of edits){if(!Array.isArray(e)||e.length!==2||!Number.isInteger(e[0])||e[0]<0||e[0]>=heights.length||seen.has(e[0])||!Number.isFinite(e[1])||e[1]<min||e[1]>max)throw Error('Invalid terrain vertex');seen.add(e[0]);}heights.set(base);for(const [i,h]of edits)heights[i]=h;
}
