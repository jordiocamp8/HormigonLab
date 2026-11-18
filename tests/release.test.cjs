const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8').replace(/\r\n/g,'\n');
test('la página publicada y el portátil incluyen exactamente los módulos y estilos probados',()=>{
 const portable=read('dist/HormigonLab-portatil.html'),site=read('index.html'),template=read('dist/index.html');
 const files=[...template.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
 assert.ok(files.includes('fieldwork.js')&&files.includes('workbench.js')&&files.includes('help.js'));
 const inline=[...portable.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);assert.equal(inline.length,files.length);
 files.forEach((f,i)=>assert.equal(inline[i],read('dist/'+f).replace(/<\/script/gi,'<\\/script'),f+' requiere regeneración'));
 assert.ok(portable.includes('<style>'+read('dist/style.css')+'</style>'));
 assert.equal(site.replace(read('site-head.html'),''),portable);
 assert.match(site,/href="\.\/favicon.png"/);assert.doesNotMatch(portable,/googletagmanager\.com/);
});
test('una amasada importada no admite metadatos de diseño con tipo incorrecto',()=>{
 const E=require('../dist/engine.js'),F=require('../dist/fieldwork.js');
 const x={id:'A',date:'2026-11-08',volume:.03,measured:{cement:12,fine:20,coarse:32,water:5,admixture:0}};
 for(const patch of [{name:{}},{notes:[]},{sieves:[{}]}])assert.throws(()=>F.batch({...E.defaults,...patch},x),/diseño de la amasada/);
});
