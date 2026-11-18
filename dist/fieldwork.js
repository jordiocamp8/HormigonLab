/* Cuaderno experimental: valores medidos y diseño al preparar la amasada. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./engine.js'));else root.HormigonFieldwork=factory(root.Hormigon);})(typeof globalThis!=='undefined'?globalThis:this,function(E){
'use strict';
const keys=['cement','fine','coarse','water','admixture'], names=['Cemento','Arena húmeda','Grava húmeda','Agua añadida','Aditivo líquido'];
const copy=x=>JSON.parse(JSON.stringify(x));
function str(x,field,max=160){if(typeof x!=='string'||!x.trim()||x.trim().length>max)throw Error('Revisa '+field+' (1–'+max+' caracteres).');return x.trim();}
function num(x,lo,hi,field){if(typeof x!=='number'||!Number.isFinite(x)||x<lo||x>hi)throw Error(field+': ingresa un valor entre '+lo+' y '+hi+'.');return x;}
function date(x){if(typeof x!=='string'||!/^\d{4}-\d\d-\d\d$/.test(x)||!Number.isFinite(Date.parse(x+'T12:00:00Z'))||new Date(x+'T12:00:00Z').toISOString().slice(0,10)!==x)throw Error('Ingresa una fecha válida.');return x;}
function unique(list,k,what){if(new Set(list.map(x=>x[k].toLowerCase())).size!==list.length)throw Error('Identificador repetido: '+what+'.');return list;}
function list(x,limit,label){if(!Array.isArray(x)||x.length>limit)throw Error(label+': máximo '+limit+' registros.');return x;}
function specimen(x){const id=str(x.id,'identificador de probeta'),age=num(x.age,.01,3650,'Edad (días)'),diameter=num(x.diameter,10,1000,'Diámetro medido (mm)'),load=num(x.load,.001,100000,'Carga máxima (kN)');return {id,age,diameter,load};}
function batch(d,x){
 const r=E.calculate(d);if(!r.ok)throw Error('Para vincular la amasada se necesita un diseño calculable: '+r.errors[0]);
 const design={};for(const [k,def] of Object.entries(E.defaults)){const v=d[k];if(v===undefined)continue;
  const valid=Array.isArray(def)?Array.isArray(v)&&v.length===def.length&&v.every(n=>n===null||Number.isFinite(n)):
   typeof def==='number'?v===null||Number.isFinite(v):typeof def==='string'?typeof v==='string'&&v.length<=20000:typeof v===typeof def;
  if(!valid)throw Error('Dato inválido en el diseño de la amasada: '+k);design[k]=copy(v);
 }
 const measured={};keys.forEach((k,i)=>measured[k]=num(x.measured?.[k],i<3?.000001:0,1e7,'Masa de '+names[i].toLowerCase()+' (kg)'));
 const opt=(k,lo,hi,label)=>x[k]==null?null:num(x[k],lo,hi,label);
 return {id:str(x.id,'código de amasada'),date:date(x.date),design,volume:num(x.volume,.0001,100,'Volumen nominal (m³)'),density:opt('density',500,4000,'Densidad fresca (kg/m³)'),slump:opt('slump',0,350,'Asentamiento (mm)'),air:opt('air',0,100,'Aire (%)'),measured,specimens:unique(list(x.specimens??[],100,'Probetas por amasada').map(specimen),'id','probeta')};
}
function journal(x=[]){return unique(list(x,60,'Amasadas por proyecto').map(b=>batch(b.design,b)),'id','amasada');}
function summary(b){const r=E.calculate(b.design);if(!r.ok)throw Error('Diseño vinculado inválido.');const rows=r.rows.map(x=>({name:x.name,expected:x.wet*b.volume,actual:b.measured[x.key],delta:b.measured[x.key]-x.wet*b.volume}));const mass=rows.reduce((s,x)=>s+x.actual,0),volume=b.density==null?null:mass/b.density;return {rows,mass,volume,relative:volume===null?null:volume/b.volume,nominal:b.volume,slumpDelta:b.slump===null?null:b.slump-b.design.targetSlump,airDelta:b.air===null?null:b.air-b.design.air};}
const kinds={fine:'Arena',coarse:'Grava',cement:'Cemento',water:'Agua',adm:'Aditivo'},props={fine:['fineSG','fineSGBasis','fineAbs','fm'],coarse:['coarseSG','coarseSGBasis','coarseAbs','rodded','size'],cement:['cementType','cementSource','cementSG'],water:['waterSource','waterQuality'],adm:['admName','admDensity','admWater']};
function material(kind,d,label,source,when){
 if(!Object.hasOwn(props,kind))throw Error('Tipo de material desconocido.');
 if(!['real','demo'].includes(d.dataMode))throw Error('Procedencia de datos desconocida.');
 const values={};for(const k of props[kind]){let v=d[k];if(k.endsWith('SGBasis')){if(!['od','dry','ssd'].includes(v))throw Error('Selecciona la base seca o SSS.');}
 else if(k==='waterQuality'){if(!['unknown','documented'].includes(v))throw Error('Revisa la evidencia de aptitud del agua.');}
 else if(k==='size'){if(!E.sizes.includes(v))throw Error('Selecciona el TMN de la grava.');}
 else if(typeof E.defaults[k]==='number'){const ranges={fineSG:[1.8,3.5],coarseSG:[1.8,3.5],cementSG:[2,4],fm:[1,4.5],rodded:[800,2200],admDensity:[800,2000],admWater:[0,100]};num(v,...(ranges[k]||[0,30]),k);}
 else if(k==='cementSource'&&!v)v=source;else str(v,k,1000);values[k]=v;}
 return {kind,label:str(label,'nombre de la ficha'),source:str(source,'procedencia o referencia',300),date:date(when),mode:d.dataMode,values};
}
function catalog(x=[]){return list(x,120,'Fichas de materiales').map(m=>material(m.kind,{...m.values,dataMode:m.mode},m.label,m.source,m.date));}
function useMaterial(d,m){const safe=catalog([m])[0];if(d.dataMode==='real'&&safe.mode==='demo')throw Error('Una ficha de demostración no se puede aplicar a un diseño real.');const next={...d,...safe.values};if(['fine','coarse'].includes(m.kind))next[m.kind+'Moist']=null;return next;}
function mergeCatalog(a,b){const seen=new Set(),out=[];for(const m of catalog(a).concat(catalog(b))){const key=JSON.stringify(m);if(!seen.has(key)){seen.add(key);out.push(m);}}return catalog(out);}
return {keys,names,kinds,material,catalog,useMaterial,mergeCatalog,batch,specimen,journal,summary};
});
