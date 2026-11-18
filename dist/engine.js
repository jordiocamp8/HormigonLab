/* HormigónLab — motor independiente; unidades internas kg, m, MPa.
   Tablas históricas ACI 211 reproducidas por UT Austin/TxDOT (2010).
   Resistencia media: FHWA 1608 (03/2026); humedad: FHWA 1638 (02/2007).
   El cierre matemático no certifica resistencia, trabajabilidad ni conformidad normativa. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Hormigon = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const PSI = 0.006894757293168361, PCY = 0.45359237 / Math.pow(0.9144, 3);
  const sizes = [9.5, 12.5, 19, 25, 37.5];
  const waterTable = {
    plain: [[350,335,315,300,275],[385,365,340,325,300],[410,385,360,340,315]],
    air: [[305,295,280,270,250],[340,325,305,295,275],[365,345,325,310,290]]
  };
  const coarseTable = [[.50,.48,.46,.44],[.59,.57,.55,.53],[.66,.64,.62,.60],[.71,.69,.67,.65],[.75,.73,.71,.69]];
  const defaults = {
    name: 'Mezcla de práctica · 28 MPa', author: 'Demostración', reference: 'ACI 211 histórico · referencias de ensayos ASTM / NTE INEN', notes: '',
    dataMode: 'demo', experimentalRecorded: false, cementType: 'Portland (demostración)', cementSource: '', waterSource: 'Demostración', waterQuality: 'unknown',
    application: 'Hormigón convencional', exposure: 'Sin clasificación declarada', exposureReference: '', targetSlump: 90,
    university: 'Universidad Técnica Particular de Loja (UTPL)', course: 'Diseño de Hormigones', teacher: 'Ing. Agustín Ruiz',
    objective: 'Predosificar hormigón convencional de densidad normal mediante volúmenes absolutos.',
    fc: 28, strengthMode: 'noHistory', fcrManual: 36.3, sd: 3.5, n: 30,
    size: 19, slumpBand: '1', entrained: false, air: 2,
    waterMode: 'table', waterManual: 200, reduction: 0, wcMode: 'table', wcManual: .48,
    maxWC: .50, minCement: 0, maxCement: 0, coarseMode: 'table', coarseManual: .62,
    fineSGBasis: 'ssd', coarseSGBasis: 'ssd',
    cementSG: 3.15, fineSG: 2.62, coarseSG: 2.65, fineAbs: 1.2, coarseAbs: .8,
    fineMoist: 4.5, coarseMoist: 1.1, rodded: 1600, fm: 2.8,
    admName: '', admDose: 0, admDensity: 1100, admWater: 70,
    volume: 1, waste: 3, mixer: 200, bag: 50,
    priceCement: .18, priceFine: .018, priceCoarse: .022, priceWater: .002, priceAdm: 2.5,
    trialVolume: .03, trialDensity: 2350, trialSlump: 90, trialAir: 2,
    cylinderDiameter: 150, cylinderHeight: 300, cylinderCount: 6,
    age: 28, testLoad: 500, testDiameter: 150,
    sieveInitial: 1000, sieves: [0,20,100,180,260,240,160,25,15],
    labWet: 1045, labDry: 1000, labTare: 0,
    labCoarseDry: 2500, labCoarseSSD: 2520, labSubmerged: 1570,
    labFineDry: 494, labFineSSD: 500, labPycWater: 650, labPycSample: 959,
    labContainer: 5, labContainerFull: 21, labContainerLitres: 10
  };
  const isNum = v => typeof v === 'number' && Number.isFinite(v);
  // Only new optional fields receive legacy defaults. Missing laboratory data never do.
  const optionalKeys = ['dataMode','experimentalRecorded','cementType','cementSource','waterSource','waterQuality','application','exposure','exposureReference','targetSlump','maxCement','fineSGBasis','coarseSGBasis','university','course','teacher','objective','admName'];
  const numericLabels = {fc:'f′c',size:'TMN',air:'Aire objetivo',cementSG:'Densidad relativa del cemento',fineSG:'Densidad relativa de arena',coarseSG:'Densidad relativa de grava',fineAbs:'Absorción de arena',coarseAbs:'Absorción de grava',fineMoist:'Humedad de arena',coarseMoist:'Humedad de grava',rodded:'Masa unitaria seca compactada',fm:'Módulo de finura',targetSlump:'Asentamiento objetivo',waterManual:'Agua manual',wcManual:'Relación a/c manual',coarseManual:'Fracción de grava manual',fcrManual:'f′cr manual',sd:'Desviación muestral',n:'Número de ensayos'};
  function normalize(d) {
    if(!d || typeof d!=='object' || Array.isArray(d))throw new Error('Ingresa un objeto de diseño válido.');
    const out={...d};
    optionalKeys.forEach(k=>{if(out[k]===undefined)out[k]=defaults[k];});
    return out;
  }
  function required(d) {
    const keys=['fc','size','air','cementSG','fineSG','coarseSG','fineAbs','coarseAbs','fineMoist','coarseMoist','rodded','fm','targetSlump','reduction','admDose','maxWC','minCement','maxCement','volume','waste','mixer','bag','priceCement','priceFine','priceCoarse','priceWater','priceAdm'];
    if(d.admDose>0)keys.push('admDensity','admWater');
    if(d.waterMode==='manual')keys.push('waterManual');
    if(d.wcMode==='manual')keys.push('wcManual');
    if(d.coarseMode==='manual')keys.push('coarseManual');
    if(d.strengthMode==='manual')keys.push('fcrManual');
    if(d.strengthMode==='history')keys.push('sd','n');
    return keys;
  }
  function createRealDesign(identity={}) {
    const d={...defaults,sieves:Array(9).fill(null),dataMode:'real',name:'',author:'',notes:'',cementType:'',cementSource:'',waterSource:'',waterQuality:'unknown',exposure:'Sin clasificación declarada',exposureReference:''};
    const empty=['fc','fcrManual','sd','n','size','air','targetSlump','waterManual','wcManual','coarseManual','cementSG','fineSG','coarseSG','fineAbs','coarseAbs','fineMoist','coarseMoist','rodded','fm','admDensity','admWater','trialVolume','trialDensity','trialSlump','trialAir','age','testLoad','testDiameter','sieveInitial','labWet','labDry','labTare','labCoarseDry','labCoarseSSD','labSubmerged','labFineDry','labFineSSD','labPycWater','labPycSample','labContainer','labContainerFull','labContainerLitres'];
    empty.forEach(k=>d[k]=null);
    ['maxWC','minCement','maxCement','admDose','reduction','waste','priceCement','priceFine','priceCoarse','priceWater','priceAdm'].forEach(k=>d[k]=0);
    ['name','author'].forEach(k=>{if(typeof identity?.[k]==='string')d[k]=identity[k];});
    return d;
  }
  function check(v, lo, hi, name) {
    if (!isNum(v) || v < lo || v > hi) throw new Error(name + ': ingresa un número entre ' + lo + ' y ' + hi + '.');
    return v;
  }
  function interpolate(points, x) {
    if(!Array.isArray(points)||points.length<2||points.some((p,i)=>!Array.isArray(p)||p.length!==2||!isNum(p[0])||!isNum(p[1])||(i>0&&p[0]<=points[i-1][0])))throw new Error('La tabla requiere al menos dos puntos numéricos con abscisas estrictamente crecientes.');
    if (!isNum(x) || x < points[0][0] || x > points[points.length-1][0]) throw new Error('Valor fuera de la tabla; utiliza un valor manual sustentado en ensayos.');
    for (let i=1;i<points.length;i++) if (x<=points[i][0]) {
      const [x0,y0]=points[i-1], [x1,y1]=points[i];
      return y0+(y1-y0)*(x-x0)/(x1-x0);
    }
    return points[0][1];
  }
  function targetStrength(d) {
    if(!d || typeof d!=='object')throw new Error('Ingresa los datos de resistencia.');
    check(d.fc,7,100,"f′c");
    if (d.strengthMode==='manual') return {value:check(d.fcrManual,d.fc,140,"f′cr manual"), factor:null, rule:'Valor manual del proyecto'};
    const fc=d.fc/PSI;
    if (d.strengthMode==='history') {
      check(d.sd,.01,30,'Desviación estándar'); check(d.n,15,10000,'Número de ensayos');
      if (!Number.isInteger(d.n)) throw new Error('El número de ensayos debe ser entero.');
      const k=d.n>=30?1:interpolate([[15,1.16],[20,1.08],[25,1.03],[30,1]],d.n), s=d.sd/PSI*k;
      const first=fc+1.34*s,second=fc<=5000?fc+2.33*s-500:.9*fc+2.33*s;
      return {value:Math.max(first,second)*PSI,factor:k,fcPsi:fc,modifiedSD:d.sd*k,candidates:[first*PSI,second*PSI],historyEligible:true,rule:fc<=5000?'máx(f′c + 1,34ks; f′c + 2,33ks − 500 psi)':'máx(f′c + 1,34ks; 0,90f′c + 2,33ks)'};
    }
    if(d.strengthMode!=='noHistory') throw new Error('Modo de resistencia desconocido.');
    return {value:(fc<3000?fc+1000:fc<=5000?fc+1200:1.1*fc+700)*PSI,factor:null,fcPsi:fc,historyEligible:false,rule:fc<3000?'f′c + 1000 psi':fc<=5000?'f′c + 1200 psi':'1,10f′c + 700 psi'};
  }
  function moisture(ssd, absorption, total) {
    check(ssd,0,10000,'Masa SSS'); check(absorption,0,30,'Absorción'); check(total,0,50,'Humedad');
    const dry=ssd/(1+absorption/100), wet=dry*(1+total/100);
    return {dry,ssd,wet,free:wet-ssd};
  }
  function calculate(d) {
    const errors=[], warnings=[]; let result;
    try {
      d=normalize(d);
      required(d).forEach(k=>{if(!isNum(d[k]))errors.push('Falta un valor numérico válido en '+(numericLabels[k]||k)+'.');});
      if(errors.length)return {ok:false,errors,warnings,mathematicalValidated:false,experimentalValidated:false,normativeValidated:false};
      if(!['demo','real'].includes(d.dataMode))throw new Error('Selecciona datos de demostración o datos reales.');
      if(typeof d.entrained!=='boolean')throw new Error('El estado de aire incorporado debe ser verdadero o falso.');
      const strength=targetStrength(d), index=sizes.indexOf(d.size);
      if(index<0) throw new Error('Selecciona un tamaño nominal disponible.');
      check(d.air,0,12,'Aire'); check(d.cementSG,2,4,'Densidad relativa del cemento');
      check(d.fineSG,1.8,3.5,'Densidad relativa de arena'); check(d.coarseSG,1.8,3.5,'Densidad relativa de grava');
      check(d.fineAbs,0,30,'Absorción de arena');check(d.coarseAbs,0,30,'Absorción de grava');
      check(d.fineMoist,0,50,'Humedad de arena');check(d.coarseMoist,0,50,'Humedad de grava');
      if(!['ssd','od','dry'].includes(d.fineSGBasis)||!['ssd','od','dry'].includes(d.coarseSGBasis))throw new Error('Selecciona la base SSS o seca de cada densidad relativa.');
      const fineSGSSD=d.fineSGBasis==='ssd'?d.fineSG:d.fineSG*(1+d.fineAbs/100),coarseSGSSD=d.coarseSGBasis==='ssd'?d.coarseSG:d.coarseSG*(1+d.coarseAbs/100);
      const fineSGOD=fineSGSSD/(1+d.fineAbs/100),coarseSGOD=coarseSGSSD/(1+d.coarseAbs/100);
      check(d.rodded,800,2200,'Densidad seca compactada'); check(d.fm,1,4.5,'Módulo de finura');
      if(d.rodded>coarseSGOD*1000)throw new Error('La masa unitaria seca compactada supera la densidad de las partículas secas de grava; revisa la base y las unidades.');
      check(d.targetSlump,0,250,'Asentamiento objetivo');
      check(d.reduction,0,40,'Reducción de agua'); check(d.maxWC,0,.9,'Límite a/c'); check(d.minCement,0,700,'Cemento mínimo');check(d.maxCement,0,1000,'Cemento máximo');
      if(d.maxCement>0&&d.minCement>d.maxCement)throw new Error('El cemento mínimo supera el máximo especificado.');
      check(d.admDose,0,5,'Dosificación del aditivo');
      if(d.admDose>0){check(d.admDensity,800,2000,'Densidad del aditivo'); check(d.admWater,0,100,'Agua del aditivo');}
      const admDensity=d.admDose>0?d.admDensity:1000,admWater=d.admDose>0?d.admWater:0;
      check(d.volume,.0001,1e6,'Volumen'); check(d.waste,0,30,'Reserva'); check(d.mixer,1,20000,'Capacidad útil'); check(d.bag,1,100,'Masa de saco');
      ['priceCement','priceFine','priceCoarse','priceWater','priceAdm'].forEach(k=>check(d[k],0,1000,'Precio '+k));
      if(!['0','1','2'].includes(d.slumpBand))throw new Error('Selecciona un intervalo de asentamiento válido; un campo vacío no equivale al primer intervalo.');
      const band=Number(d.slumpBand);
      if(!Number.isInteger(band)||band<0||band>2)throw new Error('Intervalo de asentamiento inválido.');
      const baseWater=d.waterMode==='manual'?check(d.waterManual,80,350,'Agua manual'):d.waterMode==='table'?waterTable[d.entrained?'air':'plain'][band][index]*PCY:NaN;
      if(!isNum(baseWater))throw new Error('Modo de agua desconocido.');
      const water=baseWater*(1-d.reduction/100);
      let wcStrength;
      if(d.wcMode==='manual') wcStrength=check(d.wcManual,.2,.9,'Relación a/c manual');
      else if(d.wcMode==='table') {
        const pts=d.entrained?[[2000,.74],[3000,.59],[4000,.48],[5000,.40]]:[[2000,.82],[3000,.68],[4000,.57],[5000,.48],[6000,.41]];
        try { wcStrength=interpolate(pts,strength.value/PSI); }
        catch {throw new Error('f′cr está fuera de la tabla histórica a/c ('+(2000*PSI).toFixed(1)+'–'+(pts.at(-1)[0]*PSI).toFixed(1)+' MPa). Introduce una a/c de ensayo en modo manual.');}
      } else throw new Error('Modo a/c desconocido.');
      const selectedWC=d.maxWC>0?Math.min(wcStrength,d.maxWC):wcStrength;
      const cement=Math.max(water/selectedWC,d.minCement), actualWC=water/cement;
      if(d.maxCement>0&&cement>d.maxCement+1e-9)throw new Error('El cemento calculado ('+cement.toFixed(2)+' kg/m³) supera el máximo especificado ('+d.maxCement+' kg/m³). No se reduce automáticamente: revisa agua, a/c y restricciones.');
      const coarseFraction=d.coarseMode==='manual'?check(d.coarseManual,.25,.85,'Fracción compactada'):d.coarseMode==='table'?interpolate([2.4,2.6,2.8,3].map((v,i)=>[v,coarseTable[index][i]]),d.fm):NaN;
      if(!isNum(coarseFraction))throw new Error('Modo de grava desconocido.');
      const coarseDry=coarseFraction*d.rodded, coarseSSD=coarseDry*(1+d.coarseAbs/100);
      const admixture=cement*d.admDose/100, admixtureWater=admixture*admWater/100;
      // Vwater includes admixture water; only its remaining volume is added separately.
      const volumes={cement:cement/(d.cementSG*1000),water:water/1000,coarse:coarseSSD/(coarseSGSSD*1000),air:d.air/100,admixture:admixture/admDensity-admixtureWater/1000};
      if(volumes.admixture < -1e-10) throw new Error('La densidad y la fracción de agua del aditivo producen un volumen residual negativo. Revisa la ficha técnica.');
      volumes.fine=1-Object.values(volumes).reduce((a,b)=>a+b,0);
      if(volumes.fine<=0)throw new Error('La suma de cemento, agua, grava, aire y aditivo supera 1 m³. No queda volumen para arena.');
      const fineSSD=volumes.fine*fineSGSSD*1000, fine=moisture(fineSSD,d.fineAbs,d.fineMoist), coarse=moisture(coarseSSD,d.coarseAbs,d.coarseMoist);
      const addedWater=water-fine.free-coarse.free-admixtureWater;
      if(addedWater<0)throw new Error('El agua aportada por áridos y aditivo supera el agua efectiva. Ajusta las humedades o los materiales antes de dosificar.');
      const totalMass=cement+fine.wet+coarse.wet+addedWater+admixture;
      const totalVolume=Object.values(volumes).reduce((a,b)=>a+b,0), batchVolume=d.volume*(1+d.waste/100), batchRatio=batchVolume/(d.mixer/1000),batches=Math.max(1,Math.ceil(batchRatio-8*Number.EPSILON*Math.max(1,batchRatio)));
      const rows=[
        {key:'cement',name:'Cemento',dry:cement,ssd:cement,wet:cement,price:d.priceCement},
        {key:'fine',name:'Arena',...fine,price:d.priceFine},
        {key:'coarse',name:'Grava',...coarse,price:d.priceCoarse},
        {key:'water',name:'Agua a añadir',dry:water+fine.ssd-fine.dry+coarse.ssd-coarse.dry-admixtureWater,ssd:water-admixtureWater,wet:addedWater,price:d.priceWater},
        {key:'admixture',name:'Aditivo líquido',dry:admixture,ssd:admixture,wet:admixture,price:d.priceAdm}
      ];
      const cost=rows.reduce((s,r)=>s+r.wet*r.price,0);
      warnings.push('Predosificación: la resistencia y la trabajabilidad deben comprobarse con mezclas de prueba.');
      warnings.push(d.dataMode==='demo'?'DATOS DE DEMOSTRACIÓN: los valores precargados no representan ensayos reales.':'Datos declarados por el usuario: su trazabilidad y representatividad deben documentarse.');
      warnings.push('Las referencias de ensayo ASTM / NTE INEN no certifican el cumplimiento de sus procedimientos. No se ha establecido una guía específica de dosificación del curso.');
      if(d.waterMode==='table'||d.wcMode==='table'||d.coarseMode==='table')warnings.push('Las tablas automáticas son referencias históricas ACI 211; no representan una implementación íntegra de ACI 211.1-22.');
      if(d.maxWC===0)warnings.push('No se ha definido un límite de a/c por exposición.');
      if(d.minCement===0)warnings.push('No se ha definido contenido mínimo de cemento por especificación.');
      if(!d.exposure||d.exposure==='Sin clasificación declarada'||!d.exposureReference)warnings.push('La exposición y su referencia normativa no están documentadas; no se asignan límites automáticos.');
      if(!d.waterSource||d.waterQuality==='unknown')warnings.push('La procedencia o calidad del agua queda pendiente de documentar y comprobar.');
      if(d.waterMode==='table') {
        const range=[[25.4,50.8],[76.2,101.6],[152.4,177.8]][band];
        if(d.targetSlump<range[0]||d.targetSlump>range[1])warnings.push('El asentamiento objetivo queda fuera de la banda de agua elegida ('+range[0]+'–'+range[1]+' mm); revisa la selección.');
      }
      if(d.reduction>0)warnings.push('La reducción de agua es un dato del usuario y requiere verificación con el aditivo y los materiales reales.');
      if(d.reduction>0&&d.admDose===0)warnings.push('Se declaró reducción de agua sin dosis de aditivo; documenta el origen experimental de esta reducción.');
      if(d.entrained)warnings.push('El aire objetivo se ingresa manualmente según la exposición y se verifica mediante ensayo.');
      if(d.strengthMode==='history')warnings.push('El historial debe corresponder a ensayos independientes y condiciones comparables; no cuentes cilindros individuales como ensayos.');
      if(volumes.fine<.18||volumes.fine>.42)warnings.push('La fracción absoluta de arena es atípica: revisa la combinación de áridos y la trabajabilidad.');
      if(cement>400)warnings.push('Cemento superior a 400 kg/m³: indicador orientativo de contenido relativamente elevado, no límite normativo. Analiza agua, trabajabilidad, áridos y aditivo mediante ensayos; no reduzcas cemento arbitrariamente.');
      if(totalMass<2000||totalMass>2600)warnings.push('La masa teórica queda fuera del intervalo orientativo 2000–2600 kg/m³ de hormigón convencional; comprueba las densidades y el alcance del método.');
      if([d.priceCement,d.priceFine,d.priceCoarse,d.priceWater].some(v=>v===0))warnings.push('Hay precios en cero: el costo puede estar incompleto y no constituye una cotización.');
      const waterRow=rows.find(r=>r.key==='water'),waterBalance={absorbed:fine.ssd-fine.dry+coarse.ssd-coarse.dry,free:fine.free+coarse.free,admixture:admixtureWater,added:addedWater,effective:water,reconstructed:addedWater+fine.free+coarse.free+admixtureWater,dryAdded:waterRow.dry,ssdAdded:waterRow.ssd};
      result={strength,baseWater,water,wcStrength,selectedWC,actualWC,cement,coarseFraction,fine,coarse,fineSGSSD,coarseSGSSD,fineSGOD,coarseSGOD,admixture,admixtureWater,addedWater,waterBalance,volumes,totalVolume,totalMass,rows,cost,batchVolume,batches,perBatch:batchVolume/batches,ratio:[1,fineSSD/cement,coarseSSD/cement,actualWC]};
    } catch(e) {errors.push(e.message);}
    return {ok:errors.length===0,errors,warnings,mathematicalValidated:errors.length===0,experimentalValidated:false,normativeValidated:false,...result};
  }
  function sieve(masses,initial) {
    if(!Array.isArray(masses)||masses.length!==9)throw new Error('Se requieren nueve masas: ocho tamices y fondo.');
    masses.forEach(v=>check(v,0,1e6,'Masa retenida'));check(initial,.01,1e6,'Masa inicial');
    const total=masses.reduce((a,b)=>a+b,0);if(total<=0)throw new Error('Ingresa masas retenidas.');
    let cumulative=0; const rows=masses.map((m,i)=>{const retained=m/initial*100;cumulative+=retained;return {sieve:[9.5,4.75,2.36,1.18,.6,.3,.15,.075,0][i],mass:m,retained,cumulative,passing:100-cumulative};});
    const difference=(total-initial)/initial*100;
    return {rows,total,difference,fm:rows.slice(0,7).reduce((a,r)=>a+r.cumulative,0)/100,valid:Math.abs(difference)<=.3};
  }
  function labMoisture(wet,dry,tare) {check(tare,0,1e8,'Tara');check(dry,tare+.000001,1e8,'Masa seca + tara');check(wet,dry,1e8,'Masa húmeda + tara');return (wet-dry)/(dry-tare)*100;}
  function labCoarse(dry,ssd,submerged) {check(dry,.001,1e8,'Masa seca');check(ssd,dry,1e8,'Masa SSS');check(submerged,0,dry-.000001,'Masa sumergida');return {od:dry/(ssd-submerged),ssd:ssd/(ssd-submerged),apparent:dry/(dry-submerged),abs:(ssd-dry)/dry*100};}
  function labFine(dry,ssd,pycWater,pycSample) {check(dry,.001,1e8,'Masa seca');check(ssd,dry,1e8,'Masa SSS');check(pycWater,.001,1e8,'Picnómetro con agua');check(pycSample,pycWater+.000001,pycWater+dry-.000001,'Picnómetro con muestra y agua');return {od:dry/(pycWater+ssd-pycSample),ssd:ssd/(pycWater+ssd-pycSample),apparent:dry/(pycWater+dry-pycSample),abs:(ssd-dry)/dry*100};}
  function bulkDensity(tare,full,litres) {check(tare,0,1e6,'Tara');check(full,tare+.000001,1e6,'Recipiente lleno');check(litres,.001,1e6,'Volumen del recipiente');return (full-tare)/(litres/1000);}
  function compression(loadKN,diameterMM) {check(loadKN,.001,1e5,'Carga');check(diameterMM,10,1000,'Diámetro');return loadKN*1000/(Math.PI*diameterMM**2/4);}
  function stats(values) {if(!Array.isArray(values)||values.length<2)throw new Error('Ingresa al menos dos resultados de ensayo.');values.forEach(v=>check(v,.01,200,'Resistencia'));const n=values.length,mean=values.reduce((a,b)=>a+b,0)/n,sd=Math.sqrt(values.reduce((s,x)=>s+(x-mean)**2,0)/(n-1)),historyEligible=n>=15&&sd>=.01&&sd<=30,warnings=[];if(n<15)warnings.push('Historial insuficiente: se requieren al menos 15 ensayos independientes comparables.');if(sd<.01)warnings.push('La variabilidad es nula o demasiado pequeña para el modo con historial; revisa los datos y su precisión.');if(sd>30)warnings.push('La desviación supera el alcance admitido por el programa.');warnings.push('Estos estadísticos no demuestran aceptación experimental ni cumplimiento normativo.');return {n,mean,sd,cv:100*sd/mean,historyEligible,warnings,experimentalValidated:false};}
  function trial(r,volume,density) {if(!r.ok)throw new Error('Resuelve los errores del diseño.');check(volume,.0001,100,'Volumen de prueba');check(density,500,4000,'Densidad fresca medida');const mass=r.totalMass*volume,yieldVolume=mass/density;return {mass,yieldVolume,relative:yieldVolume/volume,factor:volume/yieldVolume,rows:r.rows.map(x=>({...x,normalized:x.wet*volume/yieldVolume}))};}
  function cylinders(diameter,height,count,reserve) {check(diameter,20,1000,'Diámetro');check(height,20,3000,'Altura');check(count,1,10000,'Número de probetas');if(!Number.isInteger(count))throw new Error('El número de probetas debe ser entero.');check(reserve,0,30,'Reserva');return Math.PI/4*(diameter/1000)**2*(height/1000)*count*(1+reserve/100);}
  const validate=d=>{const r=calculate(d);return {ok:r.ok,errors:r.errors,warnings:r.warnings};};
  return {defaults,createRealDesign,normalize,required,validate,calculate,moisture,targetStrength,interpolate,sieve,labMoisture,labCoarse,labFine,bulkDensity,compression,stats,trial,cylinders,PSI,PCY,sizes,waterTable,coarseTable};
});
