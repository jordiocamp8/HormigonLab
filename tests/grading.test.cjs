'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const G = require('../dist/grading.js');
const near = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const demo = (over = {}) => ({kind: 'fine', initial: 1000, masses: [0,20,100,180,260,240,160,25,15], profileId: 'inen872-2011-fine', ...over});

test('granulometría independiente: retenidos, pasantes y MF 2,76', () => {
  const result = G.analyze(demo());
  const retained = [0,2,10,18,26,24,16,2.5,1.5];
  const cumulative = [0,2,12,30,56,80,96,98.5,100];
  const passing = [100,98,88,70,44,20,4,1.5,0];
  result.rows.forEach((row, i) => {near(row.retained, retained[i]); near(row.cumulative, cumulative[i]); near(row.passing, passing[i]);});
  near(result.fm, (0+2+12+30+56+80+96)/100);
  assert.equal(result.fmComplete, true);
  assert.equal(result.balanceOK, true);
  assert.equal(result.gradingStatus, 'within');
  assert.equal(result.normativeAcceptance, false);
});

test('el perfil histórico2011 usa5% y0% en300µm y150µm, sin sustituirlo por1982', () => {
  const p = G.profiles.find(p => p.id === 'inen872-2011-fine');
  assert.deepEqual(p.limits.find(l => l.sieve === .3), {sieve:.3,min:5,max:30});
  assert.deepEqual(p.limits.find(l => l.sieve === .15), {sieve:.15,min:0,max:10});
  assert.match(p.notes.join(' '), /2026/);
  assert.match(p.source, /StudyLib/);
});

test('cada incumplimiento informa tamiz, valor obtenido e intervalo', () => {
  const result = G.analyze(demo({masses:[0,20,100,180,260,100,300,25,15]}));
  const item = result.violations.find(v => v.sieve === .3 && v.type === 'passing');
  near(item.actual, 34); assert.equal(item.min,5); assert.equal(item.max,30);
  assert.equal(result.balanceOK,true);
  assert.equal(result.gradingStatus,'outside');
});

test('balance correcto no equivale a gradación dentro de envolvente', () => {
  const result = G.analyze(demo({masses:[0,0,0,0,1000,0,0,0,0]}));
  assert.equal(result.balanceOK,true);
  assert.equal(result.gradingStatus,'outside');
  assert.ok(result.violations.length);
});

test('fracción entre tamices se verifica aunque todos los pasantes estén en banda', () => {
  const result = G.analyze(demo({masses:[0,0,0,200,460,190,100,25,25]}));
  near(result.fm,2.66);
  assert.equal(result.violations.length,1);
  assert.equal(result.violations[0].type,'between');
  near(result.violations[0].actual,46);
  assert.equal(result.gradingStatus,'outside');
});

test('tamiz intermedio no evade el límite45% entre los tamices de referencia', () => {
  const result = G.analyze(demo({sieves:[9.5,4.75,2.36,1.18,.85,.6,.3,.15,.075,0],masses:[0,0,0,200,230,230,190,100,25,25]}));
  const between = result.violations.find(v => v.type === 'between');
  near(between.actual,46); near(result.fm,2.66);
});

test('MF fuera2.3–3.1 se detecta con cada porcentaje en banda', () => {
  // Pasa100,100,100,85,60,30,10; suma acumulados0+0+0+15+40+70+90=215.
  const result = G.analyze(demo({masses:[0,0,0,150,250,300,200,50,50]}));
  near(result.fm,2.15);
  assert.equal(result.violations.length,1);
  assert.equal(result.violations[0].type,'fm');
});

test('balance usa masa inicial y no renormaliza una pérdida', () => {
  const result = G.analyze(demo({initial:1100}));
  near(result.difference,-100);
  near(result.differencePercent,-100/1100*100);
  near(result.rows[1].retained,20/1100*100);
  near(result.rows[8].passing,100-1000/1100*100);
  assert.equal(result.balanceOK,false);
  assert.equal(result.gradingStatus,'not-evaluated');
});

test('umbral0.3% inclusivo y exceso bloquean evaluación en ambas direcciones', () => {
  for (const sign of [-1,1]) {
    const masses = demo().masses.slice(); masses[8] += sign*3;
    assert.equal(G.analyze(demo({masses})).balanceOK,true);
    masses[8] += sign*.001;
    const r=G.analyze(demo({masses})); assert.equal(r.balanceOK,false); assert.equal(r.gradingStatus,'not-evaluated');
  }
});

test('banda grueso57 verificada y MF no se transfiere desde grava', () => {
  // Pasantes37.5=100,25=98,19=80,12.5=50,9.5=25,4.75=5,2.36=2.
  const result = G.analyze({kind:'coarse',initial:10000,masses:[0,200,1800,3000,2500,2000,300,200],profileId:'inen872-2011-57'});
  assert.equal(result.fm,null); assert.equal(result.gradingStatus,'within');
  assert.deepEqual(result.limits.map(l=>[l.sieve,l.min,l.max]),[[37.5,100,100],[25,95,100],[12.5,25,60],[4.75,0,10],[2.36,0,5]]);
  assert.ok(!Object.hasOwn(result,'nominalMaximum'));
});

