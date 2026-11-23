(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./lab-tests.js'),require('./workbench.js'));else root.HormigonLabUI=factory(root.HormigonLabTests,root.HormigonWorkbench);})(typeof globalThis!=='undefined'?globalThis:this,function(L,V){
'use strict';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=x=>typeof x==='number'&&Number.isFinite(x)?x.toLocaleString('es-EC',{maximumFractionDigits:6}):String(x??'—');
const categories={aggregates:'Áridos',fresh:'Hormigón fresco',hardened:'Hormigón endurecido'};
function field(kind,f,value,meta=false){const id='lab-'+kind+'-'+f.key,attr=' id="'+id+'" data-lab-kind="'+kind+'" '+(meta?'data-lab-meta':'data-lab-field')+'="'+f.key+'" aria-describedby="tip-'+id+'"';
 let input=f.type==='select'?'<select'+attr+'><option value="">Selecciona una opción</option>'+(f.options||[]).map(([v,t])=>'<option value="'+esc(v)+'" '+(String(value)===String(v)?'selected':'')+'>'+esc(t)+'</option>').join('')+'</select>':
 '<input'+attr+' type="'+(f.type||'text')+'" '+(f.type==='number'?'step="any" inputmode="decimal"':'maxlength="500"')+' value="'+esc(value)+'">';
 return '<div class="field">'+V.caption(id,f.label+(f.required?' *':''),f.help||'Copia el dato medido en tu hoja de ensayo; conserva la unidad indicada.')+'<div class="input-wrap">'+input+(f.unit?'<span class="unit">'+esc(f.unit)+'</span>':'')+'</div></div>';
}
function results(r){return '<div class="lab-result-grid">'+r.rows.map(x=>'<div><span>'+esc(x.label)+'</span><strong>'+esc(fmt(x.value))+' <small>'+esc(x.unit)+'</small></strong></div>').join('')+'</div>'+
 (r.warnings.length?'<ul class="lab-warnings">'+r.warnings.map(w=>'<li>'+esc(w)+'</li>').join('')+'</ul>':'')+
 '<details class="lab-equations"><summary>Ver fórmulas y sustitución</summary>'+r.equations.map(x=>'<p><b>'+esc(x.label)+'</b><br>'+esc(x.expression)+'<br>'+esc(x.substitution)+'<br><strong>'+esc(fmt(x.value))+' '+esc(x.unit)+'</strong></p>').join('')+'</details>';
}
function editor(kind,draft={},data,journal=[]){const def=L.kinds[kind],values=draft.values||{};let r,error='';try{r=L.calculate(kind,values);}catch(e){error=e.message;}
 const metadata=[{key:'sample',label:'Código de muestra / ensayo',type:'text',required:true,help:'Identifica la muestra real. Ejemplo orientativo: ARE-01 o CIL-07. El ejemplo no se rellena automáticamente.'},{key:'date',label:'Fecha del ensayo',type:'date',required:true,help:'Fecha en que se ejecutó el ensayo.'},{key:'source',label:'Procedencia del registro',type:'text',required:true,help:'Indica la hoja de laboratorio, equipo o responsable que respalda estas mediciones.'}];
 return '<section class="card lab-editor"><div class="card-head"><div><h2>'+esc(def.title)+'</h2><p>'+esc(def.standard)+'</p></div><span class="badge">'+(data.dataMode==='real'?'Datos medidos':'Práctica de demostración')+'</span></div><div class="card-body"><p class="tiny muted">Los campos con * son necesarios para registrar el ensayo. Las cantidades se ingresan en las unidades indicadas.</p><div class="fields">'+metadata.map(f=>field(kind,f,draft[f.key]??(f.key==='date'?V.today():''),true)).join('')+
 field(kind,{key:'batchId',label:'Amasada vinculada (opcional)',type:'select',options:journal.map(b=>[b.id,b.id+' · '+b.date]),help:'Vincula únicamente la amasada de la que procede la muestra. Si no corresponde, deja este campo vacío.'},draft.batchId,true)+'</div><hr class="lab-divider"><div class="fields">'+def.fields.map(f=>field(kind,f,values[f.key])).join('')+'</div>'+
 (r?results(r):'<p class="inline-note" role="status">'+esc(error)+'</p>')+'<div class="toolbar"><button type="button" class="primary" data-action="record-lab" '+(!r?'disabled':'')+'>Guardar ensayo en el proyecto</button></div><p class="tiny muted">Guardar conserva estas mediciones como un registro independiente. No modifica la dosificación ni las amasadas anteriores.</p>'+
 (typeof def.source==='string'&&/^https:\/\//.test(def.source)?'<p class="tiny"><a href="'+esc(def.source)+'" target="_blank" rel="noopener noreferrer">Consultar referencia del cálculo ↗</a></p>':'')+'</div></section>';
}
function records(items,category){const rows=items.filter(x=>L.kinds[x.kind]?.category===category);if(!rows.length)return '<div class="inline-note">Todavía no hay ensayos registrados en este apartado.</div>';
 return '<section class="card"><div class="card-head"><div><h2>Ensayos guardados · '+rows.length+'</h2><p>Entradas originales y resultados recalculados. Se incluyen en el respaldo JSON.</p></div></div><div class="card-body">'+rows.map(x=>{let r;try{r=L.calculate(x.kind,x.values);}catch{return '<p>Registro no calculable: '+esc(x.sample)+'</p>';}
 return '<details class="lab-record"><summary>'+esc(x.sample)+' · '+esc(L.kinds[x.kind].title)+' · '+esc(x.date)+'</summary><p>'+esc(x.source)+' · '+(x.mode==='demo'?'DEMOSTRACIÓN':'Mediciones declaradas')+(x.batchId?' · Amasada '+esc(x.batchId):'')+'</p>'+results(r)+'</details>';}).join('')+'</div></section>';
}
return {categories,editor,records,results};
});
