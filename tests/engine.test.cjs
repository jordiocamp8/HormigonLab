const test=require('node:test'),assert=require('node:assert/strict'),E=require('../dist/engine.js');
const d=(over={})=>({...E.defaults,sieves:[...E.defaults.sieves],...over});
const near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const manual=d({strengthMode:'manual',fcrManual:35,waterMode:'manual',waterManual:200,wcMode:'manual',wcManual:.5,maxWC:0,coarseMode:'manual',coarseManual:.625,cementSG:3.2,fineSG:2.5,coarseSG:2.5,rodded:1600,fineAbs:2,coarseAbs:1,fineMoist:5,coarseMoist:2,air:2});
test('ejemplo independiente: cemento400, gravaSSD1010, arenaSSD627.5 y agua171.5441',()=>{const r=E.calculate(manual);assert.ok(r.ok,r.errors);near(r.cement,400);near(r.coarse.dry,1000);near(r.coarse.ssd,1010);near(r.fine.ssd,627.5);near(r.fine.wet,645.9558823529412);near(r.addedWater,171.5441176470588);near(r.totalMass,2237.5);near(r.totalVolume,1);});
test('ejemplo predeterminado usa conversiones exactas de tablas históricas',()=>{const r=E.calculate(d());assert.ok(r.ok,r.errors);near(r.baseWater,340*E.PCY);near(r.strength.value,28+1200*E.PSI);near(r.coarseFraction,.62);});
test('en SSS el agua añadida equivale a efectiva si no hay aditivo',()=>{const r=E.calculate({...manual,fineMoist:2,coarseMoist:1});near(r.addedWater,200);near(r.fine.wet,r.fine.ssd);near(r.coarse.wet,r.coarse.ssd);});
test('áridos secos: agua libre negativa y mayor agua añadida',()=>{const r=E.calculate({...manual,fineMoist:0,coarseMoist:0});assert.ok(r.fine.free<0&&r.coarse.free<0);near(r.addedWater,222.30392156862746);});
test('aditivo líquido conserva agua y volumen sin doble contabilización',()=>{const r=E.calculate({...manual,admDose:1,admDensity:1000,admWater:50});assert.ok(r.ok,r.errors);near(r.admixture,4);near(r.admixtureWater,2);near(r.volumes.admixture,.002);near(r.fine.ssd,622.5);near(r.addedWater+r.fine.free+r.coarse.free+r.admixtureWater,200);near(r.totalVolume,1);});
test('invariantes de conservación en 250 humedades y absorciones distintas',()=>{for(let i=0;i<250;i++){const r=E.calculate({...manual,fineAbs:(i%11)/2,coarseAbs:(i%7)/3,fineMoist:(i%17)/2,coarseMoist:(i%13)/3,admDose:(i%5)/4,admDensity:1100,admWater:60});assert.ok(r.ok,r.errors);near(r.addedWater+r.fine.free+r.coarse.free+r.admixtureWater,r.water);near(r.totalVolume,1);near(r.totalMass,r.cement+r.fine.ssd+r.coarse.ssd+r.water+r.admixture-r.admixtureWater);near(r.actualWC,r.water/r.cement);}});
test('las tres columnas de pesaje conservan la misma masa',()=>{const r=E.calculate({...manual,admDose:1,admWater:60});for(const base of ['dry','ssd','wet'])near(r.rows.reduce((s,x)=>s+x[base],0),r.totalMass);});
test('durabilidad y cemento mínimo controlan a/c efectiva',()=>{const r=E.calculate({...manual,maxWC:.4,minCement:550});near(r.cement,550);near(r.actualWC,200/550);});
test('factor de historial e interpolación',()=>{const s=E.targetStrength(d({strengthMode:'history',n:17,sd:4}));near(s.factor,1.128);const fc=28/E.PSI,sd=4/E.PSI*1.128;near(s.value,Math.max(fc+1.34*sd,fc+2.33*sd-500)*E.PSI);assert.throws(()=>E.targetStrength(d({strengthMode:'history',n:14})));});
test('fcr alto y frontera exacta de 3000/5000psi',()=>{near(E.targetStrength(d({fc:2999*E.PSI})).value,3999*E.PSI);near(E.targetStrength(d({fc:3000*E.PSI})).value,4200*E.PSI);near(E.targetStrength(d({fc:5000*E.PSI})).value,6200*E.PSI);near(E.targetStrength(d({fc:6000*E.PSI})).value,7300*E.PSI);});
test('sin extrapolación automática: resistencia o MF fuera de rango',()=>{assert.equal(E.calculate(d({fc:70})).ok,false);assert.equal(E.calculate(d({fm:3.2})).ok,false);assert.ok(E.calculate(d({fm:3.2,coarseMode:'manual'})).ok);});
test('bloqueo de agua negativa, volumen imposible, NaN y campos vacíos',()=>{for(const values of [{fineMoist:50,coarseMoist:50},{minCement:700,coarseManual:.85,coarseMode:'manual',rodded:2200},{fc:NaN},{volume:null},{air:13},{coarseAbs:-1},{fineSG:0}])assert.equal(E.calculate(d(values)).ok,false,JSON.stringify(values));});
test('humedad con tara y densidades de ensayos',()=>{near(E.labMoisture(110,100,50),20);const c=E.labCoarse(2500,2520,1570);near(c.abs,.8);near(c.ssd,2520/950);const f=E.labFine(494,500,650,959);near(f.ssd,500/191);near(f.abs,600/494);near(E.bulkDensity(5,21,10),1600);assert.throws(()=>E.labMoisture(80,100,50));assert.throws(()=>E.labFine(494,500,650,1150));});
test('granulometría y masa inicial: MF exacto, alerta de balance',()=>{const s=E.sieve([0,20,100,180,260,240,160,25,15],1000);near(s.fm,2.76);assert.ok(s.valid);near(s.rows[8].passing,0);assert.equal(E.sieve([0,20,100,180,260,240,160,25,15],1100).valid,false);});
test('estadística muestral y resistencia por área',()=>{const s=E.stats([20,25,30]);near(s.mean,25);near(s.sd,5);near(E.compression(500,150),28.29421210522584);assert.throws(()=>E.stats([25]));});
test('lotes iguales, reserva una sola vez y probetas',()=>{const r=E.calculate({...manual,volume:1,waste:3,mixer:200});near(r.batchVolume,1.03);assert.equal(r.batches,6);near(r.perBatch*r.batches,1.03);near(E.cylinders(150,300,6,0),.03180862561759666);});
test('rendimiento unitario y normalización por densidad medida',()=>{const r=E.calculate(manual),t=E.trial(r,.03,r.totalMass);near(t.relative,1);near(t.mass,67.125);const t2=E.trial(r,.03,2300);near(t2.rows.reduce((s,x)=>s+x.normalized,0),2300);});

