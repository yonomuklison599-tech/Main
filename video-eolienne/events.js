// Chronologie accrochée aux mots de la voix : changer de voix recale tout automatiquement.
// buildEvents(timing) -> { VO, EV, CUTS, END } ; temps en secondes vidéo.
function buildEvents(timing) {
  const VO = 0.1;
  const norm = s => s.toLowerCase().replace(/[.,:;!?…]/g, '');
  const W = timing.words, SENT = timing.sentences;
  function at(s, word, occ = 1, off = 0) {
    let n = 0;
    for (const w of W) if (w.s === s && norm(w.w) === norm(word) && ++n === occ) return w.t + VO + off;
    throw new Error(`mot introuvable : [${s}] ${word} #${occ}`);
  }
  const st = s => SENT[s].t + VO, en = s => SENT[s].end + VO;
  const EV = {
    fan: 0, eolLabel: at(0, 'éolienne'),
    ground: at(1, 'sol'), slow: at(1, 'freinent'), bulb: at(1, 'ampoule'), flicker: at(1, 'clignote'),
    mastUp: at(2, 'montes'), mastEnd: at(2, 'mât'), hundred: at(2, 'mètres'),
    top: st(3), x2: at(3, 'deux'), x8: at(3, 'huit'),
    tiny: at(4, 'petite'), filet: at(4, 'filet'),
    blades: at(5, 'pales'), bladesEnd: at(5, 'mètres'), x4: at(5, 'quatre'), double: at(5, 'double'),
    two: at(6, 'deux'), shake: at(6, 'tremble'),
    three: at(7, 'trois'), deg: at(7, 'cent'), round: at(7, 'rond'),
    slowRpm: at(8, 'quinze'), gen: at(8, 'génératrice'), fastRpm: at(8, 'mille'),
    gear: at(9, 'glisses'), x100: at(9, 'cent'), multi: at(9, 'multiplicateur'),
    cta: st(10), ctaDing: at(10, 'abonne-toi'),
    windTurn: at(11, 'vent'), profil: at(11, 'profil'),
    vane: at(12, 'girouette'), motors: at(12, 'moteurs'), yaw: at(12, 'pivoter'), yawEnd: at(12, 'vent', 1, .3),
    storm: at(13, 'tempête'), kmh: at(13, 'quatre-vingt-dix'), race: at(13, "s'emballent"),
    pitch: at(14, 'tourner'), feather: at(14, 'drapeau'),
    bolt: at(15, 'tombe'), stormEnd: en(15) + .2,
    xray: at(16, 'caches'), copper: at(16, 'cuivre'), flow: at(16, "l'éclair"), earth: at(16, 'sol'),
    base: at(17, 'socle'), tons: at(17, 'mille'), lights: at(17, 'feux'), bravo: at(17, 'félicitations'),
  };
  EV.end = en(17) + 2.2;
  // musique coupée net sur les problèmes
  const CUTS = [[EV.flicker, st(2) - .05], [EV.shake, st(7) - .05], [EV.profil, st(12) - .05], [EV.bolt - .05, st(16) - .05]];
  return { VO, EV, CUTS, END: EV.end };
}
if (typeof module !== 'undefined') module.exports = { buildEvents };
