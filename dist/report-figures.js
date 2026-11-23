/* Figuras SVG vectoriales sin dependencias, red ni valores de demostración implícitos. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.HormigonReportFigures=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const n=(x,d=2)=>Number(x).toLocaleString('es-EC',{maximumFractionDigits:d});
 const colors=['#245b48','#a65e2e','#416b9b','#926b13','#777777','#685288'];
 function svg(title,description,body,height=370){return `<svg xmlns="http://www.w3.org/2000/svg" class="report-chart" viewBox="0 0 760 ${height}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title><desc>${esc(description)}</desc><rect width="760" height="${height}" fill="#fff"/>${body}</svg>`;}
 const text=(x,y,t,extra='')=>`<text x="${x}" y="${y}" font-family="Arial,sans-serif" font-size="12" fill="#17241e" ${extra}>${esc(t)}</text>`;
 const line=(x1,y1,x2,y2,extra='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#aab3ad" ${extra}/>`;
 function bars(items,{title='Comparación de cantidades',unit='',seriesLabels=['Cantidad']}={}){
  const clean=items.filter(x=>Array.isArray(x.values)&&x.values.length&&x.values.every(Number.isFinite));
  if(!clean.length)return '';
  const min=Math.min(0,...clean.flatMap(x=>x.values)),max=Math.max(0,...clean.flatMap(x=>x.values));
  const span=max-min||1,L=170,R=665,T=48,row=46,H=T+clean.length*row+48,x=v=>L+(v-min)/span*(R-L);
  let body='';
  for(let i=0;i<=4;i++){const v=min+span*i/4;body+=line(x(v),T-8,x(v),H-38,'stroke-dasharray="3 3"')+text(x(v),H-18,n(v),'text-anchor="middle"');}
  body+=line(x(0),T-8,x(0),H-38,'stroke="#26382d"');
  clean.forEach((item,i)=>{const y=T+i*row;body+=text(156,y+16,item.label,'text-anchor="end"');item.values.forEach((v,j)=>{const yy=y+j*16;body+=`<rect x="${Math.min(x(0),x(v))}" y="${yy}" width="${Math.max(.5,Math.abs(x(v)-x(0)))}" height="12" fill="${colors[j%colors.length]}" data-value="${v}"/>`+text(Math.min(720,x(v)+5),yy+11,n(v,3));});});
  seriesLabels.forEach((label,i)=>{body+=`<rect x="${L+i*180}" y="12" width="13" height="10" fill="${colors[i%colors.length]}"/>`+text(L+18+i*180,22,label);});
  body+=text(736,H-18,unit,'text-anchor="end"');
  return svg(title,clean.map(i=>i.label+': '+i.values.map(v=>n(v,6)).join(' / ')+' '+unit).join('; '),body,H);
 }
 function grading(g){
  const points=(g.rows||[]).filter(x=>Number.isFinite(x.sieve)&&x.sieve>0&&Number.isFinite(x.passing)).sort((a,b)=>a.sieve-b.sieve);
  if(points.length<2)return '';
  const limits=(g.limits||[]).filter(x=>Number.isFinite(x.sieve)&&x.sieve>0&&Number.isFinite(x.min)&&Number.isFinite(x.max)).sort((a,b)=>a.sieve-b.sieve);
  const sizes=[...points,...limits].map(x=>x.sieve),lo=Math.min(...sizes),hi=Math.max(...sizes);
  if(lo===hi)return '';
  const L=70,R=710,T=35,B=300,x=v=>L+(Math.log10(v)-Math.log10(lo))/(Math.log10(hi)-Math.log10(lo))*(R-L);
  const ymin=Math.min(0,...points.map(p=>p.passing)),ymax=Math.max(100,...points.map(p=>p.passing)),y=v=>B-(v-ymin)/(ymax-ymin)*(B-T);
  let body='';for(let i=0;i<=5;i++){const v=ymin+(ymax-ymin)*i/5;body+=line(L,y(v),R,y(v))+text(L-9,y(v)+4,n(v),'text-anchor="end"');}
  const ticks=[...new Set(points.map(p=>p.sieve))];ticks.forEach((v,i)=>{body+=line(x(v),T,x(v),B,'stroke-dasharray="2 4"')+text(x(v),B+19+(i%2)*14,n(v,3),'text-anchor="middle"');});
  if(limits.length>1){const polygon=[...limits.map(p=>`${x(p.sieve)},${y(p.max)}`),...limits.slice().reverse().map(p=>`${x(p.sieve)},${y(p.min)}`)].join(' ');body+=`<polygon points="${polygon}" fill="#dce6de" stroke="#7a927d" stroke-dasharray="5 3"/>`;}
  body+=`<polyline points="${points.map(p=>`${x(p.sieve)},${y(p.passing)}`).join(' ')}" fill="none" stroke="#245b48" stroke-width="2"/>`;
  for(const p of points)body+=`<circle cx="${x(p.sieve)}" cy="${y(p.passing)}" r="3.5" fill="#245b48" data-sieve="${p.sieve}" data-passing="${p.passing}"><title>${esc(n(p.sieve,3)+' mm: '+n(p.passing,3)+' % pasa')}</title></circle>`;
  body+=text(380,365,'Abertura del tamiz (mm), escala logarítmica','text-anchor="middle"')+text(18,170,'Porcentaje que pasa (%)','transform="rotate(-90 18 170)" text-anchor="middle"');
  return svg('Curva granulométrica — '+(g.kind==='coarse'?'agregado grueso':'agregado fino'),'Curva de porcentajes que pasan frente a tamiz logarítmico. El fondo se excluye del eje. La banda representa exclusivamente los límites suministrados.',body,385);
 }
 function strength(batchId,points){
  const p=points.filter(x=>Number.isFinite(x.age)&&x.age>0&&Number.isFinite(x.strength)&&x.strength>0);
  if(!p.length)return '';
  const L=75,R=710,T=30,B=285,xmax=Math.max(1,...p.map(x=>x.age))*1.08,ymax=Math.max(...p.map(x=>x.strength))*1.15;
  const x=v=>L+v/xmax*(R-L),y=v=>B-v/ymax*(B-T);
  let body='';for(let i=0;i<=5;i++){const yy=ymax*i/5,xx=xmax*i/5;body+=line(L,y(yy),R,y(yy))+text(L-10,y(yy)+4,n(yy,1),'text-anchor="end"')+line(x(xx),T,x(xx),B,'stroke-dasharray="2 4"')+text(x(xx),B+20,n(xx,1),'text-anchor="middle"');}
  p.forEach((v,i)=>{body+=`<circle cx="${x(v.age)}" cy="${y(v.strength)}" r="4.5" stroke="#fff" fill="#245b48" data-age="${v.age}" data-strength="${v.strength}"><title>${esc(v.id+': '+n(v.age)+' días, '+n(v.strength,3)+' MPa')}</title></circle>`;if(p.length<=12)body+=text(x(v.age)+7,y(v.strength)+(i%2?-8:14),v.id);});
  body+=text(390,335,'Edad al ensayo (días)','text-anchor="middle"')+text(20,165,'Resistencia individual (MPa)','transform="rotate(-90 20 165)" text-anchor="middle"');
  return svg('Resistencia frente a edad · amasada '+batchId,'Resultados individuales de la misma amasada. No se ajusta curva ni se predice resistencia a edades sin ensayos.',body,355);
 }
 return {bars,grading,strength};
});
