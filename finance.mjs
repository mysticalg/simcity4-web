// Native budget serialization and arithmetic, with saved assessment baselines.
export const TAX_CODES=[0x1010,0x1020,0x1030,0x3110,0x3120,0x3130,0x3320,0x3330,0x4100,0x4200,0x4300,0x4400];
export const TAX_LABELS=['Residential $','Residential $$','Residential $$$','Commercial services $','Commercial services $$','Commercial services $$$','Commercial offices $$','Commercial offices $$$','Agriculture','Dirty industry','Manufacturing','High-tech industry'];
export const DEPARTMENTS={power:0x8910bc8a,water:0xaa4014b4,roads:0xc921ceea,parks:0x8a4260a6};
function reader(a,start=0,end=a.length){
 const v=new DataView(a.buffer,a.byteOffset,a.byteLength);let p=start;const need=n=>{if(p+n>end)throw Error('Truncated budget record');};
 return {get p(){return p;},skip(n){need(n);p+=n;},u8(){need(1);return a[p++];},u16(){need(2);const x=v.getUint16(p,true);p+=2;return x;},u32(){need(4);const x=v.getUint32(p,true);p+=4;return x;},i64(){need(8);const x=Number(v.getBigInt64(p,true));p+=8;if(!Number.isSafeInteger(x))throw Error('Unsafe budget integer');return x;},f32(){need(4);const x=v.getFloat32(p,true);p+=4;if(!Number.isFinite(x))throw Error('Invalid budget float');return x;},text(){const n=this.u32();need(n);const s=new TextDecoder().decode(a.subarray(p,p+n));p+=n;return s;}};
}
export function savedBudget(a){
 const r=reader(a),size=r.u32();if(size!==a.length)throw Error('Invalid budget simulator size');r.skip(8);const version=r.u16();if(![4,5].includes(version))throw Error('Unsupported budget simulator version');
 const treasury=r.i64(),previousTreasury=r.i64(),debt=r.i64(),cachedPropertyTax=r.i64(),count=r.u32(),departments=[];if(count>1000)throw Error('Invalid budget department count');
 for(let i=0;i<count;i++)departments.push({id:r.u32(),memory:r.u32(),type:r.u32()});
 const taxes=[];for(let i=0;i<12;i++){const rate=r.f32(),rateAux=r.f32(),history=Array.from({length:12},()=>r.i64()),accumulator=r.i64(),assessment=r.i64(),monthlyTax=r.i64();if(rate<0||rate>100||assessment<0)throw Error('Invalid tax record');taxes.push({code:TAX_CODES[i],rate,rateAux,history,accumulator,assessment,monthlyTax});}
 return {version,treasury,previousTreasury,debt,cachedPropertyTax,departments,taxes,unparsedTailBytes:a.length-r.p};
}
function records(a,parse){const out=[];let p=0;const v=new DataView(a.buffer,a.byteOffset,a.byteLength);while(p<a.length){if(p+14>a.length)throw Error('Truncated finance header');const n=v.getUint32(p,true);if(n<14||p+n>a.length)throw Error('Invalid finance record size');const r=reader(a,p,p+n);r.skip(8);const memory=r.u32(),version=r.u16();out.push(parse(r,memory,version,p+n));p+=n;}return out;}
export function savedLineItems(a){return records(a,(r,memory,version,end)=>{if(version!==4)throw Error('Unsupported budget line version');const name=r.text(),units=r.i64(),cost=r.i64(),expense=r.i64(),revenue=r.i64();return {memory,name,units,cost,expense,revenue,unparsedTailBytes:end-r.p};});}
export function savedDepartments(a){return records(a,(r,memory,version,end)=>{if(![9,10].includes(version))throw Error('Unsupported budget department version');const enabled=r.u8(),id=r.u32(),name=r.text(),category=r.u32(),funding=Math.fround(r.f32()*(version<10?Math.fround(.01):1)),maximumFunding=Math.fround(r.f32()*(version<10?Math.fround(.01):1)),accumulator=r.i64(),flag=r.u8(),n=r.u32(),lines=[];if(n>100000)throw Error('Invalid budget line count');for(let i=0;i<n;i++){lines.push(r.u32());if(r.u32()!==0xaa313c9f)throw Error('Invalid budget line pointer');}const count=r.u32(),buildings=[];if(count>100000)throw Error('Invalid budget building count');for(let i=0;i<count;i++)buildings.push({memory:r.u32(),type:r.u32(),purpose:r.u32()});r.skip(8);if(r.p!==end||funding<0||funding>5)throw Error('Invalid department layout');return {memory,id,name,enabled,category,funding,maximumFunding,accumulator,flag,lines,buildings};});}
export function propertyTax(assessment,rate,multiplier=1){return Math.trunc(Math.max(0,assessment)*Math.fround(multiplier)*Math.fround(rate)*Math.fround(1/1200));}
export function inferTaxMultiplier(source,multipliers){
 const rows=source?.taxes.filter(t=>t.assessment>0&&t.monthlyTax>0)||[];if(!rows.length)return null;
 const matches=multipliers.map((m,difficulty)=>({multiplier:m,difficulty,error:rows.reduce((n,t)=>n+Math.abs(propertyTax(t.assessment,t.rate,m)-t.monthlyTax),0)})).filter(m=>m.error===0);
 return matches.length===1?matches[0]:null;
}
export function sourceLedger(source){
 const lines=new Map((source?.lines||[]).map(l=>[l.memory,l]));
 return (source?.departments||[]).map(d=>({...d,cost:d.lines.reduce((n,id)=>n+(lines.get(id)?.cost||0),0),expense:d.lines.reduce((n,id)=>n+(lines.get(id)?.expense||0),0),revenue:d.lines.reduce((n,id)=>n+(lines.get(id)?.revenue||0),0)}));
}
export function calculateBudget({source=null,taxRates,assessmentDelta=Array(12).fill(0),costDelta=new Map(),powerFunding=100,waterFunding=100,multiplier=1}){
 const taxes=TAX_CODES.map((code,i)=>{const assessment=Math.max(0,(source?.budget.taxes[i].assessment||0)+(assessmentDelta[i]||0)),rate=taxRates[i];return {code,label:TAX_LABELS[i],assessment,rate,monthly:propertyTax(assessment,rate,multiplier)};});
 const departments=sourceLedger(source),known=new Set(departments.map(d=>d.id));for(const[id,delta]of costDelta)if(!known.has(id))departments.push({id,name:Object.keys(DEPARTMENTS).find(k=>DEPARTMENTS[k]===id)||'Other services',cost:0,expense:0,revenue:0,funding:1});
 const expenses=departments.map(d=>{const funding=d.id===DEPARTMENTS.power?powerFunding/100:d.id===DEPARTMENTS.water?waterFunding/100:d.funding,delta=costDelta.get(d.id)||0,changed=delta!==0||Math.abs(funding-d.funding)>1e-6;return {id:d.id,name:d.name,funding:Math.round(funding*100),amount:changed?Math.trunc(Math.max(0,d.cost+delta)*Math.fround(funding)):d.expense,revenue:d.revenue};});
 const rawTax=t=>t.assessment*Math.fround(t.rate)*Math.fround(multiplier)*Math.fround(1/1200),rawCurrent=taxes.reduce((n,t)=>n+rawTax(t),0),rawSource=(source?.budget.taxes||[]).reduce((n,t)=>n+rawTax(t),0),propertyTaxes=Math.max(0,Math.trunc(rawCurrent)+(source&&rawCurrent>0?source.budget.cachedPropertyTax-Math.trunc(rawSource):0)),otherIncome=expenses.reduce((n,d)=>n+d.revenue,0),expense=expenses.reduce((n,d)=>n+d.amount,0),income=propertyTaxes+otherIncome;
 return {taxes,expenses,propertyTaxes,otherIncome,income,expense,net:income-expense,multiplier,sourceTreasury:source?.budget.treasury??null};
}
