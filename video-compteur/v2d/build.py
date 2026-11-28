# Assemble scene.js : primitives + décors (v1) + personnages v2 + scènes + moteur
s = open('../video-oubli/scene.js').read()
i = s.index('// ---------------------------------------------------------------- icônes de la roulette'); j = s.index('// ---------------------------------------------------------------- moteur')
pre = s[:i].replace("const cv = document.getElementById('out'), g = cv.getContext('2d');", "const cv = document.getElementById('out'); let g = cv.getContext('2d');")
pre += "\nconst SC = [];\n"
open('scene.js', 'w').write(pre + open('chars2.js').read() + '\n' + open('scenesC.js').read() + '\n' + s[j:])