test('la evaluación exige seleccionar perfil: sin perfil no hay aceptación', () => {
  const result=G.analyze(demo({profileId:undefined}));
  assert.equal(result.gradingStatus,'not-evaluated'); near(result.fm,2.76);
});

test('la envolvente personalizada compara solo límites explícitos y no es normativa', () => {
  const result=G.analyze(demo({profileId:'custom',customLimits:[{sieve:.3,min:15,max:25}]}));
  assert.equal(result.gradingStatus,'within'); assert.equal(result.normativeAcceptance,false);
  assert.match(result.source,/usuario/);
});

test('en límites personalizados, cero explícito es válido y celda vacía no lo es', () => {
  assert.equal(G.analyze(demo({profileId:'custom',customLimits:[{sieve:.15,min:0,max:10}]})).gradingStatus,'within');
  for(const value of ['',null,undefined,false,NaN,Infinity]) assert.throws(()=>G.analyze(demo({profileId:'custom',customLimits:[{sieve:.15,min:value,max:10}]})));
});

test('se rechazan envolventes vacías, invertidas, imposibles o con tamices inexistentes', () => {
  for(const customLimits of [[],[{sieve:.3,min:30,max:5}],[{sieve:.3,min:-1,max:5}],[{sieve:.3,min:0,max:101}],[{sieve:0,min:0,max:1}],[{sieve:2,min:0,max:100}],[{sieve:.3,min:0,max:10},{sieve:.3,min:0,max:10}],[{sieve:.6,min:10,max:20},{sieve:.3,min:30,max:40}]]) {
    assert.throws(()=>G.analyze(demo({profileId:'custom',customLimits})));
  }
});

test('un tamiz de banda ausente impide indicar dentro', () => {
  const result=G.analyze({kind:'coarse',initial:10000,sieves:[37.5,25,19,12.5,9.5,4.75,0],masses:[0,200,1800,3000,2500,2000,500],profileId:'inen872-2011-57'});
  assert.equal(result.gradingStatus,'not-evaluated'); assert.match(result.warnings.join(' '),/2,36 mm/);
});

test('MF ausente si falta tamiz de la serie; no se interpola', () => {
  const result=G.analyze(demo({sieves:[9.5,4.75,2.36,1.18,.3,.15,.075,0],masses:[0,20,100,180,500,160,25,15]}));
  assert.equal(result.fm,null); assert.equal(result.fmComplete,false); assert.equal(result.gradingStatus,'not-evaluated');
});

test('MF conserva aporte9.5mm y marca parcial si el sobretamaño no fue caracterizado', () => {
  const result=G.analyze(demo({masses:[10,10,100,180,260,240,160,25,15]}));
  near(result.fm,2.77); assert.equal(result.fmComplete,false);
  assert.equal(result.gradingStatus,'not-evaluated');
});

test('serie extendida demuestra aporte nulo superior para cálculo MF completo', () => {
  const result=G.analyze(demo({sieves:[19,9.5,4.75,2.36,1.18,.6,.3,.15,.075,0],masses:[0,10,10,100,180,260,240,160,25,15]}));
  near(result.fm,2.77); assert.equal(result.fmComplete,true); assert.equal(result.gradingStatus,'outside');
});

test('datos faltantes, tipos incorrectos y valores no finitos se rechazan', () => {
  for(const initial of ['',null,undefined,false,0,-1,NaN,Infinity]) assert.throws(()=>G.analyze(demo({initial})));
  for(const mass of ['',null,undefined,false,-1,NaN,Infinity]) { const masses=demo().masses.slice();masses[2]=mass;assert.throws(()=>G.analyze(demo({masses}))); }
  for(const over of [{masses:[]},{masses:Array(9).fill(0)},{kind:'mixed'},{profileId:'unknown'},{profileId:'inen872-2011-57'},{sieves:[9.5,4.75,0,.3]},{sieves:[9.5,9.5,0]},{sieves:[9.5,4.75,.15]}]) assert.throws(()=>G.analyze(demo(over)));
});

test('la entrada no se modifica y los perfiles publicados son inmutables', () => {
  const input=demo(); const copy=JSON.stringify(input); G.analyze(input);
  assert.equal(JSON.stringify(input),copy);
  assert.throws(()=>{G.profiles[1].limits[0].max=0;});
});

test('el módulo funciona sin dependencias en navegador UMD', () => {
  const context=vm.createContext({}); vm.runInContext(fs.readFileSync(require.resolve('../dist/grading.js'),'utf8'),context);
  assert.equal(typeof context.HormigonGrading.analyze,'function');
  near(context.HormigonGrading.analyze(demo()).fm,2.76);
});

test('el cálculo seco mantiene pendiente lavado75µm y aceptación integral', () => {
  const result=G.analyze(demo());
  assert.match(result.warnings.join(' '),/lavado/);
  assert.match(result.warnings.join(' '),/calidad integral/);
  assert.equal(result.limits.some(l=>l.sieve===.075),false);
});
