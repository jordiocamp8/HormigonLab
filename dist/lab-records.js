/* Registro de ensayos: solo entradas y procedencia; los resultados se recalculan. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./lab-tests.js'));
  else root.HormigonLabRecords=factory(root.HormigonLabTests);
})(typeof globalThis!=='undefined'?globalThis:this,function(L){
  'use strict';
  const recordLimit=200,clone=x=>JSON.parse(JSON.stringify(x));
  function object(x,label){
    if(!x||typeof x!=='object'||Array.isArray(x))throw new Error(label+': se requiere un objeto.');
    return x;
  }
  function text(x,label,max,required=false){
    if(x===undefined&&!required)return '';
    if(typeof x!=='string'||x.length>max||required&&!x.trim())throw new Error(label+': ingresa '+(required?'un texto no vacío':'texto')+' de hasta '+max+' caracteres.');
    return x.trim();
  }
  function kindKey(kind){
    if(typeof kind!=='string'||!Object.hasOwn(L.kinds,kind))throw new Error('Tipo de ensayo desconocido.');
    return kind;
  }
  function actualDate(value){
    const d=text(value,'Fecha del ensayo',10,true);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!Number.isFinite(Date.parse(d+'T12:00:00Z'))||new Date(d+'T12:00:00Z').toISOString().slice(0,10)!==d)throw new Error('Fecha del ensayo: ingresa una fecha válida en formato AAAA-MM-DD.');
    return d;
  }
  function create(kind,values,meta){
    kindKey(kind);object(meta,'Identificación del ensayo');
    const id=text(meta.id,'Identificador del registro',160,true),sample=text(meta.sample,'Código de muestra',160,true),source=text(meta.source,'Procedencia o referencia del ensayo',1000,true);
    if(!['real','demo'].includes(meta.mode))throw new Error('Declara si el ensayo contiene datos reales o de demostración.');
    const date=actualDate(meta.date),batchId=text(meta.batchId,'Amasada vinculada',160);
    object(values,'Datos del ensayo');
    const clean=L.validateValues(kind,values);
    const result=L.calculate(kind,clean);
    if(result&&result.ok===false)throw new Error('No se puede registrar el ensayo: '+(result.errors||['datos incompletos o inválidos']).join(' '));
    return {id,kind,date,sample,source,mode:meta.mode,batchId,values:clone(clean)};
  }
  function empty(){return {drafts:{},records:[]};}
  function normalize(input){
    if(input===undefined)return empty();
    object(input,'Estado del laboratorio');
    const drafts={},rawDrafts=input.drafts===undefined?{}:object(input.drafts,'Borradores de laboratorio');
    for(const [kind,entry] of Object.entries(rawDrafts)){
      kindKey(kind);object(entry,'Borrador de ensayo');
      const values=entry.values===undefined?{}:object(entry.values,'Valores del borrador');
      drafts[kind]={values:clone(L.validateValues(kind,values,{partial:true})),sample:text(entry.sample,'Código de muestra',160),date:text(entry.date,'Fecha del borrador',32),source:text(entry.source,'Procedencia del borrador',1000),batchId:text(entry.batchId,'Amasada vinculada',160)};
    }
    const rawRecords=input.records===undefined?[]:input.records;
    if(!Array.isArray(rawRecords)||rawRecords.length>recordLimit)throw new Error('El laboratorio admite hasta '+recordLimit+' registros por proyecto.');
    const records=rawRecords.map(entry=>{object(entry,'Registro de ensayo');return create(entry.kind,entry.values,entry);});
    const ids=new Set();for(const entry of records){const key=entry.id.toLowerCase();if(ids.has(key))throw new Error('Identificador de registro de ensayo repetido: '+entry.id+'.');ids.add(key);}
    return {drafts,records};
  }
  return {create,normalize,empty,recordLimit};
});
