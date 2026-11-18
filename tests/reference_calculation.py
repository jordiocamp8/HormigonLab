"""Referencia independiente del ejemplo de 28 MPa.
No importa JavaScript ni lee resultados del motor. Decimal: 45 cifras.
Ejecutar: python tests/reference_calculation.py
"""
from decimal import Decimal as D, getcontext
import json
getcontext().prec = 45
q = D("0.006894757293168361")
pcy = D("0.45359237") / D("0.9144") ** 3
fcr = D(28) + 1200*q
water = 340*pcy
wc = D(".48") + (D(".41")-D(".48"))*(fcr/q-5000)/1000
cement = water/wc
coarse_dry = D(".62")*1600
coarse_ssd = coarse_dry*D("1.008")
vc = cement/D(3150)
vw = water/1000
vg = coarse_ssd/D(2650)
va = 1-vc-vw-vg-D(".02")
fine_ssd = va*2620
fine_dry = fine_ssd/D("1.012")
fine_wet = fine_dry*D("1.045")
coarse_wet = coarse_dry*D("1.011")
free_fine = fine_wet-fine_ssd
free_coarse = coarse_wet-coarse_ssd
added = water-free_fine-free_coarse
dry_added = water+fine_ssd-fine_dry+coarse_ssd-coarse_dry
mass = cement+fine_wet+coarse_wet+added
cost = cement*D(".18")+fine_wet*D(".018")+coarse_wet*D(".022")+added*D(".002")
assert abs((vc+vw+vg+va+D(".02"))-1) < D("1e-40")
assert abs(added+free_fine+free_coarse-water) < D("1e-40")
result = dict(fcr=fcr, water=water, wc=wc, cement=cement,
              coarseDry=coarse_dry, coarseSSD=coarse_ssd, coarseWet=coarse_wet,
              fineSSD=fine_ssd, fineDry=fine_dry, fineWet=fine_wet,
              freeWater=free_fine+free_coarse, addedWater=added,
              dryAddedWater=dry_added, totalMass=mass, totalVolume=vc+vw+vg+va+D(".02"), cost=cost)
print(json.dumps({key:str(value) for key,value in result.items()}, indent=2))
