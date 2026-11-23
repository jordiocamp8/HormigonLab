const fs=require('node:fs'),path=require('node:path');
const dist=path.join(__dirname,'dist'), read=n=>fs.readFileSync(path.join(dist,n),'utf8');
let html=read('index.html').replace('<link rel="stylesheet" href="style.css">',()=>'<style>'+read('style.css')+'</style>');
for(const file of ['engine.js', 'grading.js', 'help.js', 'fieldwork.js', 'workbench.js', 'lab-tests.js', 'lab-records.js', 'lab-ui.js', 'essay-guides.js', 'project.js', 'compare.js', 'report-figures.js', 'report.js', 'app.js'])html=html.replace('<script src="'+file+'"></script>',()=>'<script>'+read(file).replace(/<\/script/gi,'<\\/script')+'</script>');
fs.writeFileSync(path.join(dist,'HormigonLab-portatil.html'),html);
fs.writeFileSync(path.join(__dirname,'index.html'),html.replace('<head>',()=>'<head>'+fs.readFileSync(path.join(__dirname,'site-head.html'),'utf8')));
console.log('Generados: index.html para GitHub Pages y dist/HormigonLab-portatil.html para uso sin conexión.');
