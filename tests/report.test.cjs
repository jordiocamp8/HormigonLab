'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../dist/engine.js'),R=require('../dist/report.js'),G=require('../dist/grading.js');
const d=(patch={})=>({...E.defaults,sieves:[...E.defaults.sieves],...patch});
const make=(data=d(),options={})=>R.buildBody(data,E.calculate(data),{generatedAt:'2026-10-15',...options});
test('memoria: todos los pasos tienen ecuación, variables, datos, sustitución, resultado, unidad y fuente',()=>{
 const steps=R.steps(d(),E.calculate(d()));assert.ok(steps.length>=28);
 for(const step of steps)for(const key of ['title','equation','variables','inputs','substitution','result','unit','reference'])assert.ok(typeof step[key]==='string'&&step[key].length>0,key);
 const html=make();assert.match(html,/436,869417/);assert.match(html,/201,713983/);assert.match(html,/176,331603/);assert.match(html,/0,461726034/);assert.doesNotMatch(html,/NaN|undefined|Infinity/);
});
test('memoria usa datos actuales, no el caso de demostración estático',()=>{
 const data=d({waterMode:'manual',waterManual:180,wcMode:'manual',wcManual:.5,maxWC:0});
 const steps=R.steps(data,E.calculate(data));assert.equal(steps.find(s=>s.title==='Contenido de cemento').result,'360,000000');
 assert.match(make(data),/360,000000/);assert.doesNotMatch(steps.find(s=>s.title==='Agua base').substitution,/340/);
});
test('memoria explica cemento mínimo, base seca y aditivo sin doble conteo',()=>{
 const data=d({minCement:460,fineSGBasis:'od',fineSG:2.62/1.012,admDose:1,admDensity:1100,admWater:70});
 const steps=R.steps(data,E.calculate(data));
 assert.match(steps.find(s=>s.title==='Densidad relativa SSS · Arena').equation,/Gseca/);
 assert.equal(steps.find(s=>s.title==='Contenido de cemento').result,'460,000000');
 assert.match(steps.find(s=>s.title==='Volumen absoluto · Volumen residual del aditivo').equation,/− Wad/);
});
test('historial y modo manual producen memorias específicas',()=>{
 for(const patch of [{strengthMode:'history',sd:3,n:15},{strengthMode:'history',sd:3,n:30},{strengthMode:'manual',fcrManual:32}]){
 const data=d(patch);const html=make(data);assert.doesNotMatch(html,/NaN|undefined/);
 assert.match(html,patch.strengthMode==='history'?/Factor de modificación del historial/:/Resistencia media requerida manual/);}
});
test('sin aditivo no se divide por densidad vacía en la memoria',()=>{
 const data=d({admDensity:null,admWater:null});const steps=R.steps(data,E.calculate(data));
 assert.equal(steps.find(s=>s.title==='Volumen absoluto · Volumen residual del aditivo').substitution,'Sin aditivo → 0');
 assert.doesNotMatch(steps.map(s=>s.substitution).join(' '),/No ingresado/);
});
test('resultados experimentales exigen origen real y declaración explícita',()=>{
 for(const data of [d(),d({experimentalRecorded:true}),d({dataMode:'real'})]){
 const html=make(data,{experimental:true});assert.match(html,/No se incluyen resultados experimentales/);assert.doesNotMatch(html,/Resultado individual de compresión:/);}
 const html=make(d({dataMode:'real',experimentalRecorded:true}));assert.match(html,/Resultado individual de compresión: 28,294212/);
 assert.match(html,/Rendimiento relativo:/);
});
test('ensayos inválidos se señalan y no rompen el informe del diseño',()=>{
 const html=make(d({dataMode:'real',experimentalRecorded:true,testDiameter:2,trialDensity:10,trialAir:-1}));
 assert.match(html,/Compresión sin calcular/);assert.match(html,/Rendimiento sin calcular/);assert.match(html,/fuera de rango/);
});
test('granulometría adjunta diferencia gramos de porcentaje y muestra límites e incumplimientos',()=>{
 const g=G.analyze({kind:'fine',profileId:'inen872-2011-fine',masses:[0,0,0,0,0,0,998,0,0],initial:1000});
 const html=make(d(),{grading:[g]});assert.match(html,/-2,000000 g \(-0,200000 %\)/);
 assert.match(html,/fuera de los límites seleccionados/);assert.match(html,/Pasa mínimo/);assert.match(html,/2011/);
});
test('HTML escapa textos de usuario y contiene estructura portátil imprimible',()=>{
 const data=d({name:'<script>alert(1)</script>',author:'A & B',notes:'<img src=x onerror=1>'});
 const html=R.buildDocument(data,E.calculate(data));
 assert.match(html,/&lt;script&gt;/);assert.match(html,/A &amp; B/);assert.doesNotMatch(html,/<script|<img|<link/);
 assert.match(html,/@media print/);assert.match(html,/break-after:page/);assert.match(html,/charset="utf-8"/);
});
function parseCSV(text){return text.replace(/^\uFEFF/,'').split('\r\n').map(line=>[...line.matchAll(/"((?:""|[^"])*)"(?:;|$)/g)].map(m=>m[1].replace(/""/g,'"')));}
test('CSV conserva precisión numérica, agua diferenciada, costos y escalado',()=>{
 const data=d({volume:2.3,waste:5}),r=E.calculate(data),rows=parseCSV(R.exportCSV(data,r));
 for(const [name,value] of [['Agua efectiva kg/m3',r.water],['Agua a anadir kg/m3',r.addedWater],['Relacion a/c efectiva',r.actualWC],['Volumen con reserva m3',r.batchVolume]])assert.equal(Number(rows.find(x=>x[0]===name)[1]),value);
 for(const x of r.rows){const row=rows.find(row=>row[0]===x.name&&row.length===8);assert.ok(row);assert.equal(Number(row[3]),x.wet);assert.equal(Number(row[4]),x.wet*r.batchVolume);assert.equal(Number(row[5]),x.wet*r.perBatch);assert.equal(Number(row[7]),x.wet*r.batchVolume*x.price);}
 const water=rows.find(x=>x[0]===r.rows.find(x=>x.key==='water').name&&x.length===8);assert.equal(water[1],'');assert.equal(water[2],'');
});
test('CSV escapa comillas, separadores y fórmulas de hojas de cálculo',()=>{
 assert.equal(R.csvCell('=SUM(A1)'),'"\'=SUM(A1)"');assert.equal(R.csvCell('a;"b"'),'"a;""b"""');
 assert.equal(R.csvCell(-3),'"-3"');assert.match(R.csvCell('  @x'),/^"'  @/);
});
test('no se exportan cantidades o memoria de un diseño bloqueado',()=>{
 const data=d({fc:35}),r=E.calculate(data);assert.equal(r.ok,false);
 for(const fn of [R.steps,R.buildBody,R.buildDocument,R.exportCSV])assert.throws(()=>fn(data,r));
});