// Independently evaluated using Python Decimal (45 significant digits), physical
// unit definitions and the cited source tables. No engine output was used as input.
test('auditoría independiente completa del ejemplo de 28 MPa',()=>{
  const r=E.calculate(d());assert.ok(r.ok,r.errors);
  const expected={baseWater:201.7139832276462021,water:201.7139832276462021,wcStrength:.4617260340487899244,cement:436.8694168246345327,addedWater:176.3316031092607669,totalMass:2325.6483903494340811,cost:113.8248589021324355};
  for(const [key,value]of Object.entries(expected))near(r[key],value,1e-9);
  near(r.strength.value,36.2737087518020332,1e-12);
  near(r.fine.dry,678.9812157086495517,1e-9);near(r.fine.ssd,687.1289902971533463,1e-9);near(r.fine.wet,709.5353704155387815,1e-9);
  near(r.coarse.dry,992);near(r.coarse.ssd,999.936);near(r.coarse.wet,1002.912);
  near(r.waterBalance.dryAdded,217.7977578161499967,1e-9);near(r.waterBalance.ssdAdded,201.7139832276462021,1e-9);near(r.waterBalance.absorbed,16.0837745885037946,1e-9);near(r.waterBalance.free,25.3823801183854352,1e-9);
});
test('21 MPa dentro del alcance y 35 MPa sin historial fuera de tabla',()=>{
  const low=E.calculate(d({fc:21})),high=E.calculate(d({fc:35}));assert.ok(low.ok,low.errors);near(low.strength.value,29.2737087518020332,1e-12);assert.equal(high.ok,false);assert.match(high.errors.join(' '),/fuera de la tabla/);
  near(E.targetStrength(d({fc:35})).value,43.3263301052178527,1e-12);
  const manual35=E.calculate(d({fc:35,wcMode:'manual',wcManual:.4}));assert.ok(manual35.ok,manual35.errors);assert.equal(manual35.experimentalValidated,false);
});
test('unidades exactas: libra, yarda cúbica, MPa y área de cilindro',()=>{
  near(E.PCY,.5932764212577829474,1e-15);near(E.PSI,.006894757293168361,1e-18);
  near(E.compression(Math.PI*150**2/4*.03,150),30,1e-12);
  near(E.bulkDensity(2,17,10),1500);
});
test('interpolación lineal en nodos, interiores y extremos; tablas inválidas bloqueadas',()=>{
  for(const[x,y]of [[2.4,.66],[2.5,.65],[2.6,.64],[2.9,.61],[3,.60]])near(E.interpolate([[2.4,.66],[2.6,.64],[2.8,.62],[3,.60]],x),y,1e-12);
  for(const points of [[],[[1,2]],[[1,2],[1,3]],[[2,2],[1,3]],[[1,NaN],[2,3]],[[1,2],[2,Infinity]],[[1,2],[2]]])assert.throws(()=>E.interpolate(points,1.5));
  for(const x of [NaN,Infinity,null,'1.5',0,3])assert.throws(()=>E.interpolate([[1,2],[2,3]],x));
});
test('historial: factores y ambas ramas de resistencia comprobadas sin llamar al interpolador',()=>{
  for(const[n,k]of [[15,1.16],[20,1.08],[25,1.03],[27,1.018],[30,1],[50,1]])near(E.targetStrength(d({strengthMode:'history',n,sd:4})).factor,k,1e-12);
  const low=E.targetStrength(d({strengthMode:'history',fc:28,n:30,sd:1}));near(low.value,29.34,1e-12);
  const high=E.targetStrength(d({strengthMode:'history',fc:40,n:30,sd:6}));near(high.value,49.98,1e-12);near(high.candidates[0],48.04,1e-12);near(high.candidates[1],49.98,1e-12);
  for(const changes of [{n:0},{n:14},{n:15.5},{sd:0},{sd:NaN},{sd:null}])assert.equal(E.calculate(d({strengthMode:'history',...changes})).ok,false);
});
test('todas las filas de agua históricas conservan conversión explícita',()=>{
  const plain=[[350,335,315,300,275],[385,365,340,325,300],[410,385,360,340,315]],air=[[305,295,280,270,250],[340,325,305,295,275],[365,345,325,310,290]];
  for(const entrained of [false,true])for(let band=0;band<3;band++)for(let i=0;i<5;i++){
    const r=E.calculate(d({fc:21,entrained,size:[9.5,12.5,19,25,37.5][i],slumpBand:String(band)}));assert.ok(r.ok,r.errors);near(r.baseWater,(entrained?air:plain)[band][i]*.5932764212577829474,1e-10);
  }
});
test('las densidades de partículas en base seca y SSS generan la misma dosificación',()=>{
  const sss=E.calculate(manual),od=E.calculate({...manual,fineSGBasis:'od',coarseSGBasis:'od',fineSG:2.5/1.02,coarseSG:2.5/1.01});assert.ok(od.ok,od.errors);
  near(od.fineSGSSD,2.5);near(od.coarseSGSSD,2.5);near(od.fineSGOD,2.5/1.02);near(od.coarseSGOD,2.5/1.01);
  for(const key of ['cement','addedWater','totalMass','totalVolume','cost'])near(od[key],sss[key]);
  near(od.fine.ssd,sss.fine.ssd);near(od.coarse.ssd,sss.coarse.ssd);
  assert.ok(E.calculate({...manual,fineSGBasis:'dry',fineSG:2.5/1.02}).ok);
  assert.equal(E.calculate({...manual,coarseSGBasis:'apparent'}).ok,false);
});
test('humedad exacta por base seca: inferior, igual y superior a absorción',()=>{
  for(const[h,wet,free]of [[0,1000,-20],[1,1010,-10],[2,1020,0],[5,1050,30]]){const x=E.moisture(1020,2,h);near(x.dry,1000);near(x.wet,wet);near(x.free,free);}
  const x=E.moisture(1000,0,0);near(x.ssd,x.dry);near(x.wet,x.dry);
  for(const values of [[null,2,4],[1000,-1,4],[1000,2,-1],[Infinity,2,4]])assert.throws(()=>E.moisture(...values));
});
test('cemento máximo bloquea incumplimiento sin recortar el resultado físico',()=>{
  const exact=E.calculate({...manual,maxCement:400});assert.ok(exact.ok,exact.errors);near(exact.cement,400);
  for(const over of [{maxCement:399.99},{minCement:450,maxCement:440},{minCement:450,maxCement:425},{maxCement:-1}])assert.equal(E.calculate({...manual,...over}).ok,false);
  const raised=E.calculate({...manual,minCement:450,maxCement:450});assert.ok(raised.ok,raised.errors);near(raised.cement,450);near(raised.actualWC,200/450);
  assert.match(E.calculate(d()).warnings.join(' '),/400 kg\/m³.*no límite normativo/);
});
test('proyecto real vacío conserva vacíos y no crea dosificación válida',()=>{
  const real=E.createRealDesign();assert.equal(real.dataMode,'real');assert.equal(real.name,'');assert.equal(real.author,'');assert.equal(real.experimentalRecorded,false);
  for(const k of ['fc','air','targetSlump','cementSG','fineSG','coarseSG','fineAbs','coarseAbs','fineMoist','coarseMoist','rodded','fm','testLoad','labWet','trialDensity'])assert.equal(real[k],null,k);
  assert.deepEqual(real.sieves,Array(9).fill(null));assert.equal(real.priceCement,0);
  const r=E.calculate(real);assert.equal(r.ok,false);assert.equal(r.mathematicalValidated,false);assert.ok(r.errors.length>=12);assert.equal(r.rows,undefined);
  const other=E.createRealDesign({name:'Cantera A',author:'Jordi'});assert.equal(other.name,'Cantera A');other.sieves[0]=123;assert.equal(real.sieves[0],null);assert.equal(E.defaults.sieves[0],0);
});
test('campos opcionales nuevos ausentes en v1 conservan resultados',()=>{
  const legacy=d();for(const k of ['dataMode','experimentalRecorded','targetSlump','maxCement','fineSGBasis','coarseSGBasis','cementType','waterQuality'])delete legacy[k];
  const before=E.calculate(d()),after=E.calculate(legacy);assert.ok(after.ok,after.errors);near(before.cement,after.cement);near(before.totalMass,after.totalMass);near(after.fineSGSSD,2.62);assert.equal(legacy.dataMode,undefined);
  const absent=d();delete absent.fineAbs;assert.equal(E.calculate(absent).ok,false,'No restaurar ensayos esenciales de demostración');
});
test('no se exige ficha de aditivo cuando la dosis es cero',()=>{
  const r=E.calculate({...manual,admDose:0,admDensity:null,admWater:null});assert.ok(r.ok,r.errors);near(r.admixture,0);near(r.volumes.admixture,0);near(r.addedWater,171.5441176470588);
  assert.equal(E.calculate({...manual,admDose:1,admDensity:null,admWater:null}).ok,false);
});
test('aditivos: agua 0 y 100 por ciento, e incompatibilidad de volumen',()=>{
  const dry=E.calculate({...manual,admDose:1,admDensity:1000,admWater:0}),allWater=E.calculate({...manual,admDose:1,admDensity:1000,admWater:100});assert.ok(dry.ok);assert.ok(allWater.ok);near(dry.admixtureWater,0);near(dry.volumes.admixture,.004);near(allWater.volumes.admixture,0);near(allWater.waterBalance.reconstructed,200);
  assert.equal(E.calculate({...manual,admDose:1,admDensity:1200,admWater:100}).ok,false);
});
test('balance hídrico y masa no dependen de la condición de pesaje',()=>{
  for(const moists of [[0,0],[2,1],[5,2]]){const r=E.calculate({...manual,fineMoist:moists[0],coarseMoist:moists[1],admDose:1,admWater:50,admDensity:1000});assert.ok(r.ok);near(r.waterBalance.effective,r.waterBalance.reconstructed);near(r.waterBalance.dryAdded,r.water+r.waterBalance.absorbed-r.admixtureWater);near(r.waterBalance.ssdAdded,r.water-r.admixtureWater);for(const key of ['dry','ssd','wet'])near(r.rows.reduce((sum,row)=>sum+row[key],0),r.totalMass);}
});
test('asentamiento y exposición producen advertencias sin inventar restricciones',()=>{
  const r=E.calculate(d({targetSlump:160,slumpBand:'1',exposure:'Cloruros',exposureReference:'',maxWC:0,minCement:0}));assert.ok(r.ok);assert.match(r.warnings.join(' '),/fuera de la banda/);assert.match(r.warnings.join(' '),/no se asignan límites automáticos/);near(r.selectedWC,r.wcStrength);
  for(const value of [null,-1,251])assert.equal(E.calculate(d({targetSlump:value})).ok,false);
});
test('estadística descriptiva no aprueba historial insuficiente o mezcla experimental',()=>{
  const few=E.stats([20,25,30]);assert.equal(few.historyEligible,false);assert.equal(few.experimentalValidated,false);assert.match(few.warnings.join(' '),/insuficiente/);
  assert.equal(E.stats(Array(30).fill(30)).historyEligible,false);
  assert.equal(E.stats(Array.from({length:15},(_,i)=>25+i/2)).historyEligible,true);
  const r=E.calculate(d({dataMode:'real',experimentalRecorded:true}));assert.ok(r.mathematicalValidated);assert.equal(r.experimentalValidated,false);assert.equal(r.normativeValidated,false);
});
test('cantidades y costos escalan por volumen; mezcladas enteras sin error binario',()=>{
  const base=E.calculate(manual),r=E.calculate({...manual,volume:10,waste:10,mixer:350});assert.ok(r.ok);near(r.batchVolume,11);assert.equal(r.batches,32);near(r.perBatch,.34375);near(r.cost,base.cost);
  const priceManual=400*.18+645.9558823529412*.018+1020*.022+171.5441176470588*.002;near(base.cost,priceManual);
  const exact=E.calculate({...manual,volume:.14,waste:0,mixer:20});assert.equal(exact.batches,7);near(exact.perBatch,.02,1e-14);
  const tiny=E.calculate({...manual,volume:.0001,waste:0,mixer:20000});assert.equal(tiny.batches,1);near(tiny.perBatch,.0001);
});
test('entradas no finitas, modos desconocidos y densidad compactada imposible',()=>{
  for(const value of [null,undefined,[],42,'diseño'])assert.equal(E.calculate(value).ok,false);
  for(const change of [{fc:'28'},{fineAbs:''},{coarseSG:Infinity},{strengthMode:'x'},{wcMode:'x'},{waterMode:'x'},{coarseMode:'x'},{dataMode:'x'},{entrained:'false'},{slumpBand:''},{slumpBand:null},{slumpBand:'abc'},{coarseSG:1.8,coarseAbs:20,rodded:2200}])assert.equal(E.calculate(d(change)).ok,false,JSON.stringify(change));
});
test('funciones de laboratorio y probetas rechazan vacíos y geometría inválida',()=>{
  assert.throws(()=>E.labMoisture(null,100,0));assert.throws(()=>E.labCoarse(2500,2499,1500));assert.throws(()=>E.labCoarse(2500,2520,2500));assert.throws(()=>E.labFine(494,493,650,959));assert.throws(()=>E.bulkDensity(5,5,10));assert.throws(()=>E.compression(500,null));assert.throws(()=>E.cylinders(150,300,1.5,0));assert.throws(()=>E.trial({ok:false},.03,2300));
});
test('JSON conserva null y resultados sin perder bases ni precisión interna',()=>{
  const source=d({fineSGBasis:'od',fineSG:2.62/1.012,maxCement:500,dataMode:'real'}),before=E.calculate(source),after=E.calculate(JSON.parse(JSON.stringify(source)));assert.ok(after.ok);near(after.cement,before.cement);near(after.fine.ssd,before.fine.ssd);near(after.totalMass,before.totalMass);
  const real=JSON.parse(JSON.stringify(E.createRealDesign()));assert.equal(real.fc,null);assert.deepEqual(real.sieves,Array(9).fill(null));assert.equal(E.calculate(real).ok,false);
});
