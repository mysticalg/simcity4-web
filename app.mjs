import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {decompress,terrain,s3d,fsh,hex,exemplar,savedBuildings,savedNetworks,savedLotTextures,savedScenery} from './dbpf.mjs';
import {openLocal,importFiles,getResource,getTexture} from './data-source.mjs';
const $=s=>document.querySelector(s),canvas=$('#game');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x8daeb9);renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(42,1,1,30000),controls=new OrbitControls(camera,canvas);scene.background=new THREE.Color(0x8daeb9);
controls.mouseButtons={LEFT:null,MIDDLE:THREE.MOUSE.PAN,RIGHT:THREE.MOUSE.ROTATE};controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.49;controls.minDistance=20;controls.maxDistance=12000;
scene.add(new THREE.HemisphereLight(0xe5f5ff,0x647448,2.3));const sun=new THREE.DirectionalLight(0xfff2d4,2.4);sun.position.set(-700,1500,400);scene.add(sun);
const cityScene=new THREE.Group(),assetScene=new THREE.Group(),lots=new THREE.Group(),savedCity=new THREE.Group();scene.add(cityScene,assetScene);cityScene.add(lots,savedCity);assetScene.visible=false;
let savedCount=0,savedMissing=0,savedRequest=0,savedNetworkCount=0,savedTextureCount=0,savedPropCount=0,savedFloraCount=0,savedSceneryMissing=0,savedView=false;
let sceneryFailures={};
function setSavedView(value){if(savedView&&!value)savedRequest++;savedView=value;savedCity.visible=value;lots.visible=!value;$('#back-sandbox').hidden=!value;for(const id of ['pause','step','save','restore','reset'])$('#'+id).disabled=value;stats();}
function clearSavedCity(){for(const child of savedCity.children){if(child.userData.original){child.dispose?.();continue;}child.geometry?.dispose();child.material?.dispose();}savedCity.clear();}
let catalog,ground,water,map,cityIndex=0,mode='city',tool='inspect',hover=null,month=0,balance=100000,population=0,jobs=0,net=0,paused=true,clock=0,loading=false,ready=false,modelRequest=0,activeModel=null,modelGroup=null;
const cells=new Map(),ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),costs={road:10,residential:20,commercial:25,industrial:30,power:500,park:40,bulldoze:5};
function notice(s){$('#notice').textContent=s;}
function stats(){const stats=mode==='city'?(savedView?[['Original buildings',savedCount],['Original road tiles',savedNetworkCount],['Original props',savedPropCount],['Original trees',savedFloraCount],['Simulation','Viewer only']]:[['Treasury','§ '+Math.round(balance).toLocaleString()],['Residents',population.toLocaleString()],['Jobs',jobs.toLocaleString()],['Month',month],['Balance',`${net>=0?'+':''}${Math.round(net)}`]]):[['Geometry','Original S3D'],['Textures','Original FSH'],['Renderer','WebGL']];$('#stats').replaceChildren(...stats.map(([k,v])=>{const e=document.createElement('div');e.className='stat';e.innerHTML=`${k}<b></b>`;e.lastElementChild.textContent=v;return e;}));}
function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;if(canvas.width!==Math.round(w*renderer.getPixelRatio())||canvas.height!==Math.round(h*renderer.getPixelRatio())){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}}
function render(){resize();controls.update();renderer.render(scene,camera);}
function dispose(object){object.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material]){m.map?.dispose();m.dispose();}}});}
const resource=getResource;
function elevation(x,z){if(!map)return 0;const nx=Math.max(0,Math.min(map.n-1,x/16+(map.n-1)/2)),nz=Math.max(0,Math.min(map.n-1,z/16+(map.n-1)/2)),ix=Math.min(map.n-2,Math.floor(nx)),iz=Math.min(map.n-2,Math.floor(nz)),fx=nx-ix,fz=nz-iz,a=map.heights;return (a[iz*map.n+ix]*(1-fx)+a[iz*map.n+ix+1]*fx)*(1-fz)+(a[(iz+1)*map.n+ix]*(1-fx)+a[(iz+1)*map.n+ix+1]*fx)*fz-250;}
function clearLots(){for(const c of cells.values()){lots.remove(c.object);dispose(c.object);}cells.clear();month=0;balance=100000;population=jobs=net=0;paused=true;$('#pause').textContent='Run';stats();}
async function loadTerrain(index){
  if(loading)return;loading=true;try{
    const c=catalog.cities[index],next=terrain(await resource(`archive=${c.archive}&index=${c.index}`));
    map=next;cityIndex=index;clearLots();savedRequest++;savedCount=savedMissing=savedNetworkCount=savedTextureCount=savedPropCount=savedFloraCount=savedSceneryMissing=0;clearSavedCity();setSavedView(false);$('#saved-buildings').disabled=!c.subfiles?.a9bd882d;if(ground){cityScene.remove(ground,water);dispose(ground);dispose(water);}
    const n=map.n,size=(n-1)*16,g=new THREE.PlaneGeometry(size,size,n-1,n-1);g.rotateX(-Math.PI/2);
    const pos=g.attributes.position,colors=[];
    for(let i=0;i<pos.count;i++){
      const h=map.heights[i]-250;pos.setY(i,h);let col=new THREE.Color();
      const variation=((Math.sin(i*127.1)*43758.5453)%1)*.004;
      if(h<0)col.setRGB(.32,.43,.33);else if(h<5)col.setRGB(.69+variation,.65+variation,.44+variation);else if(h<130)col.setRGB(.27+variation,.43+variation,.23+variation);else if(h<350)col.setRGB(.39+variation,.44+variation,.29+variation);else col.setRGB(.58+variation,.59+variation,.54+variation);
      colors.push(col.r,col.g,col.b);
    }
    g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();ground=new THREE.Mesh(g,new THREE.MeshLambertMaterial({vertexColors:true}));cityScene.add(ground);
    water=new THREE.Mesh(new THREE.PlaneGeometry(size,size),new THREE.MeshPhongMaterial({color:0x397e98,transparent:true,opacity:.86,shininess:90}));water.rotation.x=-Math.PI/2;water.position.y=.2;cityScene.add(water);
    camera.position.set(size*.65,size*.6,size*.65);controls.target.set(0,Math.max(0,elevation(0,0)),0);controls.update();
    $('#scene-label').textContent=c.name.replace('City - ','').replace('.sc4','')+' · original terrain';
    notice(`${n-1} × ${n-1} original tiles loaded. Select a tool and build on dry land.`);stats();
  }catch(e){notice('Terrain load failed: '+e.message);}finally{loading=false;}
}
function cube(group,x,y,z,w,h,d,color){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshLambertMaterial({color}));mesh.position.set(x,y+h/2,z);group.add(mesh);return mesh;}
function visual(c){
  const o=new THREE.Group(),h=elevation(c.x*16+8,c.z*16+8);o.position.set(c.x*16+8,h+.45,c.z*16+8);
  const colors={road:0x404c50,residential:0x4eae6c,commercial:0x4c91ba,industrial:0xb9a34b,power:0x8a9095,park:0x397b40};
  cube(o,0,0,0,15.7,.4,15.7,colors[c.kind]);
  if(c.kind==='road'){cube(o,0,.25,0,.45,.1,10,0xe5d8a4);cube(o,-7,.25,0,1.2,.3,15,0xa9aaa2);cube(o,7,.25,0,1.2,.3,15,0xa9aaa2);}
  if(c.kind==='power'){cube(o,0,.2,0,10,5,10,0x919c9a);cube(o,3,5,2,2,12,2,0xccc9b6);cube(o,-4,.2,-4,3,3,3,0xd7bd79);}
  if(c.kind==='park'){for(const [x,z]of [[-4,-4],[4,3],[-3,4]]){cube(o,x,0,z,1,4,1,0x756446);const tree=new THREE.Mesh(new THREE.ConeGeometry(3,8,7),new THREE.MeshLambertMaterial({color:0x2f7040}));tree.position.set(x,6,z);o.add(tree);}}
  if(c.level){const hh=c.kind==='residential'?7+c.level*3:c.kind==='commercial'?10+c.level*8:5+c.level*2;cube(o,0,.4,0,10,hh,11,c.kind==='residential'?0xe0d4b9:c.kind==='commercial'?0xbed9df:0xb6b2a1);cube(o,0,hh+.4,0,11,1,12,c.kind==='residential'?0x84634d:0x586b71);for(let f=3;f<hh;f+=3)for(let x=-3;x<=3;x+=3)cube(o,x,f,5.6,1.4,1.3,.1,0x6b9aaa);}
  return o;
}
function refreshCell(c){if(c.object){lots.remove(c.object);dispose(c.object);}c.object=visual(c);lots.add(c.object);}
function powered(x,z){return [...cells.values()].some(c=>c.kind==='power'&&Math.abs(c.x-x)+Math.abs(c.z-z)<=24);}
function roadside(x,z){return [...cells.values()].some(c=>c.kind==='road'&&Math.abs(c.x-x)+Math.abs(c.z-z)<=3);}
function place(x,z,kind=tool,free=false){
  if(!map||loading||savedView)return false;
  const lim=(map.n-1)/2;if(x< -lim||z< -lim||x>=lim||z>=lim)return false;
  const h=elevation(x*16+8,z*16+8),key=x+','+z,old=cells.get(key);
  if(kind==='inspect'){notice(old?`${old.kind} (${x}, ${z}) · Stage ${old.level||0} · ${powered(x,z)?'Power available':'No power'} · ${roadside(x,z)?'Road nearby':'No road access'}`:`Tile (${x}, ${z}) · ${Math.round(h+250)} m elevation`);return false;}
  if(old?.kind===kind)return false;
  if(h<1&&kind!=='bulldoze'){notice('Build on dry land. Bridges are not implemented.');return false;}
  if(kind==='bulldoze'&&!old)return false;
  const price=costs[kind];if(!free&&balance<price){notice('Insufficient funds.');return false;}
  if(old){lots.remove(old.object);dispose(old.object);cells.delete(key);}
  if(kind!=='bulldoze'){const c={x,z,kind,level:0};refreshCell(c);cells.set(key,c);}
  if(!free)balance-=price;stats();return true;
}
function simulate(){
  month++;let upkeep=0;population=jobs=0;
  for(const c of cells.values()){
    upkeep+=c.kind==='power'?45:c.kind==='road'?.2:c.kind==='park'?1:.1;
    if(['residential','commercial','industrial'].includes(c.kind)){
      if(powered(c.x,c.z)&&roadside(c.x,c.z)&&c.level<3){c.level++;refreshCell(c);}
      if(c.kind==='residential')population+=c.level*8;else jobs+=c.level*(c.kind==='industrial'?12:8);
    }
  }
  net=Math.round((Math.min(population,jobs)*.7+population*.3)-upkeep);balance+=net;
  notice(`Month ${month} · ${net>=0?'Surplus':'Deficit'} §${Math.abs(net)}. Zones need nearby roads and power to grow.`);stats();
}
const textures=new Map();
async function texture(id,group){const key=group+':'+id;if(!textures.has(key))textures.set(key,(async()=>{const a=await getTexture(id,group);if(!a)return null;const img=fsh(a),t=new THREE.DataTexture(img.rgba,img.w,img.h,THREE.RGBAFormat);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.needsUpdate=true;return t;})().catch(()=>null));return textures.get(key);}
async function originalModel(entry){
  const d=s3d(await resource('tgi='+entry.tgi)),o=new THREE.Group();let missing=0,triangles=0;
  for(const g of d.groups){
    const vert=d.verts[g.vert],idx=d.indices[g.indx],prim=d.prims[g.prim],mat=d.mats[g.mats];if(!vert||!idx||!prim)continue;
    const trianglesList=[];
    for(const p of prim){const list=idx.slice(p.first,p.first+p.count);if(p.type===0)trianglesList.push(...list);else if(p.type===1){for(let k=2;k<list.length;k++)trianglesList.push(list[k-2+(k%2)],list[k-1-(k%2)],list[k]);}else if(p.type===2){for(let k=2;k<list.length;k++)trianglesList.push(list[0],list[k-1],list[k]);}}
    if(!trianglesList.length)continue;const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(vert.pos,3));geom.setAttribute('uv',new THREE.Float32BufferAttribute(vert.uv,2));geom.setIndex(trianglesList);geom.computeVertexNormals();
    const tex=mat?.textures[0]!==undefined?await texture(mat.textures[0],entry.group):null;if(!tex)missing++;
    const material=new THREE.MeshBasicMaterial({map:tex,color:tex?0xffffff:0xb8c7ca,side:THREE.DoubleSide,transparent:true,alphaTest:.12});
    o.add(new THREE.Mesh(geom,material));triangles+=trianglesList.length/3;
  }
  if(!o.children.length)throw Error('No supported triangles in this model');return {object:o,data:d,missing,triangles};
}
const exemplarCache=new Map(),buildingModelCache=new Map();
async function inheritedExemplar(tgi,depth=0){
  if(depth>20)throw Error('Cohort inheritance too deep');
  if(!exemplarCache.has(tgi))exemplarCache.set(tgi,(async()=>{const ex=exemplar(await resource('tgi='+tgi));let parent={};if(ex.parent!=='00000000-00000000-00000000'){try{parent=await inheritedExemplar(ex.parent,depth+1);}catch{}}return {...parent,...ex.props};})());
  return exemplarCache.get(tgi);
}
async function loadSavedBuildings(){
  const city=catalog.cities[cityIndex],index=city.subfiles?.a9bd882d;if(index===undefined){notice('This city has no saved building records.');return;}
  const ticket=++savedRequest;clearSavedCity();savedCount=savedMissing=savedNetworkCount=savedTextureCount=savedPropCount=savedFloraCount=savedSceneryMissing=0;setSavedView(true);paused=true;$('#pause').textContent='Run';notice('Reading original saved buildings…');
  try{
    const records=savedBuildings(await resource(`archive=${city.archive}&index=${index}`)),modelsById=new Map(catalog.models.map(m=>[m.tgi,m])),size=(map.n-1)*16,batches=new Map(),groundBatches=new Map(),buildingBounds=new THREE.Box3();
    function queueOriginal(obj){obj.updateMatrixWorld(true);obj.traverse(mesh=>{if(!mesh.isMesh)return;const key=mesh.geometry.uuid+':'+mesh.material.uuid;if(!batches.has(key))batches.set(key,{geometry:mesh.geometry,material:mesh.material,matrices:[]});batches.get(key).matrices.push(mesh.matrixWorld.clone());});}
    function queueGround(pos,uv,material){const key=material.uuid;if(!groundBatches.has(key))groundBatches.set(key,{pos:[],uv:[],indices:[],material});const b=groundBatches.get(key),base=b.pos.length/3;b.pos.push(...pos);b.uv.push(...uv);b.indices.push(base,base+1,base+2,base,base+2,base+3);}
    function resolveModelKey(props,state=0){const key=props['27812821']||props['27812820']||props['27812825'];if(Array.isArray(key))return key;const states=props['27812824'];if(Array.isArray(states)){const options=[];for(let i=0;i+7<states.length;i+=8)if(states[i+7])options.push({state:states[i],key:states.slice(i+5,i+8)});return (options.find(x=>x.state===state)||options[0])?.key;}return null;}
    async function recordObject(b,props){const key=resolveModelKey(props,b.state);if(!key||key.length<3)throw Error('No resolved model key');const base=key[2]>>>0,variant=(base+0x400+(b.orientation%4)*0x10)>>>0,tgi=[key[0],key[1],variant].map(hex).join('-'),entry=modelsById.get(tgi)||modelsById.get(key.slice(0,3).map(hex).join('-'));if(!entry)throw Error('Model variant unavailable');if(!buildingModelCache.has(entry.tgi))buildingModelCache.set(entry.tgi,originalModel(entry));const model=await buildingModelCache.get(entry.tgi),obj=model.object.clone(true);obj.rotation.y=-(b.orientation%4)*Math.PI/2;const bb=new THREE.Box3().setFromObject(obj),center=bb.getCenter(new THREE.Vector3());obj.position.set((b.min[0]+b.max[0])/2-size/2-center.x,b.min[1]-250-bb.min.y,(b.min[2]+b.max[2])/2-size/2-center.z);return obj;}
    for(let i=0;i<records.length;i++){
      if(ticket!==savedRequest)return;const b=records[i];if(!b.visible)continue;
      try{
        const props=await inheritedExemplar(b.tgi),obj=await recordObject(b,props);
        if(ticket!==savedRequest)return;
        buildingBounds.union(new THREE.Box3().setFromObject(obj));queueOriginal(obj);savedCount++;
      }catch{savedMissing++;}
      if(i%20===0){notice(`Original buildings: ${savedCount} rendered / ${records.length} records…`);render();await new Promise(r=>setTimeout(r,0));}
    }
    const materialCache=new Map();
    async function groundMaterial(id,group=0x1abe787d){const key=group+':'+id;if(!materialCache.has(key))materialCache.set(key,(async()=>{const tex=await texture(id,group);if(!tex)return null;return new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide,transparent:true,alphaTest:.1,depthWrite:true,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});})());return materialCache.get(key);}
    const ni=city.subfiles?.c9c05c6e;
    if(ni!==undefined){
      const networks=savedNetworks(await resource(`archive=${city.archive}&index=${ni}`));
      for(let i=0;i<networks.length;i++){if(ticket!==savedRequest)return;const n=networks[i],mat=await groundMaterial(n.texture+4)||await groundMaterial(n.texture);if(!mat)continue;const pos=[],uv=[];
        for(const v of n.vertices){pos.push(v.position[0]-size/2,v.position[1]-250+.1,v.position[2]-size/2);uv.push(...v.uv);}
        queueGround(pos,uv,mat);savedNetworkCount++;if(i%100===0){notice(`Original roads: ${savedNetworkCount}/${networks.length}…`);await new Promise(r=>setTimeout(r,0));}
      }
    }
    const ti=city.subfiles?.c97f987c;
    if(ti!==undefined){
      const tiles=savedLotTextures(await resource(`archive=${city.archive}&index=${ti}`));
      for(let i=0;i<tiles.length;i++){if(ticket!==savedRequest)return;const t=tiles[i],mat=await groundMaterial(t.texture,0x0986135e);if(!mat)continue;
        const x=t.x*16-size/2,z=t.z*16-size/2,pos=[],uv=[];
        const corners=[[0,0],[0,16],[16,16],[16,0]],baseUV=[[0,0],[0,1],[1,1],[1,0]];
        for(let k=0;k<4;k++){const [dx,dz]=corners[k];pos.push(x+dx,elevation(x+dx,z+dz)+.3+t.priority*.0001,z+dz);const u=baseUV[(k+(t.orientation&3))%4];uv.push(t.orientation&4?1-u[0]:u[0],u[1]);}
        queueGround(pos,uv,mat);savedTextureCount++;if(i%200===0){notice(`Original lot tiles: ${savedTextureCount}/${tiles.length}…`);await new Promise(r=>setTimeout(r,0));}
      }
    }
    sceneryFailures={};for(const [type,flora]of [['2977aa47',false],['a9c05c85',true]]){const si=city.subfiles?.[type];if(si===undefined)continue;const scenery=savedScenery(await resource(`archive=${city.archive}&index=${si}`),flora);for(let i=0;i<scenery.length;i++){if(ticket!==savedRequest)return;const b=scenery[i];if(!b.visible)continue;try{const props=await inheritedExemplar(b.tgi),obj=await recordObject(b,props);queueOriginal(obj);if(flora)savedFloraCount++;else savedPropCount++;}catch(e){savedSceneryMissing++;const key=b.tgi+' '+e.message;sceneryFailures[key]=(sceneryFailures[key]||0)+1;}if(i%100===0){notice(`Original scenery: ${savedPropCount} props · ${savedFloraCount} trees…`);await new Promise(r=>setTimeout(r,0));}}}
    for(const b of batches.values()){const mesh=new THREE.InstancedMesh(b.geometry,b.material,b.matrices.length);b.matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.userData.original=true;savedCity.add(mesh);}
    for(const b of groundBatches.values()){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(b.pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(b.uv,2));g.setIndex(b.indices);savedCity.add(new THREE.Mesh(g,b.material));}
    if(savedCount){const center=buildingBounds.getCenter(new THREE.Vector3()),extent=buildingBounds.getSize(new THREE.Vector3()),radius=Math.max(extent.x,extent.z,500);controls.target.copy(center);camera.position.copy(center).add(new THREE.Vector3(radius*.8,radius*.7,radius*.8));controls.update();}
    notice(`${savedCount} buildings · ${savedNetworkCount} roads · ${savedPropCount} props · ${savedFloraCount} trees · ${savedSceneryMissing} unresolved. Partial viewer; original simulation is not running.`);stats();render();
  }catch(e){notice('Saved city load failed: '+e.message);}
}
async function showModel(){const tgi=$('#models').value,entry=catalog.models.find(m=>m.tgi===tgi);if(!entry)return;const ticket=++modelRequest;notice('Decoding original geometry and textures…');try{
  const result=await originalModel(entry);if(ticket!==modelRequest){return;}
  if(modelGroup){assetScene.remove(modelGroup);modelGroup.traverse(x=>x.geometry?.dispose());}modelGroup=result.object;assetScene.add(modelGroup);activeModel=entry;
  const box=new THREE.Box3().setFromObject(modelGroup),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()),scale=Math.max(size.x,size.y,size.z,8);
  camera.position.copy(center).add(new THREE.Vector3(scale*1.4,scale*.9,scale*1.4));controls.target.copy(center);controls.update();
  $('#scene-label').textContent=entry.name;$('#model-info').textContent=`${entry.tgi}\n${result.triangles} triangles · ${result.object.children.length} meshes\nBounds: ${size.toArray().map(x=>x.toFixed(1)).join(' × ')}\nMissing textures: ${result.missing}`;
  notice(result.missing?`Model decoded; ${result.missing} material(s) have no resolved texture.`:'Original model and textures decoded successfully.');stats();render();
}catch(e){notice('Model load failed: '+e.message);}}
function switchMode(next){mode=next;cityScene.visible=next==='city';assetScene.visible=next==='asset';$('#city-panel').hidden=next!=='city';$('#asset-panel').hidden=next!=='asset';$('#city-tab').classList.toggle('active',next==='city');$('#asset-tab').classList.toggle('active',next==='asset');if(next==='asset')showModel();else if(map){const size=(map.n-1)*16;camera.position.set(size*.65,size*.6,size*.65);controls.target.set(0,Math.max(0,elevation(0,0)),0);$('#scene-label').textContent=catalog.cities[cityIndex].name.replace('.sc4','')+' · original terrain';notice('Select a tool to build.');}stats();}
function filterModels(){const q=$('#search').value.toLowerCase(),ms=catalog.models.filter(m=>(m.name+' '+m.tgi).toLowerCase().includes(q)).slice(0,600);$('#models').replaceChildren(...ms.map(m=>new Option(m.name,m.tgi)));$('#models').selectedIndex=ms.length?0:-1;}
function pick(event){if(mode!=='city'||!ground)return null;const r=canvas.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObject(ground)[0];if(!hit)return null;return {x:Math.floor(hit.point.x/16),z:Math.floor(hit.point.z/16)};}
let drawing=false,lastPaint='';canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;drawing=true;canvas.setPointerCapture(e.pointerId);const p=pick(e);if(p){place(p.x,p.z);lastPaint=p.x+','+p.z;}});canvas.addEventListener('pointermove',e=>{hover=pick(e);if(drawing&&hover){const key=hover.x+','+hover.z;if(key!==lastPaint){place(hover.x,hover.z);lastPaint=key;}}});canvas.addEventListener('pointerup',()=>drawing=false);canvas.addEventListener('pointercancel',()=>drawing=false);canvas.addEventListener('contextmenu',e=>e.preventDefault());
$('#tools').addEventListener('click',e=>{const b=e.target.closest('[data-tool]');if(!b)return;setSavedView(false);tool=b.dataset.tool;document.querySelectorAll('[data-tool]').forEach(x=>x.classList.toggle('active',x===b));notice(`Sandbox selected: ${tool}. Click or drag on terrain.`);});
$('#city-tab').onclick=()=>switchMode('city');$('#asset-tab').onclick=()=>switchMode('asset');$('#load-terrain').onclick=()=>loadTerrain(Number($('#terrain-select').value));$('#load-model').onclick=showModel;$('#models').ondblclick=showModel;$('#search').oninput=filterModels;
$('#pause').onclick=()=>{paused=!paused;$('#pause').textContent=paused?'Run':'Pause';};$('#step').onclick=simulate;$('#reset').onclick=()=>{clearLots();notice('Sandbox cleared.');};
$('#saved-buildings').onclick=loadSavedBuildings;
$('#back-sandbox').onclick=()=>{setSavedView(false);notice('Returned to the experimental sandbox.');};
$('#demo').onclick=()=>{
  if(!map)return;let center=null;const lim=(map.n-1)/2;
  for(let z=-lim+12;z<lim-12&&!center;z+=8)for(let x=-lim+12;x<lim-12;x+=8){const hs=[];for(const [dx,dz]of [[-10,-8],[10,8],[-10,8],[10,-8],[0,0]])hs.push(elevation((x+dx)*16,(z+dz)*16));if(Math.min(...hs)>3&&Math.max(...hs)-Math.min(...hs)<15){center={x,z};break;}}
  if(!center){notice('No flat dry area found for the demo district on this terrain.');return;}
  setSavedView(false);clearLots();const {x,z}=center;for(let dx=-10;dx<=10;dx++){place(x+dx,z,'road');place(x+dx,z-5,'road');place(x+dx,z+5,'road');}for(let dz=-7;dz<=7;dz++)place(x,z+dz,'road');
  place(x+8,z+3,'power');for(let dz=-7;dz<=7;dz++)for(let dx=-9;dx<=9;dx++){if(dx===0||[0,-5,5].includes(dz)||Math.abs(dx)>7)continue;place(x+dx,z+dz,dx<0?'residential':dz<0?'commercial':'industrial');}
  place(x+8,z-3,'park');simulate();simulate();simulate();controls.target.set((x+.5)*16,elevation(x*16,z*16),(z+.5)*16);camera.position.copy(controls.target).add(new THREE.Vector3(400,380,400));controls.update();notice('Generated demo district on original terrain. These buildings and simulation rules are experimental.');
};
$('#save').onclick=()=>{localStorage.setItem('sc4-web-sandbox-v1',JSON.stringify({version:1,city:catalog.cities[cityIndex].name,month,balance,cells:[...cells.values()].map(({object,...c})=>c)}));notice('Sandbox saved in this browser.');};
$('#restore').onclick=async()=>{try{const d=JSON.parse(localStorage.getItem('sc4-web-sandbox-v1'));if(!d||d.version!==1||!Array.isArray(d.cells)||d.cells.length>100000)throw Error('No valid saved sandbox');const i=catalog.cities.findIndex(c=>c.name===d.city);if(i<0)throw Error('Saved terrain unavailable');await loadTerrain(i);$('#terrain-select').value=i;for(const c of d.cells){if(!Number.isInteger(c.x)||!Number.isInteger(c.z)||!Object.hasOwn(costs,c.kind)||c.kind==='bulldoze')continue;if(place(c.x,c.z,c.kind,true)){const restored=cells.get(c.x+','+c.z);restored.level=Math.max(0,Math.min(3,Number(c.level)||0));refreshCell(restored);}}month=Math.max(0,Number(d.month)||0);balance=Number.isFinite(d.balance)?d.balance:100000;recount();stats();notice('Sandbox restored.');}catch(e){notice(e.message);}};
function recount(){population=jobs=0;for(const c of cells.values()){if(c.kind==='residential')population+=c.level*8;else if(c.kind==='industrial'||c.kind==='commercial')jobs+=c.level*(c.kind==='industrial'?12:8);}}
document.addEventListener('keydown',e=>{if(!ready||['INPUT','SELECT'].includes(e.target.tagName))return;if(e.key===' '){e.preventDefault();$('#pause').click();}if(e.key.toLowerCase()==='f'){if(document.fullscreenElement)document.exitFullscreen();else $('#viewport').requestFullscreen();}});
window.advanceTime=ms=>{if(!paused&&mode==='city'&&!savedView){clock+=ms;while(clock>=2500){simulate();clock-=2500;}}render();};
window.render_game_to_text=()=>JSON.stringify({mode,renderer:'WebGL',originalTerrain:catalog?.cities[cityIndex]?.name,tiles:map?map.n-1:0,tool,paused,month,balance,population,jobs,net,cells:[...cells.values()].map(({object,...c})=>c),savedView,savedBuildings:savedCount,unresolvedBuildings:savedMissing,savedNetworkTiles:savedNetworkCount,savedLotTiles:savedTextureCount,savedProps:savedPropCount,savedFlora:savedFloraCount,unresolvedScenery:savedSceneryMissing,drawCalls:renderer.info.render.calls,activeModel:activeModel?.tgi,coordinateSystem:'Terrain x east, z south; 16 metres/tile; sea level 250m',hover,loading:loading||!ready});
// Deterministic hooks for verifying placement and growth on real terrain.
window.sc4={place,simulate,elevation,getState:()=>JSON.parse(window.render_game_to_text()),switchMode,showModel,loadSavedBuildings,sceneryFailures:()=>sceneryFailures};
let last=performance.now();function loop(now){const dt=Math.min(100,now-last);last=now;window.advanceTime(dt);requestAnimationFrame(loop);}requestAnimationFrame(loop);
async function initialize(next){
  document.body.classList.add('loading');
  catalog=next;if(!catalog.cities.length)throw Error('No .sc4 terrain files found. Include the Regions folder.');
  $('#import-screen').hidden=true;
  $('#engine').textContent=`${catalog.archives.length} archives · ${catalog.models.length.toLocaleString()} models · WebGL`;
  const populated=document.createElement('optgroup'),empty=document.createElement('optgroup');populated.label='Populated cities · original geometry available';empty.label='Other original terrain';catalog.cities.forEach((c,i)=>(c.subfiles?.a9bd882d?populated:empty).append(new Option(c.name.replace('City - ',''),i)));$('#terrain-select').replaceChildren(populated,empty);
  filterModels();let initial=catalog.cities.findIndex(c=>c.name==='London/City - Fulham.sc4');if(initial<0)initial=catalog.cities.findIndex(c=>c.subfiles?.a9bd882d);if(initial<0)initial=0;$('#terrain-select').value=initial;await loadTerrain(initial);if(catalog.cities[initial].subfiles?.a9bd882d)await loadSavedBuildings();ready=true;document.body.classList.remove('loading');
}
$('#game-files').onchange=async e=>{try{const next=await importFiles(e.target.files,s=>{$('#import-status').textContent=s;});await initialize(next);}catch(e){$('#import-status').textContent=e.message;}};
try{const local=await openLocal();if(local)await initialize(local);else{$('#import-screen').hidden=false;$('#engine').textContent='v0.3.0 · Select your game folder';notice('Select your installed game folder to begin.');}}catch(e){$('#import-screen').hidden=false;$('#import-status').textContent=e.message;}
