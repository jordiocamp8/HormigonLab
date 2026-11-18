// Integración de controladores reales en un DOM mínimo, sin navegador ni red.
// Complementa (no sustituye) la revisión visual en el navegador.
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const E=require('../dist/engine.js'),P=require('../dist/project.js');
function start(initial=null,portable=false,blockedStorage=false){
 const events={},nodes={},downloads=[],urls=new Map(),storage=new Map(),timers=[];
 if(initial)storage.set('hormigonlab.v1',JSON.stringify(initial));
 const node=id=>nodes[id]||(nodes[id]={innerHTML:'',textContent:'',classList:{add(){},remove(){}},addEventListener:(name,fn)=>events[id+':'+name]=fn,click(){},focus(){}});
 const document={querySelector:node,getElementById:()=>null,activeElement:{id:'',dataset:{},selectionStart:null},addEventListener:(name,fn)=>events[name]=fn,body:{appendChild(){}},createElement:()=>({click(){downloads.push({name:this.download,blob:urls.get(this.href)});},remove(){}})};
 const localStorage={getItem:k=>storage.get(k)||null,setItem(k,v){if(blockedStorage)throw Error('Storage blocked');storage.set(k,v);}};
 const context={document,localStorage,console,Blob,URL:{createObjectURL:b=>{const id='blob:'+urls.size;urls.set(id,b);return id;},revokeObjectURL(){}},setTimeout(fn,ms){timers.push({fn,ms});return timers.length;},clearTimeout(id){if(timers[id-1])timers[id-1].ms=0;},scrollTo(){},addEventListener(){},print(){context.printed=true;},confirm:()=>false};
 context.window=context;vm.createContext(context);
 const files=['engine.js','grading.js','help.js','fieldwork.js','workbench.js','project.js','compare.js','report.js','app.js'];
 if(portable){
  const html=fs.readFileSync(path.join(__dirname,'../dist/HormigonLab-portatil.html'),'utf8');
  assert.doesNotMatch(html,/<script[^>]+src=|<link[^>]+stylesheet|@import|fetch\(|XMLHttpRequest/);
  const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];assert.equal(scripts.length,files.length);
  scripts.forEach((m,i)=>vm.runInContext(m[1],context,{filename:files[i]}));
 }else files.forEach(file=>vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist',file),'utf8'),context,{filename:file}));
 const click=dataset=>events.click({target:{closest:()=>({dataset,disabled:false})}});
 const input=(dataset,value,tagName='INPUT')=>{const el={dataset,value:String(value),tagName,hasAttribute:k=>k==='data-stats'&&dataset.stats!==undefined};events[tagName==='SELECT'?'change':'input']({target:el});if(tagName!=='SELECT')timers.filter(t=>t.ms===350).forEach(t=>{t.ms=0;t.fn();});};
 return {click,input,nodes,storage,downloads,context,events,html:()=>node('#app').innerHTML,state:()=>JSON.parse(storage.get('hormigonlab.v1'))};
}
test('las ocho secciones renderizan con los módulos reales',()=>{
 const app=start();for(const page of ['design','materials','lab','results','batch','trial','projects','guide']){app.click({page});assert.match(app.html(),/<h1>/);assert.doesNotMatch(app.html(),/NaN|undefined/);}
});
test('edición de input recalcula y autoguarda; blanco bloquea resultados',()=>{
 const app=start();app.input({field:'fc'},'21');assert.equal(app.state().data.fc,21);assert.match(app.html(),/403,4/);
 app.input({field:'fc'},'');app.click({page:'results'});assert.equal(app.state().data.fc,null);assert.match(app.html(),/Falta un valor numérico/);assert.doesNotMatch(app.html(),/Dosificación por metro cúbico/);
});
test('diseño real deja ensayos vacíos y cambiar TMN o aire no inventa aire objetivo',()=>{
 const app=start();app.click({action:'new-real'});assert.equal(app.state().data.dataMode,'real');assert.equal(app.state().projects.length,1);
 app.input({field:'size'},'19','SELECT');app.input({field:'entrained'},'true','SELECT');assert.equal(app.state().data.air,null);
 app.click({page:'materials'});assert.match(app.html(),/value=""/);app.click({page:'results'});assert.match(app.html(),/Corrige los datos/);
});
test('laboratorio transfiere humedad, densidades, absorción, masa unitaria y MF',()=>{
 const app=start();app.click({action:'moist-fine'});assert.equal(app.state().data.fineMoist,4.5);
 app.click({action:'apply-coarse'});assert.equal(app.state().data.coarseSG,2520/950);assert.equal(app.state().data.coarseAbs,.8);assert.equal(app.state().data.coarseSGBasis,'ssd');
 app.click({action:'apply-fine'});assert.equal(app.state().data.fineSG,500/191);assert.equal(app.state().data.fineSGBasis,'ssd');
 app.click({action:'apply-bulk'});assert.equal(app.state().data.rodded,1600);
 app.click({action:'apply-fm'});assert.equal(app.state().data.fm,2.76);
});
test('no transfiere MF incompleto ni aplica historial inelegible',()=>{
 const app=start();app.input({sieve:'0'},'10');app.input({sieve:'8'},'5');
 app.click({action:'apply-fm'});assert.equal(app.state().data.fm,2.8);assert.match(app.nodes['#toast'].textContent,/revisa la granulometría/);
 app.input({stats:''},Array(15).fill('30').join('\n'));app.click({action:'apply-stats'});assert.equal(app.state().data.strengthMode,'noHistory');
});
test('guardar y recuperar conserva versiones y guarda la mezcla que se estaba editando',()=>{
 const app=start();app.click({action:'save'});const id=app.state().projects[0].id;
 app.input({field:'name'},'Otra mezcla');app.click({load:id});const saved=app.state();assert.equal(saved.projects.length,2);assert.equal(saved.projects[0].data.name,'Otra mezcla');assert.equal(saved.data.name,E.defaults.name);
 const restored=start(saved);assert.match(restored.html(),/Mezcla de práctica/);restored.click({page:'projects'});assert.match(restored.html(),/Otra mezcla/);
});
test('controladores JSON CSV HTML e impresión usan datos recalculados',async()=>{
 const app=start();app.input({field:'fc'},'21');for(const action of ['export','csv','report','print'])app.click({action});
 assert.equal(app.downloads.length,3);
 const [json,csv,html]=await Promise.all(app.downloads.map(d=>d.blob.text()));
 assert.equal(P.parse(JSON.parse(json)).data.fc,21);
 assert.match(csv,/403\.427966455292/);assert.match(html,/403,427966/);assert.match(app.nodes['#print-report'].innerHTML,/403,427966/);assert.equal(app.context.printed,true);
});
test('importación válida conserva versión previa; importación errónea no la modifica',async()=>{
 const app=start();const payload=P.pack({...E.defaults,name:'Importado',fc:21});
 const event=text=>({target:{files:[{size:text.length,text:async()=>text}],value:'test.json'}});
 await app.events['#import-file:change'](event(JSON.stringify(payload)));assert.equal(app.state().data.name,'Importado');assert.equal(app.state().projects.length,1);
 const before=JSON.stringify(app.state());await app.events['#import-file:change'](event('{"schemaVersion":99}'));assert.equal(JSON.stringify(app.state()),before);assert.match(app.nodes['#toast'].textContent,/No se importó/);
});
test('comparador permite escenarios bloqueados sin romper biblioteca',()=>{
 const app=start();app.click({page:'projects'});app.input({compare:'b'},'scenario35','SELECT');assert.match(app.html(),/f′cr está fuera de la tabla/);assert.match(app.html(),/Comparador de dos escenarios/);
});
test('almacenamiento bloqueado permite trabajar sin anunciar guardado exitoso',()=>{
 const app=start(null,false,true);app.click({action:'save'});assert.match(app.html(),/Almacenamiento no disponible/);assert.match(app.nodes['#toast'].textContent,/No se pudo guardar/);
});
test('versiones corruptas se respaldan y no rompen la biblioteca',()=>{
 const original={schemaVersion:2,data:E.defaults,projects:[{id:'bad',schemaVersion:2,data:{fc:'error'}}]};
 const app=start(original);app.click({page:'projects'});assert.match(app.html(),/Comparador de dos escenarios/);assert.equal(app.storage.get('hormigonlab.v1.recovery'),JSON.stringify(original));
});
test('portátil ejecuta las ocho secciones sin recursos externos y produce exportaciones',async()=>{
 const app=start(null,true);for(const page of ['design','materials','lab','results','batch','trial','projects','guide']){app.click({page});assert.match(app.html(),/<h1>/);}
 app.click({action:'report'});assert.equal(app.downloads.length,1);assert.match(await app.downloads[0].blob.text(),/436,869417/);
});

test('cuota agotada: abrir, importar, iniciar o guardar nunca reemplaza el diseño sin su respaldo',async()=>{
 const prior=P.saveVersion([],{data:{...E.defaults,name:'Archivado'}},{id:'previo'});
 const initial={schemaVersion:2,data:{...E.defaults,name:'Actual'},projects:prior};
 const app=start(initial,false,true);
 app.input({field:'name'},'Edición todavía sin persistir');
 for(const dataset of [{action:'save'},{action:'new-real'},{action:'demo'},{load:'previo'}]){
  app.click(dataset);assert.match(app.nodes['#toast'].textContent,/No se pudo guardar/);
  assert.deepEqual(app.state(),initial);
 }
 const payload=JSON.stringify(P.pack({...E.defaults,name:'Una importación'}));
 await app.events['#import-file:change']({target:{files:[{size:payload.length,text:async()=>payload}],value:'test.json'}});
 assert.match(app.nodes['#toast'].textContent,/No se pudo guardar/);assert.deepEqual(app.state(),initial);
 app.click({action:'export'});const exported=JSON.parse(await app.downloads[0].blob.text());
 assert.equal(exported.data.name,'Edición todavía sin persistir');
 app.click({page:'projects'});assert.match(app.html(),/1 versión en este navegador/);
});
test('al aplicar arena de la biblioteca no se reutilizan MF o humedad previos; el respaldo contiene las pesadas',()=>{
 const F=require('../dist/fieldwork.js');
 const d={...E.defaults,experimentalRecorded:true},m=F.material('fine',{...d,fm:2.99},'Arena nueva','Cantera B','2026-11-07');
 const g=P.defaultGrading();g.fine.profileId='inen872-2011-fine';g.coarse.initial=1000;g.coarse.masses=[0,0,250,350,200,150,40,10];
 const app=start({schemaVersion:3,data:d,gradingState:g,materials:[m],projects:[]});app.click({material:'0'});
 const state=app.state();assert.equal(state.data.fm,2.99);assert.equal(state.data.fineMoist,null);
 assert.deepEqual(state.data.sieves,Array(9).fill(null));assert.equal(state.data.sieveInitial,null);
 for(const k of ['labWet','labDry','labTare','labFineDry','labFineSSD','labPycWater','labPycSample'])assert.equal(state.data[k],null,k);
 assert.equal(state.data.labCoarseDry,E.defaults.labCoarseDry);assert.deepEqual(state.gradingState.coarse,g.coarse);
 assert.equal(state.data.experimentalRecorded,false);assert.equal(state.projects.length,1);
 assert.deepEqual(state.projects[0].data.sieves,E.defaults.sieves);assert.equal(state.projects[0].data.labWet,E.defaults.labWet);
 app.click({action:'apply-fm'});assert.equal(app.state().data.fm,2.99);
 app.click({action:'moist-fine'});assert.equal(app.state().data.fineMoist,null);
});
test('al aplicar grava se respalda el ensayo grueso y se conserva el análisis de arena',()=>{
 const F=require('../dist/fieldwork.js');const d={...E.defaults},m=F.material('coarse',d,'Grava B','Banco B','2026-11-07');
 const g=P.defaultGrading();g.fine.profileId='inen872-2011-fine';g.coarse.initial=1000;g.coarse.masses=[0,0,250,350,200,150,40,10];
 const app=start({schemaVersion:3,data:d,gradingState:g,materials:[m],projects:[]});app.click({material:'0'});
 const state=app.state();assert.equal(state.data.coarseMoist,null);assert.deepEqual(state.data.sieves,E.defaults.sieves);
 assert.equal(state.data.labFineDry,E.defaults.labFineDry);assert.deepEqual(state.gradingState.fine,g.fine);
 for(const k of ['labCoarseDry','labCoarseSSD','labSubmerged','labContainer','labContainerFull','labContainerLitres','labWet','labDry','labTare'])assert.equal(state.data[k],null,k);
 assert.deepEqual(state.gradingState.coarse,P.defaultGrading().coarse);assert.deepEqual(state.projects[0].gradingState.coarse,g.coarse);
});


test('respaldo UTF-8 superior a 2 MiB: exportación e importación reales conservan las sesenta amasadas',async()=>{
 const F=require('../dist/fieldwork.js'),d={...E.defaults,notes:'á'.repeat(20000)};
 const b=F.batch(d,{id:'B',date:'2026-11-07',volume:.03,measured:{cement:12,fine:20,coarse:30,water:5,admixture:0}});
 const journal=Array.from({length:60},(_,i)=>({...b,id:'B-'+i})),source=start({schemaVersion:3,data:d,journal,projects:[]});
 source.click({action:'export'});assert.equal(source.downloads.length,1);
 const blob=source.downloads[0].blob;assert.ok(blob.size>2*1024*1024&&blob.size<=P.backupLimitBytes);
 const destination=start();await destination.events['#import-file:change']({target:{files:[blob],value:'grande.json'}});
 assert.deepEqual(destination.state().journal,journal);assert.equal(destination.state().data.notes,d.notes);
});
test('límite simétrico de 16 MiB: no se descarga un respaldo sobredimensionado ni se lee su equivalente al importar',async()=>{
 const F=require('../dist/fieldwork.js'),large='á'.repeat(20000),d={...E.defaults};
 for(const k of ['name','reference','author','notes','objective','cementSource','waterSource'])d[k]=large;
 const b=F.batch(d,{id:'B',date:'2026-11-07',volume:.03,measured:{cement:12,fine:20,coarse:30,water:5,admixture:0}});
 const journal=Array.from({length:60},(_,i)=>({...b,id:'B-'+i})),app=start({schemaVersion:3,data:E.defaults,journal,projects:[]});
 app.click({action:'export'});assert.equal(app.downloads.length,0);assert.match(app.nodes['#toast'].textContent,/16 MiB/);
 assert.doesNotThrow(()=>P.checkBackupSize(16*1024*1024));
 let read=false;await app.events['#import-file:change']({target:{files:[{size:16*1024*1024+1,text(){read=true;}}],value:'exceso.json'}});
 assert.equal(read,false);assert.match(app.nodes['#toast'].textContent,/No se importó: .*16 MiB/);
});
