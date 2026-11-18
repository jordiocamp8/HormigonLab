(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HormigonGrading = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Numerical comparison tolerance only; this is NOT a laboratory tolerance.
  const EPS = 1e-9;
  const referenceUrl = 'https://studylib.es/doc/9536391/nte-inen-872---%C3%A1ridos-para-hormig%C3%B3n.-requisitos';
  const methodUrl = 'https://awsassets.panda.org/downloads/fz08_producto_2_marcelo_castillo_corregido___anexo.pdf';
  const revisionUrl = 'https://www.registroficial.gob.ec/registro-oficial-no-318-21/';
  const defaultSieves = {
    fine: [9.5, 4.75, 2.36, 1.18, .6, .3, .15, .075, 0],
    coarse: [37.5, 25, 19, 12.5, 9.5, 4.75, 2.36, 0]
  };
  const fineSeries = [9.5, 4.75, 2.36, 1.18, .6, .3, .15];
  const fmSeries = [150, 75, 37.5, 19, 9.5, 4.75, 2.36, 1.18, .6, .3, .15];
  const limits = values => values.map(([sieve, min, max]) => ({sieve, min, max}));
  const historicalNote = 'Referencia histórica de 2011. La segunda revisión de NTE INEN 872 se oficializó en julio de 2026; su texto no se ha cotejado. Esta comparación no acredita conformidad con la edición de 2026.';
  const profiles = [
    {id: 'none', label: 'Sin envolvente: solo cálculo', kind: 'any', sieves: [], limits: [], source: 'Sin criterio de aceptación seleccionado', edition: '', notes: []},
    {id: 'inen872-2011-fine', label: 'Arena · referencia histórica NTE INEN 872:2011', kind: 'fine', sieves: defaultSieves.fine.slice(),
      limits: limits([[9.5,100,100],[4.75,95,100],[2.36,80,100],[1.18,50,85],[.6,25,60],[.3,5,30],[.15,0,10]]),
      source: 'NTE INEN 872:2011, primera revisión, 5.1.2.1 y 5.1.2.2; copia del documento INEN alojada en StudyLib', edition: '2011 (histórica)', referenceUrl,
      fmLimits: {min: 2.3, max: 3.1}, maxBetween: 45, notes: [historicalNote, 'Compara gradación, fracción entre tamices y MF. No aplica automáticamente excepciones ni acepta el agregado o la mezcla.']},
    {id: 'inen872-2011-57', label: 'Grava n.º 57 · referencia histórica NTE INEN 872:2011', kind: 'coarse', sieves: defaultSieves.coarse.slice(),
      limits: limits([[37.5,100,100],[25,95,100],[12.5,25,60],[4.75,0,10],[2.36,0,5]]),
      source: 'NTE INEN 872:2011, primera revisión, tabla 2, tamaño n.º 57; copia del documento INEN alojada en StudyLib', edition: '2011 (histórica)', referenceUrl,
      notes: [historicalNote, 'La banda n.º 57 se selecciona expresamente. No determina automáticamente el tamaño máximo nominal utilizado en la dosificación.']},
    {id: 'custom', label: 'Envolvente personalizada · criterio del usuario', kind: 'any', sieves: [], limits: [], source: 'Límites introducidos por el usuario; sin atribución normativa', edition: 'Personalizada', notes: ['La envolvente personalizada no se presenta como requisito normativo. Su justificación corresponde al usuario.']}
  ];

  function freezeDeep(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.values(value).forEach(freezeDeep);
      Object.freeze(value);
    }
    return value;
  }
  function number(value, label) {
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(label + ': ingrese un número finito.');
    return value;
  }
  function sieveLabel(mm) { return mm === 0 ? 'Fondo' : String(mm).replace('.', ',') + ' mm'; }
  function checkedSieves(values) {
    if (!Array.isArray(values) || values.length < 2) throw new Error('Ingrese una serie de tamices y el fondo.');
    const result = values.map((x, i) => {
      number(x, 'Abertura del tamiz ' + (i + 1));
      if (x < 0 || (i > 0 && x >= values[i - 1])) throw new Error('Los tamices deben tener aberturas no negativas y estar en orden estrictamente descendente.');
      return x;
    });
    if (result[result.length - 1] !== 0) throw new Error('La última fila debe ser el fondo, con abertura 0.');
    return result;
  }
  function checkedLimits(values, sieves) {
    if (!Array.isArray(values) || !values.length) throw new Error('Ingrese al menos un límite para la envolvente personalizada.');
    const seen = new Set();
    const result = values.map((value, i) => {
      if (!value || typeof value !== 'object') throw new Error('Límite personalizado inválido en fila ' + (i + 1) + '.');
      const {sieve, min, max} = value;
      number(sieve, 'Tamiz del límite'); number(min, 'Límite mínimo'); number(max, 'Límite máximo');
      if (sieve <= 0 || !sieves.includes(sieve) || seen.has(sieve)) throw new Error('Cada límite debe referirse a un tamiz presente, distinto del fondo y sin duplicados.');
      if (min < 0 || max > 100 || min > max) throw new Error('Los límites deben cumplir 0 ≤ mínimo ≤ máximo ≤ 100.');
      seen.add(sieve);
      return {sieve, min, max};
    }).sort((a, b) => b.sieve - a.sieve);
    // A passing curve cannot increase as the aperture decreases. Reject even
    // individually valid intervals if no monotone passing curve can cross them.
    let possibleMaximum = 100;
    for (const item of result) {
      possibleMaximum = Math.min(possibleMaximum, item.max);
      if (item.min > possibleMaximum + EPS) throw new Error('Envolvente incompatible: el porcentaje que pasa no puede aumentar al disminuir la abertura.');
    }
    return result;
  }

  function analyze(input) {
    if (!input || typeof input !== 'object') throw new Error('Ingrese los datos del análisis granulométrico.');
    const kind = input.kind;
    if (!['fine', 'coarse'].includes(kind)) throw new Error('Seleccione agregado fino o grueso.');
    const profileId = input.profileId == null ? 'none' : input.profileId;
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) throw new Error('Perfil granulométrico desconocido.');
    if (profile.kind !== 'any' && profile.kind !== kind) throw new Error('La envolvente seleccionada no corresponde al tipo de agregado.');
    const sieves = checkedSieves(input.sieves === undefined ? defaultSieves[kind] : input.sieves);
    const initial = number(input.initial, 'Masa seca inicial');
    if (initial <= 0) throw new Error('La masa seca inicial debe ser mayor que cero.');
    if (!Array.isArray(input.masses) || input.masses.length !== sieves.length) throw new Error('Ingrese una masa por cada tamiz y para el fondo.');
    const masses = input.masses.map((mass, i) => {
      number(mass, 'Masa retenida en ' + sieveLabel(sieves[i]));
      if (mass < 0) throw new Error('Las masas retenidas no pueden ser negativas.');
      return mass;
    });
    const total = masses.reduce((a, b) => a + b, 0);
    if (!Number.isFinite(total) || total <= 0) throw new Error('La suma de masas debe ser finita y mayor que cero.');
    const difference = total - initial;
    const differencePercent = difference / initial * 100;
    const balanceOK = Math.abs(differencePercent) <= .3 + EPS;
    let cumulativeMass = 0;
    const rows = sieves.map((sieve, i) => {
      cumulativeMass += masses[i];
      const retained = masses[i] / initial * 100;
      const cumulative = cumulativeMass / initial * 100;
      return {sieve, mass: masses[i], retained, cumulative, passing: 100 - cumulative};
    });
    if (rows.some(r => !Number.isFinite(r.retained) || !Number.isFinite(r.cumulative))) throw new Error('Las magnitudes exceden el rango numérico; revise las unidades de masa.');
    const rowFor = sieve => rows.find(r => r.sieve === sieve);
    const warnings = [];
    if (!balanceOK) warnings.push('La diferencia de masas supera 0,3 % de la masa seca inicial (NTE INEN 696:2011, 5.4.7). El resultado no se evalúa para aceptación granulométrica; revise o repita el ensayo.');
    if (Math.abs(differencePercent) > EPS) warnings.push('Los porcentajes usan la masa seca inicial. La diferencia de masas no se oculta renormalizando al total recuperado; el residual del fondo refleja ese desfase.');
    const missingFM = kind === 'fine' ? fineSeries.filter(sieve => !rowFor(sieve)) : [];
    let fm = null, fmComplete = kind !== 'fine';
    if (kind === 'fine' && !missingFM.length) {
      fm = rows.filter(row => fmSeries.includes(row.sieve)).reduce((sum, row) => sum + row.cumulative, 0) / 100;
      const highest = rows[0];
      // If material is retained by the highest sieve, larger standard sieves
      // might contribute to FM. Do not silently assume those contributions zero.
      const missingUpper = fmSeries.filter(sieve => sieve > 9.5 && !rowFor(sieve) &&
        ((sieve > highest.sieve && highest.mass > 0) || sieve < highest.sieve));
      fmComplete = !missingUpper.length;
      if (!fmComplete) warnings.push('MF parcial: faltan tamices de la serie superior (' + missingUpper.map(sieveLabel).join(', ') + ') y no se ha demostrado que su retenido sea cero. No transfiera este MF al diseño.');
    } else if (kind === 'fine') {
      warnings.push('MF no calculable: faltan tamices de la serie (' + missingFM.map(sieveLabel).join(', ') + '). No se interpolan retenidos faltantes.');
    }
    const selectedLimits = profileId === 'custom' ? checkedLimits(input.customLimits, sieves) : profile.limits.map(item => ({...item}));
    const violations = [];
    let incomplete = false;
    for (const limit of selectedLimits) {
      const row = rowFor(limit.sieve);
      if (!row) {
        incomplete = true;
        warnings.push('No se puede evaluar el límite del tamiz ' + sieveLabel(limit.sieve) + ': falta la medición.');
      } else if (row.passing < limit.min - EPS || row.passing > limit.max + EPS) {
        violations.push({...limit, actual: row.passing, type: 'passing', message: sieveLabel(limit.sieve) + ': pasa ' + row.passing.toFixed(2) + ' %; intervalo seleccionado ' + limit.min + '–' + limit.max + ' %.'});
      }
    }
    if (profile.fmLimits) {
      if (fm === null || !fmComplete) incomplete = true;
      else if (fm < profile.fmLimits.min - EPS || fm > profile.fmLimits.max + EPS) {
        violations.push({sieve: null, actual: fm, ...profile.fmLimits, type: 'fm', message: 'MF = ' + fm.toFixed(3) + '; intervalo de referencia 2,3–3,1.'});
      }
    }
    if (profile.maxBetween) {
      for (let i = 1; i < fineSeries.length; i++) {
        const upper = rowFor(fineSeries[i - 1]), lower = rowFor(fineSeries[i]);
        if (!upper || !lower) { incomplete = true; continue; }
        const fraction = upper.passing - lower.passing;
        if (fraction > profile.maxBetween + EPS) violations.push({sieve: lower.sieve, upperSieve: upper.sieve, actual: fraction, min: 0, max: profile.maxBetween, type: 'between', message: 'Entre ' + sieveLabel(upper.sieve) + ' y ' + sieveLabel(lower.sieve) + ' queda ' + fraction.toFixed(2) + ' %; máximo de referencia 45 %.'});
      }
    }
    warnings.push(...profile.notes);
    warnings.push('El tamizado seco no acredita el contenido de material menor que 75 µm. Para ese requisito se necesita el ensayo por lavado (NTE INEN 697 / ASTM C117) y su criterio aplicable.');
    warnings.push('Estar dentro de una envolvente solo describe los criterios comparados. No acredita calidad integral del agregado, muestreo, ejecución del ensayo ni aceptación de la mezcla de hormigón.');
    const gradingStatus = !selectedLimits.length || !balanceOK || incomplete ? 'not-evaluated' : violations.length ? 'outside' : 'within';
    return {kind, profileId, initial, rows, total, difference, differencePercent, balanceOK, balanceTolerancePercent: .3,
      fm, fmComplete, gradingStatus, violations, warnings, source: profile.source, edition: profile.edition,
      referenceUrl: profile.referenceUrl || '', methodSource: 'NTE INEN 696:2011, 5.4.7 y 5.5 (copia del documento INEN en anexo WWF)', methodUrl,
      limits: selectedLimits, revisionUrl, normativeAcceptance: false};
  }

  return freezeDeep({profiles, defaultSieves, analyze});
}));
