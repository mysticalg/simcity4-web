import * as THREE from 'three';
export function terrainMaterial(textures,config){
 const material=new THREE.MeshLambertMaterial({map:textures[0],color:0x8f988a});
 material.onBeforeCompile=shader=>{
  textures.forEach((map,i)=>shader.uniforms['groundMap'+i]={value:map});
  shader.uniforms.groundScale={value:config.tilingFactor*16/100};shader.uniforms.beachHeight={value:config.maxBeachAltitude};shader.uniforms.beachWidth={value:config.maxBeachWidth};shader.uniforms.cliffY={value:config.cliffNormalY};
  shader.vertexShader='attribute float shoreDistance; varying vec3 groundPosition; varying vec3 groundNormal; varying float shoreRange;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\n groundPosition=(modelMatrix*vec4(transformed,1.0)).xyz; groundNormal=normalize(mat3(modelMatrix)*normal); shoreRange=shoreDistance;');
  shader.fragmentShader=`varying vec3 groundPosition; varying vec3 groundNormal; varying float shoreRange;
 uniform sampler2D groundMap0; uniform sampler2D groundMap1; uniform sampler2D groundMap2; uniform sampler2D groundMap3; uniform sampler2D groundMap4; uniform sampler2D groundMap5; uniform sampler2D groundMap6;
 uniform float groundScale; uniform float beachHeight; uniform float beachWidth; uniform float cliffY;
 vec3 rockSample(sampler2D tex,vec3 p,vec3 n){vec3 w=pow(abs(n),vec3(4.0));w/=max(dot(w,vec3(1.0)),0.0001);return texture2D(tex,p.yz).rgb*w.x+texture2D(tex,p.xz).rgb*w.y+texture2D(tex,p.xy).rgb*w.z;}
 `+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
 vec2 uv=groundPosition.xz*groundScale; vec3 terrainN=normalize(groundNormal);
 float grassVariation=0.5+0.5*sin(groundPosition.x*0.006)*cos(groundPosition.z*0.008);
 vec3 meadow=mix(texture2D(groundMap0,uv).rgb,texture2D(groundMap1,uv).rgb,grassVariation*0.18);
 meadow=mix(meadow,texture2D(groundMap2,uv).rgb,(1.0-terrainN.y)*0.35);
 float cliff=1.0-smoothstep(cliffY-0.05,cliffY+0.13,terrainN.y);
 vec3 stone=mix(rockSample(groundMap4,groundPosition*groundScale*0.6,terrainN),rockSample(groundMap5,groundPosition*groundScale*0.6,terrainN),smoothstep(220.0,650.0,groundPosition.y));
 float beach=(1.0-smoothstep(beachHeight-1.0,beachHeight+1.0,groundPosition.y))*(1.0-smoothstep(max(0.0,beachWidth-1.0),beachWidth+0.5,shoreRange));
 vec3 ground=mix(meadow,texture2D(groundMap3,uv).rgb,beach);
 ground=mix(ground,stone,cliff);ground=mix(ground,texture2D(groundMap6,uv*0.5).rgb,smoothstep(50.0,500.0,-groundPosition.y));
 diffuseColor.rgb*=ground;
 `);
 };
 material.customProgramCacheKey=()=> 'sc4-native-terrain-v1';return material;
}
