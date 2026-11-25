// Chronologie partagée par l'animation (scene.html) et le mixage audio (mix.py).
// Les temps sont en secondes, sur la piste de voix ; VO décale toute la voix dans la vidéo.
const VO = 0.15;
const EV = {
  plankDrop: 0.05, plankLand: 0.45, heroIn: 1.4, pontLabel: 3.45,
  walk: 3.9, walkEnd: 4.95, bend: 5.4, snap: 6.32, splash1: 6.85, heroBack: 8.95,
  pillarDrop: 7.85, pillarLand: 8.2, planksLand: 8.7, heroMid: 9.4,
  span: 9.67, half: 10.1, eight: 12.05,
  storm: 12.9, thunder: 13.48, rise: 14.38, current: 15.45, sweep: 15.8, sweepEnd: 16.7,
  clear: 16.95, tower1: 19.74, tower2: 20.4, cable: 21.2, cableEnd: 22.15, cableLabel: 21.76,
  deck: 23.3, hangers: 23.9, hangersEnd: 24.9, hangLabel: 25.06,
  forces: 26.5, lean: 27.45, leanEnd: 28.4,
  fix: 29.3, back: 30.2, backEnd: 31.1, anchor: 32.84, anchorLand: 33.05, anchorLabel: 33.17,
  cta: 34.3, ctaDing: 35.5, ctaOut: 36.15,
  wind: 36.3, wobble: 37.6, twist: 39.45, collapse: 40.13, splash2: 40.7,
  tacoma: 40.95, stamp: 42.9, tacomaEnd: 44.89,
  newDeck: 45.2, truss: 46.55, trussEnd: 47.6, trussLabel: 46.86, wind2: 47.7, wind2End: 48.9, holds: 48.46,
  rails: 49.62, lamps: 50.68, lampsEnd: 51.4, asphalt: 51.76, riser: 51.95,
  bravo: 52.93, car: 53.4, carEnd: 56.6, end: 57.6
};
// progression affichée en haut (temps -> %)
const PROGRESS = [[0, 0], [EV.plankLand, 10], [EV.snap, 0], [EV.planksLand, 25], [EV.sweep, 0], [EV.cableEnd, 35],
  [EV.hangersEnd, 50], [EV.lean + .3, 38], [EV.anchorLand, 65], [EV.collapse, 30], [EV.trussEnd, 80], [EV.rails, 86],
  [EV.lampsEnd, 93], [EV.asphalt + .5, 100]];
// coupures de musique (échecs, moments de tension)
const MUSIC_CUTS = [[EV.snap, EV.pillarDrop - .2], [EV.sweep, EV.clear], [EV.lean, EV.fix - .1], [EV.twist, EV.tacoma]];
if (typeof module !== 'undefined') module.exports = { VO, EV, PROGRESS, MUSIC_CUTS };
