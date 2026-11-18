const test=require('node:test'),assert=require('node:assert/strict'),C=require('../dist/compare.js');
test('comparador 21 y28 usa resultados independientes y diferencia B menos A',()=>{
 const a=C.scenario(21),b=C.scenario(28),before=JSON.stringify([a,b]),c=C.compare(a,b);
 assert.ok(c.left.ok&&c.right.ok);const cement=c.rows.find(x=>x.label==='Cemento');
 assert.ok(Math.abs(cement.a-403.4279664552924)<1e-9);assert.ok(Math.abs(cement.b-436.8694168246345)<1e-9);
 assert.equal(cement.delta,cement.b-cement.a);assert.equal(JSON.stringify([a,b]),before);
});
test('35 MPa se bloquea sin inventar cantidades o diferencias',()=>{
 const c=C.compare(C.scenario(28),C.scenario(35));assert.equal(c.right.ok,false);
 assert.ok(c.rows.every(x=>x.b===null&&x.delta===null));assert.ok(c.rows.every(x=>Number.isFinite(x.a)));
});
test('versiones iguales tienen diferencia cero y escenarios no comparten masas',()=>{
 const a=C.scenario(28),b=C.scenario(28);a.sieves[0]=999;assert.equal(b.sieves[0],0);
 assert.ok(C.compare(b,b).rows.every(x=>x.delta===0));assert.throws(()=>C.scenario(42));
});
