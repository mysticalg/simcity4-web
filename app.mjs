import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {decompress,terrain,s3d,fsh,hex,exemplar,savedBuildings,savedNetworks,savedLotTextures,savedScenery} from './dbpf.mjs?v=0.7.1';
import {openLocal,openBundledSource,importFiles,getResource,getTexture} from './data-source.mjs?v=0.7.1';
import {createRegionSelection} from './regions.mjs?v=0.7.1';
import {growableForLevel} from './game-data.mjs?v=0.7.1';
import {solvePower,responseCurve} from './power.mjs?v=0.7.1';
import {solveWater} from './water.mjs?v=0.7.1';
import {readSavedLots,ImportedCity} from './city-state.mjs?v=0.7.1';
const $=s=>document.querySelector(s),canvas=$('#game');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x8daeb9);renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(42,1,1,30000),controls=new OrbitControls(camera,canvas);scene.background=new THREE.Color(0x8daeb9);
controls.mouseButtons={LEFT:null,MIDDLE:THREE.MOUSE.PAN,RIGHT:THREE.MOUSE.ROTATE};controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.49;controls.minDistance=20;controls.maxDistance=12000;
const skyLight=new THREE.HemisphereLight(0xe5f5ff,0x647448,2.3);scene.add(skyLight);const sun=new THREE.DirectionalLight(0xfff2d4,2.4);sun.position.set(-700,1500,400);scene.add(sun);
// Native FSH yyyy8xxx overlays contain only illuminated windows and fixtures.
const nightAmount={value:0};let nightMode='day',nightMaterials=0;
function setNightMode(value){nightMode=value==='night'?'night':'day';nightAmount.value=nightMode==='night'?1:0;const night=nightAmount.value;scene.background.set(night?0x101d32:0x8daeb9);skyLight.intensity=night?.32:2.3;sun.intensity=night?.18:2.4;sun.color.set(night?0x849ccb:0xfff2d4);$('#time-of-day').value=nightMode;localStorage.setItem('sc4-lighting',nightMode);render();}
function nativeLighting(material,nightMap=null){
 material.onBeforeCompile=shader=>{shader.uniforms.sc4Night=nightAmount;if(nightMap)shader.uniforms.sc4WindowMap={value:nightMap};
 shader.fragmentShader='uniform float sc4Night;\n'+(nightMap?'uniform sampler2D sc4WindowMap;\n':'')+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 diffuseColor.rgb *= mix(vec3(1.0),vec3(0.23,0.28,0.43),sc4Night);
 ${nightMap?'vec4 windowLight=texture2D(sc4WindowMap,vMapUv); diffuseColor.rgb=mix(diffuseColor.rgb,windowLight.rgb*1.15,windowLight.a*sc4Night);':''}`);
 };material.customProgramCacheKey=()=>nightMap?'sc4-native-windows-v1':'sc4-native-night-v1';if(nightMap)nightMaterials++;return material;
}
$('#time-of-day').onchange=e=>setNightMode(e.target.value);
const cityScene=new THREE.Group(),lots=new THREE.Group(),savedCity=new THREE.Group();scene.add(cityScene);cityScene.add(lots,savedCity);
let savedCount=0,savedMissing=0,savedRequest=0,savedNetworkCount=0,savedTextureCount=0,savedPropCount=0,savedFloraCount=0,savedSceneryMissing=0,savedView=false;
let sceneryFailures={},regionSelection=null,originalPopulation=0,originalJobs=0,initialFunds=100000,selectedFacility='',powerFunding=100,powerGrid=solvePower([]);
const pipes=new Map(),waterLayer=new THREE.Group();scene.add(waterLayer);let waterView=false,waterGrid=solveWater([],[],[]),waterFunding=100,selectedWaterFacility='';
let importedCity=null;const importedVisuals=new Map(),zeroInstance=new THREE.Matrix4().makeScale(0,0,0);
let appliedImportedEdits=new Set(),originalSelection=null;
const templateCache=new Map(),templateTasks=new Map();let modelsByTgi=new Map();
function setSavedView(value){if(savedView&&!value)savedRequest++;savedView=value;savedCity.visible=true;lots.visible=true;$('#back-sandbox').hidden=!value;stats();}
function clearSavedCity(){for(const child of savedCity.children){if(child.userData.original){child.dispose?.();continue;}child.geometry?.dispose();child.material?.dispose();}savedCity.clear();}
let catalog,ground,water,map,cityIndex=0,mode='city',tool='inspect',hover=null,month=0,balance=100000,population=0,jobs=0,net=0,paused=true,clock=0,loading=false,ready=false,modelRequest=0,activeModel=null,modelGroup=null;
const cells=new Map(),ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),costs={road:10,residential:20,commercial:25,industrial:30,power:500,powerline:17,water:150,pipe:5,erasepipe:1,park:40,bulldoze:5};
function notice(s){$('#notice').textContent=s;}
function stats(){const stats=[['Treasury','§ '+Math.round(balance).toLocaleString()],['Residents',population.toLocaleString()],['Jobs',jobs.toLocaleString()],['Month',month],['Power',`${Math.round(powerGrid.demand)} / ${Math.round(powerGrid.supply)}`],['Water',`${Math.round(waterGrid.demand)} / ${Math.round(waterGrid.supply)}`],['Monthly net',`${net>=0?'+':''}${Math.round(net)}`]];$('#stats').replaceChildren(...stats.map(([k,v])=>{const e=document.createElement('div');e.className='stat';e.innerHTML=`${k}<b></b>`;e.lastElementChild.textContent=v;return e;}));}
function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;if(canvas.width!==Math.round(w*renderer.getPixelRatio())||canvas.height!==Math.round(h*renderer.getPixelRatio())){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}}
function render(){if($('#city-screen').hidden)return;resize();controls.update();savedCity.visible=lots.visible=!waterView;waterLayer.visible=waterView;renderer.render(scene,camera);}
function dispose(object){if(object.userData.shared)return;if(object.isInstancedMesh)object.dispose();object.geometry?.dispose();if(object.material)for(const m of Array.isArray(object.material)?object.material:[object.material])m.dispose();for(const child of object.children)dispose(child);}
const resource=getResource;
function elevation(x,z){if(!map)return 0;const nx=Math.max(0,Math.min(map.n-1,x/16+(map.n-1)/2)),nz=Math.max(0,Math.min(map.n-1,z/16+(map.n-1)/2)),ix=Math.min(map.n-2,Math.floor(nx)),iz=Math.min(map.n-2,Math.floor(nz)),fx=nx-ix,fz=nz-iz,a=map.heights;return (a[iz*map.n+ix]*(1-fx)+a[iz*map.n+ix+1]*fx)*(1-fz)+(a[(iz+1)*map.n+ix]*(1-fx)+a[(iz+1)*map.n+ix+1]*fx)*fz-250;}
function clearLots(){for(const c of cells.values()){lots.remove(c.object);dispose(c.object);}cells.clear();pipes.clear();waterGrid=solveWater([],[],[]);rebuildWaterView();month=0;clock=0;balance=initialFunds;powerGrid=solvePower([]);population=originalPopulation;jobs=originalJobs;net=0;paused=true;$('#pause').textContent='Run';stats();}
async function loadTerrain(index){
  if(loading)return;loading=true;try{
    const c=catalog.cities[index],next=terrain(await resource(`archive=${c.archive}&index=${c.index}`));
    map=next;cityIndex=index;powerFunding=waterFunding=100;$('#power-funding').value=$('#water-funding').value=100;$('#funding-value').textContent=$('#water-funding-value').textContent='100%';importedCity=null;importedVisuals.clear();appliedImportedEdits=new Set();originalPopulation=c.region?.residents||0;originalJobs=(c.region?.commercialJobs||0)+(c.region?.industrialJobs||0);clearLots();savedRequest++;savedCount=savedMissing=savedNetworkCount=savedTextureCount=savedPropCount=savedFloraCount=savedSceneryMissing=0;clearSavedCity();setSavedView(false);$('#saved-buildings').disabled=!c.subfiles?.a9bd882d;if(ground){cityScene.remove(ground,water);dispose(ground);dispose(water);}
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
    $('#scene-label').textContent=c.name.replace('City - ','').replace('.sc4','').replace('/', ' · ');
    notice(`${n-1} × ${n-1} original tiles loaded. Select a tool and build on dry land.`);stats();
  }catch(e){notice('Terrain load failed: '+e.message);}finally{loading=false;}
}
function cube(group,x,y,z,w,h,d,color){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshLambertMaterial({color}));mesh.position.set(x,y+h/2,z);group.add(mesh);return mesh;}
function blueprint(c){return c.kind==='water'?catalog?.game?.waterFacilities.find(b=>b.tgi===(c.blueprint||selectedWaterFacility)):c.kind==='power'?catalog?.game?.facilities.find(b=>b.tgi===(c.blueprint||selectedFacility)):c.level?growableForLevel(catalog?.game,c.kind,c.level):null;}
function key(c){return c.x+','+c.z;}
function cellAt(x,z){return cells.get(x+','+z)||[...cells.values()].find(c=>x>=c.x&&z>=c.z&&x<c.x+(c.width||1)&&z<c.z+(c.depth||1));}
async function loadTemplate(bp){
 if(templateCache.has(bp.tgi))return templateCache.get(bp.tgi);
 if(!templateTasks.has(bp.tgi))templateTasks.set(bp.tgi,(async()=>{const tgi=[bp.model[0],bp.model[1],(bp.model[2]+0x400)>>>0].map(hex).join('-'),entry=modelsByTgi.get(tgi)||modelsByTgi.get(bp.model.slice(0,3).map(hex).join('-'));if(!entry)throw Error('Building model missing');const result=await originalModel(entry);templateCache.set(bp.tgi,result.object);return result.object;})());
 return templateTasks.get(bp.tgi);
}
function visual(c){
 const w=c.width||1,d=c.depth||1,o=new THREE.Group(),h=elevation((c.x+w/2)*16,(c.z+d/2)*16);o.position.set((c.x+w/2)*16,h+.45,(c.z+d/2)*16);o.userData.cellKey=key(c);
 const colors={road:0x404c50,residential:0x4eae6c,commercial:0x4c91ba,industrial:0xb9a34b,power:0x6c7b75,water:0x5e90ac,powerline:0x416842,park:0x397b40};cube(o,0,0,0,w*16-.3,.4,d*16-.3,colors[c.kind]);
 if(c.kind==='road'){cube(o,0,.25,0,.45,.1,10,0xe5d8a4);cube(o,-7,.25,0,1.2,.3,15,0xa9aaa2);cube(o,7,.25,0,1.2,.3,15,0xa9aaa2);}
 if(c.kind==='powerline'){cube(o,0,0,0,.8,12,.8,0xb4ada1);cube(o,0,10,0,6,.6,.6,0x858c91);cube(o,0,11,0,.16,.16,16,0x343d3d);cube(o,0,11,0,16,.16,.16,0x343d3d);}
 if(c.kind==='park'){for(const [x,z]of [[-4,-4],[4,3],[-3,4]]){cube(o,x,0,z,1,4,1,0x756446);const tree=new THREE.Mesh(new THREE.ConeGeometry(3,8,7),new THREE.MeshLambertMaterial({color:0x2f7040}));tree.position.set(x,6,z);o.add(tree);}}
 const bp=blueprint(c);if(bp){const template=templateCache.get(bp.tgi);if(template){const mesh=template.clone(true),bb=new THREE.Box3().setFromObject(mesh),center=bb.getCenter(new THREE.Vector3());mesh.position.set(-center.x,.4-bb.min.y,-center.z);mesh.userData.shared=true;o.add(mesh);}else loadTemplate(bp).then(()=>{if(cells.get(key(c))===c)refreshCell(c);}).catch(()=>{c.modelMissing=true;});}
 if(c.level&&['residential','commercial','industrial'].includes(c.kind)){const marker=cube(o,0,(bp?.size[1]||10)+2,0,2,3,2,0xffd36b);marker.name='power-warning';marker.visible=!powerGrid.states.get(key(c))?.powered;}
 return o;
}
function refreshCell(c){if(c.object){lots.remove(c.object);dispose(c.object);}c.object=visual(c);lots.add(c.object);}
function focusCity(){const group=lots.children.length?lots:savedCity;if(!group.children.length)return;const box=new THREE.Box3().setFromObject(group),center=box.getCenter(new THREE.Vector3()),extent=box.getSize(new THREE.Vector3()),size=Math.max(extent.x,extent.z,200);controls.target.copy(center);camera.position.copy(center).add(new THREE.Vector3(size*.8,size*.7,size*.8));controls.update();}
function updatePower(){
 const objects=[...cells.values()].map(c=>{const bp=blueprint(c);return {id:key(c),x:c.x,z:c.z,width:c.width||1,depth:c.depth||1,line:c.kind==='powerline',conducts:c.kind!=='road',generation:c.kind==='power'?(bp?.powerGenerated||0)*responseCurve(catalog?.game?.powerFundingCurve,powerFunding)/100:0,consumption:bp?.powerConsumed||0};});
 powerGrid=solvePower(objects,{radius:catalog?.game?.powerRadiationRadius??2});for(const c of cells.values()){const marker=c.object?.getObjectByName('power-warning');if(marker)marker.visible=!powerGrid.states.get(key(c))?.powered;}updateWater();
}
function updateWater(){
 const sources=[],consumers=[];for(const c of cells.values()){const bp=blueprint(c),n={id:key(c),x:c.x,z:c.z,width:c.width,depth:c.depth};if(c.kind==='water')sources.push({...n,generation:powerGrid.states.get(key(c))?.powered?(bp?.waterProduced||0)*responseCurve(catalog.game.waterFundingCurve,waterFunding)/100:0});else if(bp?.waterConsumed)consumers.push({...n,consumption:bp.waterConsumed});}
 waterGrid=solveWater([...pipes.values()],sources,consumers,{radius:catalog?.game?.waterPipeRadius??7});if(waterView)rebuildWaterView();
}
function setWaterView(value){waterView=!!value;if(!waterView&&['pipe','erasepipe'].includes(tool)){tool='inspect';document.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===tool));}$('#water-view').textContent=waterView?'Return to surface':'View water network';$('#water-view').classList.toggle('active',waterView);if(waterView){rebuildWaterView();notice('Water network · Blue terrain has water · Cyan pipes have supply · Gray pipes are disconnected · Red sources are inactive.');}render();}
function rebuildWaterView(){
 for(const o of [...waterLayer.children]){waterLayer.remove(o);dispose(o);}if(!map||!waterView)return;
 const positions=[],lim=(map.n-1)/2,ratio=new Map(waterGrid.circuits.map(c=>[c.id,c.ratio]));for(const[k,ids]of waterGrid.coverage){if(![...ids].some(id=>ratio.get(id)>=1))continue;const[x,z]=k.split(',').map(Number);if(x< -lim||z< -lim||x>=lim||z>=lim)continue;const corners=[[x,z],[x,z+1],[x+1,z+1],[x+1,z]];for(const i of[0,1,2,0,2,3]){const[a,b]=corners[i];positions.push(a*16,elevation(a*16,b*16)+1,b*16);}}
 if(positions.length){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:0x399ede,transparent:true,opacity:.42,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));waterLayer.add(m);}
 const hubs=[],tubes=[],sourceTiles=new Set();for(const c of cells.values())if(c.kind==='water')for(let z=c.z;z<c.z+c.depth;z++)for(let x=c.x;x<c.x+c.width;x++)sourceTiles.add(x+','+z);
 for(const p of pipes.values()){const color=waterGrid.pipeStates.get(p.id)?.active?0x6de8ff:0x939ba0,y=elevation((p.x+.5)*16,(p.z+.5)*16)+3;hubs.push({x:(p.x+.5)*16,y,z:(p.z+.5)*16,color});for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]])if(pipes.has((p.x+dx)+','+(p.z+dz))||sourceTiles.has((p.x+dx)+','+(p.z+dz)))tubes.push({x:(p.x+.5)*16+dx*4,y,z:(p.z+.5)*16+dz*4,dx,dz,color});}
 function instances(geometry,items){if(!items.length){geometry.dispose();return;}const mesh=new THREE.InstancedMesh(geometry,new THREE.MeshBasicMaterial(),items.length),temp=new THREE.Object3D();items.forEach((p,i)=>{temp.position.set(p.x,p.y,p.z);temp.rotation.set(p.dz?Math.PI/2:0,0,p.dx?Math.PI/2:0);temp.updateMatrix();mesh.setMatrixAt(i,temp.matrix);mesh.setColorAt(i,new THREE.Color(p.color));});mesh.computeBoundingSphere();waterLayer.add(mesh);}
 instances(new THREE.SphereGeometry(1.3,6,4),hubs);instances(new THREE.CylinderGeometry(.75,.75,8,6),tubes);
 for(const c of cells.values())if(c.kind==='water'){const active=powerGrid.states.get(key(c))?.powered&&waterFunding>0,o=new THREE.Mesh(new THREE.CylinderGeometry(4,4,5,12),new THREE.MeshBasicMaterial({color:active?0x6de8ff:0xdb806f}));o.position.set((c.x+.5)*16,elevation((c.x+.5)*16,(c.z+.5)*16)+5,(c.z+.5)*16);waterLayer.add(o);}
}
function placePipe(x,z,kind,free=false){const lim=(map.n-1)/2;if(x< -lim||x>=lim||z< -lim||z>=lim)return false;const id=x+','+z,exists=pipes.has(id);if(kind==='inspect'){const st=waterGrid.pipeStates.get(id);notice(exists?`Water pipe · ${st?.active?'Connected to supply':'No active supply'}`:`Tile (${x}, ${z}) · ${[...(waterGrid.coverage.get(id)||[])].some(i=>waterGrid.circuits.find(c=>c.id===i)?.ratio>=1)?'Water supplied':'No water supply'}`);return false;}if((kind==='pipe'&&exists)||(kind==='erasepipe'&&!exists))return false;const price=kind==='pipe'?catalog.game.waterPipeCost:catalog.game.waterPipeBulldozeCost;if(!free&&balance<price){notice('Insufficient funds.');return false;}if(kind==='pipe')pipes.set(id,{id,x,z});else pipes.delete(id);if(!free)balance-=price;updateWater();stats();notice(kind==='pipe'?'Pipe placed beneath the surface.':'Pipe removed; surface structures preserved.');return true;}
function powered(x,z){const c=cellAt(x,z);return !!c&&!!powerGrid.states.get(key(c))?.powered;}
function roadside(x,z){return [[0,-1],[1,0],[0,1],[-1,0]].some(([dx,dz])=>cellAt(x+dx,z+dz)?.kind==='road'||importedCity?.roadAt(x+dx,z+dz));}
function registerImportedVisual(owner,handle){if(!owner)return;if(!importedVisuals.has(owner))importedVisuals.set(owner,[]);importedVisuals.get(owner).push(handle);}
function applyImportedEdits(){
 const deleted=importedCity?.deleted||new Set(),changed=new Set([...deleted].filter(id=>!appliedImportedEdits.has(id)).concat([...appliedImportedEdits].filter(id=>!deleted.has(id))));
 for(const id of changed)for(const h of importedVisuals.get(id)||[]){const hidden=deleted.has(id);if(h.kind==='instance'){h.mesh.setMatrixAt(h.index,hidden?zeroInstance:h.matrix);h.mesh.instanceMatrix.needsUpdate=true;}else{h.geometry.index.array.set(hidden?Array(6).fill(h.indices[0]):h.indices,h.start);h.geometry.index.needsUpdate=true;}}
 appliedImportedEdits=new Set(deleted);
}
function syncImportedTotals(){if(importedCity){const totals=importedCity.totals();originalPopulation=totals.residents;originalJobs=totals.jobs;}}
function queryImported(x,z){
 if(!importedCity)return false;const lot=importedCity.lotAt(x,z),network=importedCity.networkAt(x,z),scenery=importedCity.sceneryAt(x,z);
 if(lot){originalSelection={id:lot.id,kind:"lot",x,z};const labels=['Unzoned','Low-density residential','Medium-density residential','High-density residential','Low-density commercial','Medium-density commercial','High-density commercial','Agriculture','Medium-density industry','High-density industry','Military','Airport','Seaport','Spaceport','Landfill','Civic building'];notice(`${labels[lot.zoneType]||'Building'} · ${lot.occupants.residential} resident spaces · ${lot.occupants.commercial+lot.occupants.industrial} job spaces · ${lot.powered?'Powered':'No power'} · ${lot.watered?'Water supplied':'No water'}${lot.historical?' · Historical':''}`);return true;}
 if(network){originalSelection={id:network.id,kind:"network",x,z};notice(`${network.road?'Road':'Transport network'} · Connected to the saved city · Demolition §${importedCity.demolitionCost(network.id)}`);return true;}
 if(scenery.length){originalSelection={id:scenery[0].id,kind:"scenery",x,z};notice(`${scenery[0].flora?'Trees':'Prop'} · ${scenery.length} object(s) on this tile`);return true;}return false;
}
function demolishImported(x,z,free=false){
 if(!importedCity)return false;const lot=importedCity.lotAt(x,z),network=importedCity.networkAt(x,z),targets=lot?[lot.id]:network?[network.id]:importedCity.sceneryAt(x,z).map(s=>s.id);if(!targets.length)return false;
 const price=targets.reduce((sum,id)=>sum+importedCity.demolitionCost(id),0);if(!free&&balance<price){notice('Insufficient funds.');return false;}
 targets.forEach(id=>importedCity.demolish(id));if(!free)balance-=price;applyImportedEdits();syncImportedTotals();recount();stats();persistCity();notice(`Demolished ${lot?'lot':network?'transport tile':'trees/props'} · §${price}`);return true;
}
function place(x,z,kind=tool,free=false,facilityId=selectedFacility){
 if(!map||loading||savedView)return false;if(['pipe','erasepipe'].includes(kind)||(waterView&&kind==='inspect'))return placePipe(x,z,kind,free);const lim=(map.n-1)/2,old=cellAt(x,z),bp=kind==='power'?catalog?.game?.facilities.find(b=>b.tgi===facilityId):kind==='water'?catalog?.game?.waterFacilities.find(b=>b.tgi===(facilityId===selectedFacility?selectedWaterFacility:facilityId)):null,w=bp?.footprint[0]||1,d=bp?.footprint[1]||1;
 if(x< -lim||z< -lim||x+w>lim||z+d>lim)return false;
 if(kind==='inspect'&&!old&&queryImported(x,z))return false;
 if(kind==='bulldoze'&&!old&&demolishImported(x,z,free))return true;
 if(kind==='inspect'){const c=old,b=c?blueprint(c):null,state=c?powerGrid.states.get(key(c)):null;notice(c?`${b?.label||c.kind} · ${state?.powered?'Powered':state?.brownout?'Brownout':'No power'} · ${waterGrid.states.get(key(c))?.watered?'Water supplied':b?.waterConsumed?'No water supply':'No water demand'} · Demand ${b?.powerConsumed||0} · Stage ${c.level||0}`:`Tile (${x}, ${z}) · ${Math.round(elevation(x*16+8,z*16+8)+250)} m`);return false;}
 if(old?.kind===kind&&kind!=='bulldoze')return false;
 for(let dz=0;dz<d;dz++)for(let dx=0;dx<w;dx++){if(kind!=='bulldoze'&&elevation((x+dx+.5)*16,(z+dz+.5)*16)<1){notice('Build on dry land.');return false;}if(kind!=='bulldoze'&&(importedCity?.lotAt(x+dx,z+dz)||importedCity?.networkAt(x+dx,z+dz))){notice('This land is occupied. Bulldoze it first.');return false;}const occupied=cellAt(x+dx,z+dz);if(occupied&&occupied!==old){notice('That footprint is occupied. Bulldoze it first.');return false;}}
 if(old&&kind!=='bulldoze'&&((old.width||1)>1||(old.depth||1)>1||w>1||d>1)){notice('Bulldoze the existing structure first.');return false;}
 if(kind==='bulldoze'&&!old)return false;const price=['power','water'].includes(kind)?(bp?.plopCost||costs.power):kind==='bulldoze'?(blueprint(old)?.bulldozeCost||5):costs[kind];if(!free&&balance<price){notice('Insufficient funds.');return false;}
 if(old){lots.remove(old.object);dispose(old.object);cells.delete(key(old));}
 if(kind!=='bulldoze'){importedCity?.clearScenery(x,z,w,d);applyImportedEdits();const c={x,z,kind,level:0,width:w,depth:d};if(bp)c.blueprint=bp.tgi;cells.set(key(c),c);refreshCell(c);}if(!free)balance-=price;updatePower();stats();return true;
}
function recount(){population=originalPopulation;jobs=originalJobs;for(const c of cells.values()){const b=blueprint(c);population+=b?.capacity.residential||0;jobs+=(b?.capacity.commercial||0)+(b?.capacity.industrial||0);}}
function simulate(){
 month++;updatePower();for(const c of cells.values())if(['residential','commercial','industrial'].includes(c.kind)&&powered(c.x,c.z)&&roadside(c.x,c.z)&&c.level<3){c.level++;refreshCell(c);}updatePower();recount();
 let upkeep=0;for(const c of cells.values()){if(c.kind==='road')upkeep+=catalog?.game?.roadMonthlyCost||0;else if(c.kind==='power')upkeep+=(blueprint(c)?.monthlyCost||0)*powerFunding/100;else if(c.kind==='water')upkeep+=(blueprint(c)?.monthlyCost||0)*waterFunding/100;else if(c.kind==='park')upkeep+=1;}
 upkeep+=pipes.size*(catalog.game.waterPipeMonthlyCost||0);
 const newResidents=population-originalPopulation,newJobs=jobs-originalJobs;net=Math.round(Math.min(newResidents,newJobs)*.7+newResidents*.3-upkeep);balance+=net;
 notice(`Month ${month} · Power demand ${Math.round(powerGrid.demand)} / supply ${Math.round(powerGrid.supply)} · ${powerGrid.brownoutCount?'Power shortage. Add generation.':'Connect zones and plants with power lines.'}`);stats();persistCity();
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
    const textureId=mat?.textures[0],nightId=(textureId|0x8000)>>>0,nightMap=tex&&textureId!==undefined&&nightId!==textureId?await texture(nightId,entry.group):null;
    const material=nativeLighting(new THREE.MeshBasicMaterial({map:tex,color:tex?0xffffff:0xb8c7ca,side:THREE.DoubleSide,transparent:true,alphaTest:.12}),nightMap);
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
  const city=catalog.cities[cityIndex],index=city.subfiles?.a9bd882d;
  const ticket=++savedRequest;clearSavedCity();savedCount=savedMissing=savedNetworkCount=savedTextureCount=savedPropCount=savedFloraCount=savedSceneryMissing=0;setSavedView(true);paused=true;$('#pause').textContent='Run';notice('Reading original saved buildings…');
  try{
    const records=index===undefined?[]:savedBuildings(await resource(`archive=${city.archive}&index=${index}`)),modelsById=new Map(catalog.models.map(m=>[m.tgi,m])),size=(map.n-1)*16,batches=new Map(),groundBatches=new Map(),buildingBounds=new THREE.Box3();
    const lotIndex=city.subfiles?.c9bd5d4a,networkIndex=city.subfiles?.c9c05c6e,nativeLots=lotIndex===undefined?[]:readSavedLots(await resource(`archive=${city.archive}&index=${lotIndex}`)),nativeNetworks=networkIndex===undefined?[]:savedNetworks(await resource(`archive=${city.archive}&index=${networkIndex}`));
    importedCity=new ImportedCity({lots:nativeLots,networks:nativeNetworks,tiles:map.n-1,profile:city.region});importedVisuals.clear();appliedImportedEdits=new Set();
    function queueOriginal(obj,owner){obj.updateMatrixWorld(true);obj.traverse(mesh=>{if(!mesh.isMesh)return;const key=mesh.geometry.uuid+':'+mesh.material.uuid;if(!batches.has(key))batches.set(key,{geometry:mesh.geometry,material:mesh.material,matrices:[]});batches.get(key).matrices.push({matrix:mesh.matrixWorld.clone(),owner});});}
    function queueGround(pos,uv,material,owner){const key=material.uuid;if(!groundBatches.has(key))groundBatches.set(key,{pos:[],uv:[],indices:[],spans:[],material});const b=groundBatches.get(key),base=b.pos.length/3,indices=[base,base+1,base+2,base,base+2,base+3];b.spans.push({owner,start:b.indices.length,indices});b.pos.push(...pos);b.uv.push(...uv);b.indices.push(...indices);}
    function resolveModelKey(props,state=0){const key=props['27812821']||props['27812820']||props['27812825'];if(Array.isArray(key))return key;const states=props['27812824'];if(Array.isArray(states)){const options=[];for(let i=0;i+7<states.length;i+=8)if(states[i+7])options.push({state:states[i],key:states.slice(i+5,i+8)});return (options.find(x=>x.state===state)||options[0])?.key;}return null;}
    async function recordObject(b,props){const key=resolveModelKey(props,b.state);if(!key||key.length<3)throw Error('No resolved model key');const base=key[2]>>>0,variant=(base+0x400+(b.orientation%4)*0x10)>>>0,tgi=[key[0],key[1],variant].map(hex).join('-'),entry=modelsById.get(tgi)||modelsById.get(key.slice(0,3).map(hex).join('-'));if(!entry)throw Error('Model variant unavailable');if(!buildingModelCache.has(entry.tgi))buildingModelCache.set(entry.tgi,originalModel(entry));const model=await buildingModelCache.get(entry.tgi),obj=model.object.clone(true);obj.rotation.y=-(b.orientation%4)*Math.PI/2;const bb=new THREE.Box3().setFromObject(obj),center=bb.getCenter(new THREE.Vector3());obj.position.set((b.min[0]+b.max[0])/2-size/2-center.x,b.min[1]-250-bb.min.y,(b.min[2]+b.max[2])/2-size/2-center.z);return obj;}
    for(let i=0;i<records.length;i++){
      if(ticket!==savedRequest)return;const b=records[i];if(!b.visible)continue;
      try{
        const props=await inheritedExemplar(b.tgi),owner=importedCity.registerBuilding(b,props),obj=await recordObject(b,props);
        if(ticket!==savedRequest)return;
        buildingBounds.union(new THREE.Box3().setFromObject(obj));queueOriginal(obj,owner);savedCount++;
      }catch{savedMissing++;}
      if(i%20===0){notice(`Original buildings: ${savedCount} rendered / ${records.length} records…`);render();await new Promise(r=>setTimeout(r,0));}
    }
    const materialCache=new Map();
    async function groundMaterial(id,group=0x1abe787d){const key=group+':'+id;if(!materialCache.has(key))materialCache.set(key,(async()=>{const tex=await texture(id,group);if(!tex)return null;return nativeLighting(new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide,transparent:true,alphaTest:.1,depthWrite:true,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));})());return materialCache.get(key);}
    const ni=city.subfiles?.c9c05c6e;
    if(ni!==undefined){
      const networks=nativeNetworks;
      for(let i=0;i<networks.length;i++){if(ticket!==savedRequest)return;const n=networks[i],mat=await groundMaterial(n.texture+4)||await groundMaterial(n.texture);if(!mat)continue;const pos=[],uv=[];
        for(const v of n.vertices){pos.push(v.position[0]-size/2,v.position[1]-250+.1,v.position[2]-size/2);uv.push(...v.uv);}
        queueGround(pos,uv,mat,n.id);savedNetworkCount++;if(i%100===0){notice(`Original roads: ${savedNetworkCount}/${networks.length}…`);await new Promise(r=>setTimeout(r,0));}
      }
    }
    const ti=city.subfiles?.c97f987c;
    if(ti!==undefined){
      const tiles=savedLotTextures(await resource(`archive=${city.archive}&index=${ti}`));
      for(let i=0;i<tiles.length;i++){if(ticket!==savedRequest)return;const t=tiles[i],mat=await groundMaterial(t.texture,0x0986135e);if(!mat)continue;
        const x=t.x*16-size/2,z=t.z*16-size/2,pos=[],uv=[];
        const corners=[[0,0],[0,16],[16,16],[16,0]],baseUV=[[0,0],[0,1],[1,1],[1,0]];
        for(let k=0;k<4;k++){const [dx,dz]=corners[k];pos.push(x+dx,elevation(x+dx,z+dz)+.3+t.priority*.0001,z+dz);const u=baseUV[(k+(t.orientation&3))%4];uv.push(t.orientation&4?1-u[0]:u[0],u[1]);}
        queueGround(pos,uv,mat,importedCity.ownerForTile(t.x,t.z));savedTextureCount++;if(i%200===0){notice(`Original lot tiles: ${savedTextureCount}/${tiles.length}…`);await new Promise(r=>setTimeout(r,0));}
      }
    }
    sceneryFailures={};for(const [type,flora]of [['2977aa47',false],['a9c05c85',true]]){const si=city.subfiles?.[type];if(si===undefined)continue;const scenery=savedScenery(await resource(`archive=${city.archive}&index=${si}`),flora);for(let i=0;i<scenery.length;i++){if(ticket!==savedRequest)return;const b=scenery[i];if(!b.visible)continue;try{const props=await inheritedExemplar(b.tgi),owner=importedCity.registerScenery(b,props),obj=await recordObject(b,props);queueOriginal(obj,owner);if(flora)savedFloraCount++;else savedPropCount++;}catch(e){savedSceneryMissing++;const key=b.tgi+' '+e.message;sceneryFailures[key]=(sceneryFailures[key]||0)+1;}if(i%100===0){notice(`Original scenery: ${savedPropCount} props · ${savedFloraCount} trees…`);await new Promise(r=>setTimeout(r,0));}}}
    for(const b of batches.values()){const mesh=new THREE.InstancedMesh(b.geometry,b.material,b.matrices.length);b.matrices.forEach(({matrix,owner},i)=>{mesh.setMatrixAt(i,matrix);registerImportedVisual(owner,{kind:'instance',mesh,index:i,matrix});});mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.userData.original=true;mesh.userData.instanceOwners=b.matrices.map(m=>m.owner);savedCity.add(mesh);}
    for(const b of groundBatches.values()){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(b.pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(b.uv,2));g.setIndex(b.indices);g.userData.triangleOwners=b.spans.flatMap(s=>[s.owner,s.owner]);for(const span of b.spans)registerImportedVisual(span.owner,{kind:'indices',geometry:g,start:span.start,indices:span.indices});savedCity.add(new THREE.Mesh(g,b.material));}
    if(savedCount){const center=buildingBounds.getCenter(new THREE.Vector3()),extent=buildingBounds.getSize(new THREE.Vector3()),radius=Math.max(extent.x,extent.z,500);controls.target.copy(center);camera.position.copy(center).add(new THREE.Vector3(radius*.8,radius*.7,radius*.8));controls.update();}
    notice(`${savedCount} buildings · ${savedNetworkCount} roads · ${savedPropCount} props · ${savedFloraCount} trees · ${savedSceneryMissing} unresolved. City ready.`);stats();render();
  }catch(e){notice('Saved city load failed: '+e.message);}
}
function pick(event){if(mode!=='city'||!ground)return null;const r=canvas.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);
 if(!waterView&&event.type==='pointerdown'&&['inspect','bulldoze'].includes(tool))for(const hit of ray.intersectObjects([...savedCity.children,...lots.children],true)){
  let object=hit.object;while(object&&!object.userData.cellKey)object=object.parent;const cell=object?cells.get(object.userData.cellKey):null;if(cell)return {x:cell.x,z:cell.z};
  const owner=hit.object.userData.instanceOwners?.[hit.instanceId]||hit.object.geometry?.userData.triangleOwners?.[hit.faceIndex];if(!owner)continue;const lot=importedCity?.lots.get(owner),network=importedCity?.networks.get(owner),scenery=importedCity?.scenery.get(owner);if(lot)return {x:lot.minX-importedCity.half,z:lot.minZ-importedCity.half};if(network)return {x:network.x,z:network.z};if(scenery)return {x:scenery.x,z:scenery.z};
 }
 const hit=ray.intersectObject(ground)[0];return hit?{x:Math.floor(hit.point.x/16),z:Math.floor(hit.point.z/16)}:null;
}
let drawing=false,lastPaint='';canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;drawing=true;canvas.setPointerCapture(e.pointerId);const p=pick(e);if(p){place(p.x,p.z);lastPaint=p.x+','+p.z;}});canvas.addEventListener('pointermove',e=>{hover=pick(e);if(drawing&&hover){const key=hover.x+','+hover.z;if(key!==lastPaint){place(hover.x,hover.z);lastPaint=key;}}});canvas.addEventListener('pointerup',()=>drawing=false);canvas.addEventListener('pointercancel',()=>drawing=false);canvas.addEventListener('contextmenu',e=>e.preventDefault());
$('#tools').addEventListener('click',e=>{const b=e.target.closest('[data-tool]');if(!b)return;setSavedView(false);tool=b.dataset.tool;if(['pipe','erasepipe'].includes(tool))setWaterView(true);else if(!['inspect'].includes(tool))setWaterView(false);document.querySelectorAll('[data-tool]').forEach(x=>x.classList.toggle('active',x===b));notice(`Selected ${tool}. Click or drag on terrain.`);});
$('#load-terrain').onclick=()=>loadTerrain(Number($('#terrain-select').value));
$('#pause').onclick=()=>{paused=!paused;$('#pause').textContent=paused?'Run':'Pause';};$('#step').onclick=simulate;$('#reset').onclick=()=>{clearLots();notice('Sandbox cleared.');};
$('#focus-city').onclick=focusCity;
$('#water-view').onclick=()=>setWaterView(!waterView);$('#water-plant').onchange=e=>{selectedWaterFacility=e.target.value;const b=catalog.game.waterFacilities.find(b=>b.tgi===selectedWaterFacility);document.querySelector('[data-tool=water]').textContent='Water facility · '+b.plopCost;};$('#water-funding').oninput=e=>{waterFunding=Number(e.target.value);$('#water-funding-value').textContent=waterFunding+'%';updateWater();stats();};
$('#saved-buildings').onclick=loadSavedBuildings;
$('#power-plant').onchange=e=>{selectedFacility=e.target.value;const b=catalog.game.facilities.find(x=>x.tgi===selectedFacility);document.querySelector('[data-tool=power]').textContent='ϟ Plant · '+b.plopCost;};$('#power-funding').oninput=e=>{powerFunding=Number(e.target.value);$('#funding-value').textContent=powerFunding+'%';updatePower();stats();};
$('#back-sandbox').onclick=()=>{setSavedView(false);notice('Returned to the experimental sandbox.');};
$('#demo').onclick=()=>{
  if(!map)return;let center=null;const lim=(map.n-1)/2;
  for(let z=-lim+12;z<lim-12&&!center;z+=8)for(let x=-lim+12;x<lim-12;x+=8){const hs=[];for(const [dx,dz]of [[-10,-8],[10,8],[-10,8],[10,-8],[0,0]])hs.push(elevation((x+dx)*16,(z+dz)*16));if(Math.min(...hs)>3&&Math.max(...hs)-Math.min(...hs)<15){center={x,z};break;}}
  if(!center){notice('No flat dry area found for the demo district on this terrain.');return;}
  setSavedView(false);clearLots();const {x,z}=center;for(let dx=-10;dx<=10;dx++){place(x+dx,z,'road');place(x+dx,z-5,'road');place(x+dx,z+5,'road');}for(let dz=-7;dz<=7;dz++)place(x,z+dz,'road');
  const coal=catalog.game.facilities.find(b=>/CoalPowerPlant/.test(b.name))||catalog.game.facilities[0];place(x+12,z+3,'power',false,coal.tgi);for(let dx=8;dx<=11;dx++)place(x+dx,z+3,'powerline');for(let dz=-7;dz<=7;dz++)for(let dx=-9;dx<=9;dx++){if(dx===0||[0,-5,5].includes(dz)||Math.abs(dx)>7)continue;place(x+dx,z+dz,dx<0?'residential':dz<0?'commercial':'industrial');}
  place(x+8,z-3,'park');simulate();simulate();simulate();controls.target.set((x+.5)*16,elevation(x*16,z*16),(z+.5)*16);camera.position.copy(controls.target).add(new THREE.Vector3(400,380,400));controls.update();notice('Generated demo district on original terrain. These buildings and simulation rules are experimental.');
};
function citySaveKey(name){return 'sc4-web-city-v2:'+encodeURIComponent(name);}
function persistCity(showNotice=false){
 if(!map||!catalog||$('#city-screen').hidden)return;
 const totals=importedCity?.totals()||catalog.cities[cityIndex].region,regionTotals={residents:population,commercialJobs:totals?.commercialJobs||0,industrialJobs:totals?.industrialJobs||0};for(const c of cells.values()){const b=blueprint(c);regionTotals.commercialJobs+=b?.capacity.commercial||0;regionTotals.industrialJobs+=b?.capacity.industrial||0;}
 const snapshot={version:4,pipes:[...pipes.values()],waterFunding,selectedWaterFacility,regionTotals,nativeEdits:[...(importedCity?.deleted||[])],city:catalog.cities[cityIndex].name,month,balance,net,initialFunds,powerFunding,selectedFacility,camera:{position:camera.position.toArray(),target:controls.target.toArray()},cells:[...cells.values()].map(({object,...c})=>c)};
 try{localStorage.setItem(citySaveKey(snapshot.city),JSON.stringify(snapshot));localStorage.setItem('sc4-web-sandbox-v1',JSON.stringify(snapshot));if(showNotice)notice('City saved.');}catch{if(showNotice)notice('Browser storage is full. The city could not be saved.');}
}
async function restoreConstruction(d,loadCity=true){
 if(!d||![1,2,3,4].includes(d.version)||!Array.isArray(d.cells)||d.cells.length>100000)throw Error('No valid city save');
 const i=catalog.cities.findIndex(c=>c.name===d.city);if(i<0)throw Error('Saved city is unavailable');
 if(loadCity&&i!==cityIndex){await loadTerrain(i);if(Object.keys(catalog.cities[i].subfiles||{}).some(k=>['a9bd882d','c9bd5d4a','c9c05c6e','a9c05c85'].includes(k)))await loadSavedBuildings();}
 setSavedView(false);importedCity?.restoreEdits(d.nativeEdits||[]);applyImportedEdits();syncImportedTotals();clearLots();$('#terrain-select').value=i;powerFunding=Math.max(0,Math.min(120,Number(d.powerFunding??100)));$('#power-funding').value=powerFunding;$('#funding-value').textContent=powerFunding+'%';if(catalog.game.facilities.some(b=>b.tgi===d.selectedFacility)){selectedFacility=d.selectedFacility;$('#power-plant').value=selectedFacility;$('#power-plant').dispatchEvent(new Event('change'));}
 waterFunding=Math.max(0,Math.min(120,Number(d.waterFunding??100)));$('#water-funding').value=waterFunding;$('#water-funding-value').textContent=waterFunding+'%';if(catalog.game.waterFacilities.some(b=>b.tgi===d.selectedWaterFacility)){selectedWaterFacility=d.selectedWaterFacility;$('#water-plant').value=selectedWaterFacility;$('#water-plant').dispatchEvent(new Event('change'));}
 for(const c of d.cells){if(!Number.isInteger(c.x)||!Number.isInteger(c.z)||!Object.hasOwn(costs,c.kind)||c.kind==='bulldoze')continue;if(place(c.x,c.z,c.kind,true,c.blueprint||selectedFacility)){const restored=cells.get(c.x+','+c.z);restored.level=Math.max(0,Math.min(3,Number(c.level)||0));refreshCell(restored);}}
 for(const p of (d.pipes||[]).slice(0,65536)){const lim=(map.n-1)/2;if(Number.isInteger(p.x)&&Number.isInteger(p.z)&&p.x>=-lim&&p.z>=-lim&&p.x<lim&&p.z<lim)pipes.set(p.x+','+p.z,{id:p.x+','+p.z,x:p.x,z:p.z});}
 month=Math.max(0,Number(d.month)||0);balance=Number.isFinite(d.balance)?d.balance:initialFunds;net=Number.isFinite(d.net)?d.net:0;if(Number.isFinite(d.initialFunds))initialFunds=d.initialFunds;updatePower();recount();stats();
 if(Array.isArray(d.camera?.position)&&Array.isArray(d.camera?.target)&&[...d.camera.position,...d.camera.target].length===6&&[...d.camera.position,...d.camera.target].every(Number.isFinite)){camera.position.fromArray(d.camera.position);controls.target.fromArray(d.camera.target);controls.update();}
}
$('#save').onclick=()=>persistCity(true);
$('#restore').onclick=async()=>{try{const current=catalog.cities[cityIndex].name,d=JSON.parse(localStorage.getItem(citySaveKey(current))||localStorage.getItem('sc4-web-sandbox-v1'));await restoreConstruction(d);notice('City restored.');}catch(e){notice(e.message);}};
window.addEventListener('beforeunload',()=>persistCity());

document.addEventListener('keydown',e=>{if(!ready||['INPUT','SELECT'].includes(e.target.tagName))return;if(e.key===' '){e.preventDefault();$('#pause').click();}if(e.key.toLowerCase()==='f'){if(document.fullscreenElement)document.exitFullscreen();else $('#viewport').requestFullscreen();}});
window.advanceTime=ms=>{if(!paused&&mode==='city'&&!savedView&&!$('#city-screen').hidden){clock+=ms;while(clock>=2500){simulate();clock-=2500;}}render();};
window.render_game_to_text=()=>JSON.stringify({mode:regionSelection?.getState().screen||'loading',region:regionSelection?.getState(),renderer:'WebGL',lighting:{mode:nightMode,nativeWindowMaterials:nightMaterials},originalTerrain:catalog?.cities[cityIndex]?.name,tiles:map?map.n-1:0,tool,paused,month,balance,population,jobs,net,cells:[...cells.values()].map(({object,...c})=>c),savedView,savedBuildings:savedCount,unresolvedBuildings:savedMissing,savedNetworkTiles:savedNetworkCount,savedLotTiles:savedTextureCount,savedProps:savedPropCount,savedFlora:savedFloraCount,unresolvedScenery:savedSceneryMissing,drawCalls:renderer.info.render.calls,activeModel:activeModel?.tgi,coordinateSystem:'Terrain x east, z south; 16 metres/tile; sea level 250m',water:{view:waterView,pipes:pipes.size,supply:waterGrid.supply,demand:waterGrid.demand,funding:waterFunding,wateredCount:waterGrid.wateredCount,shortageCount:waterGrid.shortageCount,circuits:waterGrid.circuits},power:{supply:powerGrid.supply,demand:powerGrid.demand,circuits:powerGrid.circuits,brownoutCount:powerGrid.brownoutCount},nativeTemplates:templateCache.size,importedCity:importedCity?.summary(),originalSelection,hover,loading:loading||!ready});
// Deterministic hooks for verifying placement and growth on real terrain.
window.sc4={setWaterView,waterAt:(x,z)=>waterGrid.states.get(x+','+z),pipeAt:(x,z)=>pipes.get(x+','+z),setNightMode,place,simulate,elevation,getState:()=>JSON.parse(window.render_game_to_text()),loadSavedBuildings,nativeLotAt:(x,z)=>importedCity?.lotAt(x,z),nativeRoadAt:(x,z)=>importedCity?.networkAt(x,z),nativeLots:()=>[...(importedCity?.lots.values()||[])],projectTile:(x,z)=>{const r=canvas.getBoundingClientRect(),v=new THREE.Vector3((x+.5)*16,elevation((x+.5)*16,(z+.5)*16)+1,(z+.5)*16).project(camera);return {x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2};},sceneryFailures:()=>sceneryFailures};
let last=performance.now();function loop(now){const dt=Math.min(100,now-last);last=now;window.advanceTime(dt);requestAnimationFrame(loop);}requestAnimationFrame(loop);
async function initialize(next){
  document.body.classList.add('loading');
  catalog=next;modelsByTgi=new Map(catalog.models.map(m=>[m.tgi,m]));if(!catalog.cities.length)throw Error('No .sc4 terrain files found. Include the Regions folder.');
  $('#import-screen').hidden=true;
  $('#engine').textContent=`${new Set(catalog.cities.map(c=>c.name.split('/')[0])).size} regions · ${catalog.cities.length} cities · Assets included`;
  const populated=document.createElement('optgroup'),empty=document.createElement('optgroup');populated.label='Populated cities · original geometry available';empty.label='Other original terrain';catalog.cities.forEach((c,i)=>(c.subfiles?.a9bd882d?populated:empty).append(new Option(c.name.replace('City - ',''),i)));$('#terrain-select').replaceChildren(populated,empty);
  selectedWaterFacility=catalog.game.waterFacilities[0]?.tgi;$('#water-plant').replaceChildren(...catalog.game.waterFacilities.map(b=>new Option(b.label+` · §${b.plopCost.toLocaleString()} · ${b.waterProduced.toLocaleString()} capacity`,b.tgi)));$('#water-plant').value=selectedWaterFacility;costs.pipe=catalog.game.waterPipeCost;costs.erasepipe=catalog.game.waterPipeBulldozeCost;
  selectedFacility=catalog.game.facilities.find(b=>/WindPower/.test(b.name))?.tgi||catalog.game.facilities[0]?.tgi;$('#power-plant').replaceChildren(...catalog.game.facilities.map(b=>new Option(b.label+` · §${b.plopCost.toLocaleString()} · ${b.powerGenerated} MWh`,b.tgi)));$('#power-plant').value=selectedFacility;costs.powerline=catalog.game.powerLineCost+catalog.game.powerPoleCost;
  regionSelection=createRegionSelection({catalog,getResource:resource,onEnter:async (index,options)=>{initialFunds=catalog.game.initialFunds[options?.difficulty??1]||100000;
    document.body.classList.add('loading');ready=false;
    try{setWaterView(false);await loadTerrain(index);if(Object.keys(catalog.cities[index].subfiles||{}).some(k=>['a9bd882d','c9bd5d4a','c9c05c6e','a9c05c85'].includes(k)))await loadSavedBuildings();setSavedView(false);$('#city-title').textContent=catalog.cities[index].name.split('/').at(-1).replace('City - ','').replace('.sc4','');$('#terrain-select').value=index;try{const saved=JSON.parse(localStorage.getItem(citySaveKey(catalog.cities[index].name)));if(saved)await restoreConstruction(saved,false);}catch{}notice('Select a tool to build. Existing city simulation is being reconstructed.');}
    finally{ready=true;document.body.classList.remove('loading');}
  }});ready=true;document.body.classList.remove('loading');
  $('#return-regions').onclick=()=>{persistCity();paused=true;$('#pause').textContent='Run';regionSelection.show();};
}
$('#game-files').onchange=async e=>{try{const next=await importFiles(e.target.files,s=>{$('#import-status').textContent=s;});await initialize(next);}catch(e){$('#import-status').textContent=e.message;}};
setNightMode(localStorage.getItem('sc4-lighting')||'day');
try{if(new URLSearchParams(location.search).has('import')){$('#import-screen').hidden=false;$('#engine').textContent='Optional local game folder';}else{notice('Loading bundled game assets…');const local=await openLocal();await initialize(local||await openBundledSource());}}catch(e){$('#engine').textContent='Asset download failed';notice(e.message+' — reload to retry.');document.body.classList.remove('loading');}
