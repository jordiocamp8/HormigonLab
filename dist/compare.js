(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./engine.js'));else root.HormigonCompare=factory(root.Hormigon);})(typeof globalThis!=='undefined'?globalThis:this,function(E){
  'use strict';
  const metrics=[
    ['Resistencia especificada','MPa',d=>d.fc],
    ['Resistencia media requerida','MPa',(_,r)=>r.strength.value],
    ['Cemento','kg/m³',(_,r)=>r.cement],
    ['Agua efectiva','kg/m³',(_,r)=>r.water],
    ['Agua a añadir','kg/m³',(_,r)=>r.addedWater],
    ['Arena húmeda','kg/m³',(_,r)=>r.fine.wet],
    ['Grava húmeda','kg/m³',(_,r)=>r.coarse.wet],
    ['Aditivo','kg/m³',(_,r)=>r.admixture],
    ['Relación a/c efectiva','kg/kg',(_,r)=>r.actualWC],
    ['Costo de materiales','USD/m³',(_,r)=>r.cost],
    ['Masa teórica','kg/m³',(_,r)=>r.totalMass],
    ['Volumen absoluto','m³/m³',(_,r)=>r.totalVolume]
  ];
  function scenario(fc){if(![21,28,35].includes(fc))throw new Error('Escenario desconocido.');return {...E.defaults,sieves:[...E.defaults.sieves],fc,name:'Demostración · '+fc+' MPa'};}
  function compare(a,b){
    const left=E.calculate(a),right=E.calculate(b);
    return {left,right,rows:metrics.map(([label,unit,get])=>{const av=left.ok?get(a,left):null,bv=right.ok?get(b,right):null;return {label,unit,a:av,b:bv,delta:av===null||bv===null?null:bv-av};})};
  }
  return {scenario,compare};
});
