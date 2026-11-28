SC.push({ i: 0, cam: [[0, 1, 540, 960]], draw(t) { sky('#cfe7ff', '#f4e8d8'); floor(1300, '#c8b090'); LIGHT = { dir: [-.8, -.6], rim: 'rgba(255,236,200,.95)', amb: 'rgba(40,30,80,.45)', rimW: 10 };
  perso2('malo', 230, 1350, .62, t, { expr: 'sad', arms: 'cast', cast: 1 }); counter(230, 880, 1, .9, { t });
  perso2('star', 540, 1350, .62, t, { expr: 'smile', arms: 'phone', holdR: 'phone', talk: .6 }); counter(540, 880, 312, .9, { t });
  perso2('boulangere', 850, 1350, .62, t, { expr: 'happy', arms: 'tray', holdR: 'croissant' }); counter(850, 880, 80, .9, { t });
  perso2('prof', 300, 1900, .7, t, { expr: 'angry', arms: 'point' }); perso2('pere', 760, 1900, .7, t, { expr: 'sleep' }); perso2('mere', 540, 1950, .5, t, { expr: 'worried', arms: 'hold', holdR: 'bills', walk: 1 });
}});
