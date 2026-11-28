# Assemble scene.js 3D : moteur « Dans cette ville » (ville) + personnages v2 + intérieurs + chronologie
L = open('../video-allan/scene.js').read().split('\n')
base = '\n'.join(L[:135])
base = base.replace("uniforms: { tDiffuse: { value: null }, sat: { value: 1.14 }, con: { value: 1.06 }, warm: { value: .03 } }", "uniforms: { tDiffuse: { value: null }, sat: { value: 1.14 }, con: { value: 1.06 }, warm: { value: .03 }, sep: { value: 0 } }")
base = base.replace("uniform float sat, con, warm; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); float l = dot(c.rgb, vec3(.299,.587,.114)); vec3 r = mix(vec3(l), c.rgb, sat); r = (r - .5) * con + .5; r += vec3(warm, warm * .4, -warm * .6);",
  "uniform float sat, con, warm, sep; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); float l = dot(c.rgb, vec3(.299,.587,.114)); vec3 r = mix(vec3(l), c.rgb, sat); r = (r - .5) * con + .5; r += vec3(warm, warm * .4, -warm * .6); r = mix(r, vec3(l * 1.08, l * .9, l * .68) + .04, sep);")
base = base.replace('// « Dans cette ville, tout le monde sort faire la fête… sauf moi » (Huss / Tchiki brrr, twist : coach Allan)', '// « Dans cette ville, chacun a un compteur au-dessus de la tête » (twist : le 1, c\'est son père)')
assert 'sep: { value: 0 }' in base and 'uniform float sat, con, warm, sep' in base
open('scene.js', 'w').write(base + '\n' + open('part3d.js').read() + '\n' + open('part3d_b.js').read())
