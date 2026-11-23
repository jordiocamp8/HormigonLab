'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../dist/engine.js'),F=require('../dist/fieldwork.js'),P=require('../dist/project.js'),V=require('../dist/workbench.js'),R=require('../dist/report.js');
const near=(actual,expected,eps=1e-10)=>assert.ok(Math.abs(actual-expected)<=eps,actual+' ≠ '+expected);
const design=(extra={})=>({...structuredClone(E.defaults),dataMode:'real',waterMode:'manual',waterManual:200,wcMode:'manual',wcManual:.5,maxWC:0,...extra});
const measured=()=>({cement:15,fine:20,coarse:30,water:5,admixture:2});
const inputs=(extra={})=>({id:'A-01',date:'2024-02-29',volume:.04,density:2400,slump:85,air:1.75,measured:measured(),...extra});
const make=(d=design(),over={})=>F.batch(d,inputs(over));
const sample=()=>({id:'P-01',load:450,diameter:150,age:28});
test('amasada: usa 72 kg pesados / 2400 kg/m³ = 0,030 m³; contra 0,040 m³ nominal da 75%',()=>{
 const q=F.summary(make());near(q.mass,72);near(q.volume,.03);near(q.relative,.75);
 near(q.slumpDelta,-5);near(q.airDelta,-.25);
 // Agua 200 / a/c 0,50 = 400 kg/m³; para 40 L se necesitan 16 kg de cemento.
 const cement=q.rows.find(row=>row.name==='Cemento');near(cement.expected,16);near(cement.actual,15);near(cement.delta,-1);
});
test('las masas y el diseño de referencia no cambian al modificar el formulario o las pesadas originales',()=>{
 const d=design(),x=inputs(),batch=F.batch(d,x),before=F.summary(batch);d.waterManual=240;d.sieves[0]=999;x.measured.water=20;
 assert.equal(batch.design.waterManual,200);assert.equal(batch.design.sieves[0],0);assert.equal(batch.measured.water,5);assert.deepEqual(F.summary(batch),before);
});
test('la bitácora diferencia medición cero de ausencia de medición y no devuelve rendimiento inventado',()=>{
 const no=F.summary(make(design(),{density:null,slump:null,air:null}));assert.equal(no.volume,null);assert.equal(no.relative,null);assert.equal(no.slumpDelta,null);assert.equal(no.airDelta,null);
 const zero=F.summary(make(design(),{slump:0,air:0,measured:{...measured(),water:0,admixture:0}}));near(zero.mass,65);near(zero.slumpDelta,-90);near(zero.airDelta,-2);
 assert.match(V.records([make(design(),{density:null})]),/densidad fresca/i);
});
test('amasadas: rechaza imposibilidades de fecha, masas, densidad, volumen y diseño bloqueado',()=>{
 for(const patch of [{date:'2025-02-29'},{id:' '},{density:0},{volume:0},{air:101},{measured:{...measured(),water:-.001}},{measured:{...measured(),cement:0}},{measured:{...measured(),fine:null}},{measured:{...measured(),water:'5'}}])
  assert.throws(()=>make(design(),patch),undefined,JSON.stringify(patch));
 assert.throws(()=>make(E.createRealDesign()));assert.throws(()=>F.journal([make(),make(design(),{id:' a-01 '})]),/repetido/);
});
test('probetas: carga y diámetro se validan; se conservan edad y amasada, sin estimación a 28 días',()=>{
 for(const patch of [{age:0},{load:0},{diameter:0},{id:'  '},{load:NaN}])assert.throws(()=>F.specimen({...sample(),...patch}));
 const specimens=[sample(),{id:'P-02',load:300,diameter:150,age:7}],b=make(design(),{specimens}),report=V.records([b]);
 assert.ok(report.indexOf('P-02')<report.indexOf('P-01'));
 // 450000 N / (pi*75² mm²) = 25,4647908947 MPa, y 300000 N / la misma área = 16,9765272631.
 assert.match(report,/25,465/);assert.match(report,/16,977/);assert.equal(b.specimens[0].age,28);
 assert.throws(()=>make(design(),{specimens:[sample(),{...sample(),id:'p-01'}]}),/repetido/);
});
test('fichas de arena y grava transfieren propiedades solo de su árido, exigen nueva humedad y respetan su base',()=>{
 for(const [kind,basis,sg] of [['fine','od',2.55],['coarse','ssd',2.7]]){
  const src=design({[kind+'SGBasis']:basis,[kind+'SG']:sg,[kind+'Moist']:9});
  const entry=F.material(kind,src,'Cantera A','Ensayo 7','2026-11-01');
  assert.ok(!Object.hasOwn(entry.values,kind+'Moist'));
  const d=design(),next=F.useMaterial(d,entry),other=kind==='fine'?'coarse':'fine';
  assert.equal(next[kind+'SGBasis'],basis);assert.equal(next[kind+'SG'],sg);assert.equal(next[kind+'Moist'],null);assert.equal(next[other+'Moist'],d[other+'Moist']);assert.ok(d[kind+'Moist']!==null);
  assert.equal(E.calculate(next).ok,false);assert.equal(E.calculate({...next,[kind+'Moist']:3}).ok,true);
 }
});
test('catálogo rechaza fichas demo en un diseño real y conserva dos caracterizaciones distintas de la misma cantera',()=>{
 const demo=F.material('fine',E.defaults,'Arena A','Ensayo de muestra','2026-11-01');
 assert.doesNotThrow(()=>F.useMaterial(E.defaults,demo));assert.throws(()=>F.useMaterial(design(),demo),/demostración/);
 const a=F.material('fine',design(),'Arena A','Ensayo 1','2026-11-01'),b=F.material('fine',design({fineAbs:1.4}),'Arena A','Ensayo 2','2026-11-02');
 const merged=F.mergeCatalog([a],[a,b]);assert.equal(merged.length,2);assert.equal(merged[1].values.fineAbs,1.4);
 assert.throws(()=>F.catalog([{...a,values:{...a.values,fm:null}}]));
});
test('fichas de cemento, agua y aditivo no sustituyen los criterios de dosificación del diseño',()=>{
 const src=design({cementType:'Portland',cementSource:'Fábrica A',waterSource:'Red',waterQuality:'documented',admName:'Producto A',admDose:2,admWater:50,admDensity:1100});
 for(const kind of ['cement','water','adm']){
  const m=F.material(kind,src,'Ficha de ensayo','Informe 5','2026-11-01'),original=design({admDose:.8,reduction:5}),next=F.useMaterial(original,m);
  assert.equal(next.admDose,.8);assert.equal(next.reduction,5);assert.equal(next.fineMoist,original.fineMoist);
  if(kind==='adm'){assert.equal(next.admName,'Producto A');assert.equal(next.admWater,50);}
 }
});
test('proyecto v3: respaldo JSON y versión guardada conservan bitácora con probetas y fichas sin alias',()=>{
 const d=design(),b=make(d,{specimens:[sample()]}),m=F.material('fine',d,'Arena A','Ensayo 1','2026-11-01');
 const record={data:d,journal:[b],materials:[m],statsText:'',gradingState:P.defaultGrading()},raw=P.pack(d,record);
 assert.equal(raw.schemaVersion,4);assert.equal(raw.engineVersion,'1.3.0');
 const restored=P.parse(JSON.parse(JSON.stringify(raw))),saved=P.saveVersion([],record,{id:'v3'})[0];
 assert.deepEqual(restored.journal,[b]);assert.deepEqual(restored.materials,[m]);assert.deepEqual(F.summary(restored.journal[0]),F.summary(b));
 saved.journal[0].specimens[0].load=1;assert.equal(b.specimens[0].load,450);assert.equal(restored.journal[0].specimens[0].load,450);
 assert.throws(()=>P.parse({...raw,journal:[{...b,density:-1}]}));
});
test('proyecto v2: se abre sin inventar fichas o amasadas y conserva cantidades y precio de la mezcla previa',()=>{
 const d=design({fineMoist:3.5,priceCement:.22}),old={schemaVersion:2,engineVersion:'1.1.0',data:d,statsText:'',gradingState:P.defaultGrading()},restored=P.parse(JSON.parse(JSON.stringify(old)));
 assert.deepEqual(restored.journal,[]);assert.deepEqual(restored.materials,[]);assert.deepEqual(E.calculate(restored.data),E.calculate(d));
 const next=P.pack(restored.data,restored);assert.deepEqual(P.parse(next).data,d);
});
test('comparador explica el déficit de humedad y separa diferencias por pesos y precios',()=>{
 const a=structuredClone(E.defaults),b={...a,fineMoist:3.5,priceCement:.28},html=V.explain(a,b,E.calculate(a),E.calculate(b));
 // La arena seca del caso de referencia pesa 678,98121570865 kg.
 // Un punto porcentual menos resta 6,789812 kg de arena húmeda y añade exactamente esa masa de agua.
 assert.match(html,/-6,790/);assert.match(html,/6,790 kg\/m³/);assert.match(html,/permanecen iguales/);
 // Δ por cantidad = 6,789812 * (0,002 − 0,018); Δ por precio = 436,8694168 * 0,10.
 assert.match(html,/-0,109 USD\/m³/);assert.match(html,/43,687 USD\/m³/);assert.match(html,/43,578 USD\/m³/);
});
test('comparador identifica por separado límite a/c, contenido mínimo y escenario sin solución',()=>{
 const a=design({wcManual:.55,maxWC:.5}),b=design({minCement:450}),bad=E.createRealDesign();
 const html=V.explain(a,b,E.calculate(a),E.calculate(b));assert.match(html,/controla el límite máximo de a\/c/);assert.match(html,/controla el mínimo de cemento/);
 const blocked=V.explain(a,bad,E.calculate(a),E.calculate(bad));assert.match(blocked,/requiere dos escenarios calculables/);assert.doesNotMatch(blocked,/NaN|USD\/m³/);
});
test('informe incluye registros manuales reales, no la amasada de demostración, y escapa sus identificadores',()=>{
 const d=design(),a=make(d,{id:'A-REAL <b>',specimens:[{...sample(),id:'<script>inofensivo</script>'}]}),demo=make(E.defaults,{id:'A-FICTICIA'});
 const html=R.buildDocument(d,E.calculate(d),{journal:[a,demo]});
 assert.match(html,/A-REAL &lt;b&gt;/);assert.match(html,/&lt;script&gt;inofensivo&lt;\/script&gt;/);assert.doesNotMatch(html,/A-FICTICIA|<script>inofensivo/);
 assert.match(html,/0,030000 m³/);assert.match(html,/75,00 % del volumen nominal/);
 const demoReport=R.buildDocument(E.defaults,E.calculate(E.defaults),{journal:[demo]});assert.match(demoReport,/Sin amasadas reales registradas/);assert.doesNotMatch(demoReport,/A-FICTICIA/);
});
