"""Original subject-specific sculptures for JotColoring's category navigation.
No downloaded paths or raster images. Every silhouette is drawn for its label.
"""

def register(ns):
    P,E,C,R,G,M,S,A=[ns[k] for k in ['path','ellipse','circle','rect','g','mat','shadow','add']]
    leaf=ns['leaf']; spark=ns['sparkle']; paper=ns['paper']; pencil=ns['pencil']; brush=ns['brush']; old=dict(ns['ICON'])
    def add(name,label,art): A(name,label,S()+art,'Subjects')
    def eyes(xs,y,r=4.5):
        return ''.join(E(x,y,r,r*1.2,'#253135')+C(x-r*.3,y-r*.35,r*.33,'#fff') for x in xs)
    def smile(x=64,y=76):return P(f'M{x-9} {y}q9 8 18 0',stroke='#754832',sw=1.5)
    def cat():
        b=P('M82 100c33 5 37-20 21-29 10 16-3 18-17 15',M('ginger'),'#a6643c',1.7)
        b+=P('M41 67c-14 19-14 34-8 43h51c7-19-3-35-16-43Z',M('ginger'),'#a6643c',1.4)
        b+=P('M49 78q-8 17 9 25 18-8 10-25Z',M('cream'))+P('M42 89v20m17-16v16m17-20v20',stroke='#a6643c',sw=1.6)
        b+=P('M29 42 25 11 47 27q16-7 33 0l23-16-4 33q11 30-21 39H49Q19 77 29 42Z',M('ginger'),'#9e6140',1.6)
        b+=P('m31 19 3 19 10-9Zm53 10 12-10-3 20Z',M('pink'),'#c18073',1)
        b+=P('M50 28l6 12m8-15v13m12-10-5 12M30 48l10 3m-9 8 10 1m53-12-10 3m10 8-10 1',stroke='#b27640',sw=2.5)
        for x in [46,81]: b+=E(x,53,7,8,M('aqua'),'stroke="#4f725d" stroke-width="1.1"')+E(x,53,2,5,'#203d37')+C(x-2,50,1.7,'white')
        b+=E(55,69,10,8,M('cream'))+E(73,69,10,8,M('cream'))+P('m59 63 5 6 5-6Z',M('pink'),'#ad7163',.8)+P('M64 69v7m0-1q-6 5-11-1m11 1q6 5 11-1',stroke='#885d43',sw=1.2)
        b+=P('M49 69 25 65m24 9-22 3m52-8 23-4m-23 9 22 3',stroke='#8d684c',sw=1.1)
        return b
    cat_art=cat(); add('cats','Cats · ginger kitten with green eyes',cat_art)
    A('dogs','Dogs · floppy-eared puppy',old['pets'],'Subjects')
    # A pair, rather than a fox used for every domestic animal.
    A('pets','Pets · kitten and puppy',S()+G(old['pets'],'translate(0 20) scale(.75)')+G(cat_art,'translate(54 31) scale(.65)'),'Subjects')
    # A fawn's large ears, split muzzle and spots distinguish it from the red fox.
    b=P('M38 70q-16 18-9 40h53q6-29-11-40Z',M('fawn'),'#a56b40',1.4)+P('M46 82v28m23-28v28m-35 1h16m14 0h16',stroke='#915b39',sw=1.8)
    b+=P('M34 42C4 33 8 8 21 16l28 20m41 6c30-9 26-34 13-26L75 36',M('fawn'),'#a06c43',1.5)
    b+=P('M32 34 19 22q-6 9 13 17m64-5 13-12q6 9-13 17',M('pink'))
    b+=P('M32 45q-1-25 32-25t32 25L84 78 66 94 45 80Z',M('fawn'),'#9c6841',1.6)
    b+=P('M34 50q15 1 30 28 13-26 30-28L82 78 66 92 46 78Z',M('cream'))+eyes([45,82],50)
    b+=P('M57 75q8-5 16 0l-8 8Z',M('ink'))+P('M65 83v5',stroke='#74503a',sw=1.2)
    for x,y in [(47,30),(63,27),(80,30),(37,83),(42,96),(77,89)]: b+=E(x,y,2.1,3,'#fff3d8')
    b+=leaf(90,109,120,.5)
    add('woodland','Woodland · spotted fawn',b)
    # Insects: bee has six legs, two antennae and translucent wings.
    b=E(43,42,22,26,M('glass'),'stroke="#70a8b5" stroke-width="1.3" transform="rotate(-28 43 42)"')+E(84,42,22,26,M('glass'),'stroke="#70a8b5" stroke-width="1.3" transform="rotate(28 84 42)"')
    b+=P('m45 83-12 17m22-12-4 16m32-21 12 17m-24-12 4 16',stroke='#5e4936',sw=2.4)+E(64,70,36,29,M('gold'),'stroke="#a87b37" stroke-width="1.5"')
    b+=P('M48 44q-6 28 6 53m15-55q-4 29 7 54',stroke='#4a3c2c',sw=9)+C(94,60,20,M('gold'),'stroke="#ac813b" stroke-width="1.3"')+eyes([88,104],56,3.5)+P('M91 70q6 4 11-2',stroke='#6d492d',sw=1.4)+P('m88 41-6-15m18 16 5-15',stroke='#554332',sw=2)+C(81,25,3,'#554332')+C(106,26,3,'#554332')
    add('insects','Insects · honeybee with glassy wings',b)
    # Monarch-like butterfly, layered wing cells and cream edge spots.
    b=''
    for flip in ['', 'translate(128 0) scale(-1 1)']:
        w=P('M62 60C41 18 3 10 13 48l13 18c-26 38 10 54 35 11Z',M('coral'),'#754338',2)
        w+=P('M55 56C39 28 19 20 22 44l12 13Zm0 15C33 63 19 85 30 96q12 7 26-17Z',M('gold'),'#874f33',1.5)+P('m62 60-28-3m24 12-25 15M34 57 18 41',stroke='#644235',sw=2)
        for x,y in [(17,31),(17,48),(22,61),(19,78),(24,96),(36,103),(46,99)]: w+=C(x,y,2,'#fff7dd')
        b+=G(w,flip)
    b+=E(64,65,5,31,M('ink'))+C(64,37,6,M('ink'))+P('M62 34q-14-19-16-8m20 8q14-19 16-8',stroke='#583f31',sw=1.5)
    add('butterflies','Butterflies · orange patterned wings',b)
    # Monkey.
    b=P('M84 99q32 8 25-17-5-14-14-4',stroke='#976241',sw=12)+P('M39 71q-17 14-10 39h56q6-27-12-39Z',M('wood'),'#805839',1.5)+E(63,91,15,20,M('cream'))
    for x in [25,102]: b+=C(x,50,17,M('wood'),'stroke="#8b5a3b" stroke-width="1.4"')+C(x,50,10,M('pink'))
    b+=E(64,49,39,35,M('wood'),'stroke="#8e5d3c" stroke-width="1.5"')+P('M34 49C28 22 56 22 64 37c13-21 37-11 29 13l-8 24H44Z',M('cream'),'#b58b62',1.2)+E(64,68,23,17,M('cream'))+eyes([48,80],47)+E(60,65,2,3,'#8e5f42')+E(68,65,2,3,'#8e5f42')+smile(64,73)
    b+=P('M58 19q-5-13 7-12 12 1 5 8',stroke='#9b693e',sw=4)
    add('jungle-animals','Jungle animals · smiling monkey',b)
    # Lion with mane petals; broad nose and round ears are different from the cat.
    b=P('M37 76q-12 18-7 34h56q4-24-9-35Z',M('gold'),'#a77a36',1.4)+P('M45 89v21m24-21v21',stroke='#a77a36',sw=2)
    for a in range(0,360,30):b+=G(E(64,24,17,20,M('fur'),'stroke="#a46134" stroke-width="1.3"'),f'rotate({a} 64 52)')
    b+=C(64,52,32,M('gold'),'stroke="#ae7c3a" stroke-width="1.3"')+C(38,32,9,M('gold'))+C(90,32,9,M('gold'))+eyes([48,80],49)+E(64,69,22,13,M('cream'))+P('M56 62q8-4 16 0l-8 7Z',M('ink'))+smile(64,74)
    add('safari-animals','Safari animals · lion with a full mane',b)
    # Chameleon with curled tail, dorsal crest and gripping toes.
    b=P('M83 91c34 22 41-29 13-28-18 0-15 23-1 19',stroke='#397b76',sw=13)+P('M83 89c30 18 34-24 13-20-12 2-9 14-1 13',stroke='#8bd49a',sw=7)
    b+=P('M31 68q1-28 33-25l26 12 8 30-27 9-40-7Z',M('jade'),'#387c68',1.6)+P('m40 46 5-9 6 7 8-12 6 11 9-7 2 12',M('jade'),'#438268',1)
    b+=P('M34 87 25 102h12m35-10 3 12h13M33 73 13 69 28 52 45 55',M('jade'),'#397d65',1.7)+C(30,60,11,M('gold'),'stroke="#618858" stroke-width="1.5"')+C(29,59,4,'#2a4d43')+C(28,57,1.3,'white')+P('M13 70q12 6 23 1',stroke='#366d57',sw=1.4)
    for x,y in [(49,66),(60,61),(73,66),(44,78),(62,80)]:b+=C(x,y,2.5,'#c2e991')
    add('reptiles','Reptiles · green chameleon with curled tail',b)
    # Penguin: white chest, black flippers and feet on ice.
    b=E(64,110,47,7,M('glass'),'stroke="#9dcbd8" stroke-width="1"')+P('M41 60 20 87q-7 14 5 10L49 78m34-18 24 27q6 15-7 10L77 78',M('navy'),'#324c61',1.5)+E(64,66,31,46,M('navy'),'stroke="#2d495d" stroke-width="1.5"')+E(64,77,23,31,M('paper'))
    b+=P('M43 40c-4-23 19-29 21-9 4-20 26-14 22 9L80 70H49Z',M('paper'))+eyes([52,77],43,3.5)+P('m56 56 8 12 10-12Z',M('gold'),'#b57f37',1.1)+E(47,111,15,5,M('gold'))+E(81,111,15,5,M('gold'))+P('M45 74q19 7 37-1',stroke='#66c2d4',sw=6)
    add('polar-animals','Polar animals · penguin on blue ice',b)
    # Sea turtle shell scutes, four flippers and a rounded head.
    b=P('M38 46C8 19 6 51 33 62m58-16c29-27 33 4 6 17M38 83C7 82 26 114 48 94m37-11c29-1 10 31-10 11',M('jade'),'#468668',1.6)
    b+=P('M57 98 64 112l7-14Z',M('jade'),'#468668',1.2)+E(64,65,36,40,M('leaf'),'stroke="#386c4a" stroke-width="2"')+E(64,65,29,34,M('jade'),'stroke="#bde29b" stroke-width="2"')
    b+=P('m64 40 17 11-2 24-15 12-17-11 1-25Z',M('leaf'),'#3c7a55',1.5)+P('M64 40V32m17 19 10-4m-12 28 11 9M64 87v11M47 76l-10 8m11-33-10-7',stroke='#b4d68d',sw=2)
    b+=E(65,21,17,18,M('jade'),'stroke="#43836a" stroke-width="1.5"')+eyes([57,73],19,3)+P('M59 29q6 4 12 0',stroke='#39755f',sw=1.3)
    add('ocean-life','Ocean life · green sea turtle',b);add('sea-turtles','Turtles · flippers and patterned shell',G(b,'translate(4 2) rotate(-12 62 63) scale(.95)'))
    # Owl with facial disks, feathered wings and talons.
    b=P('M20 105h89',stroke='#99704d',sw=6)+P('M34 43 29 11 49 25q17-6 32 0l20-14-6 33q7 22-1 48-10 22-31 21-26-1-33-23Z',M('lavender'),'#71618f',1.7)
    b+=P('M34 60q-14 15-4 36l16-16m47-21q15 15 5 37L81 80',M('plum'),'#72628c',1.3)+E(64,82,23,25,M('cream'))
    for x in [48,80]: b+=E(x,49,20,22,M('paper'),'stroke="#c3a98e" stroke-width="1.2"')+C(x,49,10,M('gold'),'stroke="#aa8240" stroke-width="1"')+C(x,49,5.5,'#28333c')+C(x-2,46,2.2,'#fff')
    b+=P('m58 64 7 10 6-10Z',M('gold'),'#9c783b',1)+P('M52 104v8m7-6v7m12-8v8m7-9v8',stroke='#a7844c',sw=2)
    for x,y in [(53,83),(65,87),(76,83),(59,97),(73,97)]:b+=P(f'm{x-3} {y-2} 3 4 3-4',stroke='#c5a67b',sw=1.3)
    add('owls','Owls · feathered purple owl',b)
    # Dragon has a distinct winged silhouette; not a recycled dinosaur.
    b=P('M40 69 11 36l-2 35 17-4 1 20 20-7m37-10 33-34 2 36-18-5-1 21-20-7',M('coral'),'#a46a66',1.7)+P('M32 73q-8 22 1 37h53q8-25-7-39Z',M('jade'),'#468668',1.5)+P('M47 81q-9 18 15 25 23-7 13-25Z',M('cream'))
    b+=P('m40 31-7-20 19 13m26 0 18-14-6 22',M('gold'),'#a98c54',1.3)+P('M31 42q0-21 32-21 34 0 35 24l-9 29q-22 18-50 0Z',M('jade'),'#438269',1.6)+eyes([46,81],44,5)+E(65,65,24,14,M('mint'))+E(55,61,2,3,'#4c7d62')+E(75,61,2,3,'#4c7d62')+smile(65,72)+P('m46 79 4-6 4 10m18-1 4-9 4 6',M('paper'))+P('M35 106h16m18 0h15',stroke='#4e8464',sw=2)
    b+=spark(105,20,5,'#e9b859')
    add('dragons','Dragons · green dragon with coral wings',b)
    # Garden scene: planted flowers, pot, garden trowel.
    b=R(22,79,65,11,4,M('coral'),'#b76c54',1.4)+P('M28 91h53l-9 22H38Z',M('coral'),'#ad6a54',1.4)
    for x,y,a in [(45,43,-10),(72,53,16)]:
        b+=P(f'M{x} 84V{y+5}',stroke='#5b925c',sw=4)+G(leaf(0,0,0,.5),f'translate({x} 73)')
        for angle in range(0,360,60):b+=G(E(x,y-11,7,12,M('pink' if x==45 else 'gold'),'stroke="#d0926b" stroke-width=".8"'),f'rotate({angle} {x} {y})')
        b+=C(x,y,7,M('gold'),'stroke="#b98241" stroke-width="1"')
    b+=G(P('M96 42h11v40l5 16q-11 18-22 0l6-16Z',M('metal'),'#829c94',1.5)+R(94,27,15,27,5,M('wood'),'#956f42',1.3),'rotate(20 100 82)')
    add('gardens','Gardens · two blooms, terracotta pot and trowel',b)
    # Snowman, actual winter subject rather than a Christmas tree.
    b=E(64,91,34,25,M('snow'),'stroke="#94bbce" stroke-width="1.5"')+C(64,50,27,M('snow'),'stroke="#94bbce" stroke-width="1.5"')
    b+=P('M41 31V13h42v18',M('navy'),'#38526c',1.4)+R(34,29,58,9,3,M('navy'),'#38526c',1.2)+P('M42 24h40',stroke='#e48b68',sw=6)+eyes([55,75],48,2.8)+P('m63 55 18 5-18 4Z',M('orange'),'#c5763e',1)+P('M55 67q10 6 18-1',stroke='#5e7c89',sw=1.5)+P('M42 74q23 9 43-1m-30 6-2 29 13-1 2-27',M('coral'),'#b7654e',1.3)+P('M30 86 12 65m86 21 18-21m-7 8 7 1M20 75l-6 2',stroke='#9c734d',sw=3)
    for y in [87,99]:b+=C(76,y,2.7,'#4b6575')
    add('snowmen','Winter · snowman with a blue hat and coral scarf',b)
    # Root themes with tangible, unambiguous subjects.
    A('nature','Nature · leafy oak tree',old['woodland'],'Subjects')
    b=P('m17 60 46-43 46 43v49H18Z',M('paper'),'#b29278',1.5)+P('m10 59 53-48 55 48-8 8-47-42-45 43Z',M('coral'),'#ad684e',1.5)+R(54,73,22,38,3,M('wood'),'#a37850',1.3)+C(70,94,1.8,'#5d5445')+P('M87 30V12h15v33',M('stone'),'#b49a78',1.3)
    for x in [27,84]:b+=R(x,67,17,23,2,M('sky'),'#7f9c9b',1.2)+P(f'M{x+8} 68v21m-7-10h15',stroke='#fff9e9',sw=1.5)
    b+=R(13,108,102,6,2,M('stone'))+leaf(103,108,100,.5)
    add('buildings','Buildings · house with windows, a door and chimney',b)
    def person(x,y,scale,hair,shirt,skin):
        face=E(0,20,17,21,M(skin),'stroke="#ba9378" stroke-width="1.2"')+P('M-18 17C-23-13 21-14 19 18l-9-13-17 6Z',M(hair),'#70503c',1.1)+eyes([-6,7],20,2)+P('M-5 30q5 4 10-1',stroke='#a16950',sw=1.1)
        face+=P('M-11 39q-19 1-20 29h61q-2-29-20-29l-10 8Z',M(shirt),'#6e91a0',1.2)+P('m-11 40 10 8 11-8',stroke='#fff8df',sw=1.4)
        return G(face,f'translate({x} {y}) scale({scale})')
    b=person(37,30,1,'ink','blue','skin')+person(87,22,1.15,'wood','coral','cocoa')
    add('people','People · two smiling people',b)
    # Three books and a pencil: learning, not an unrelated flower scene.
    b=G(R(17,29,62,77,5,M('blue'),'#4e879d',1.5)+R(24,36,49,60,2,M('paper'))+P('m35 80 11-28 12 28m-19-9h14',stroke='#508b9a',sw=3),'rotate(-13 50 70)')
    b+=G(R(45,20,61,83,5,M('coral'),'#b57656',1.5)+R(51,27,49,66,2,M('paper'))+P('M67 79V45h9q13 0 7 15 10 11-5 18Z M67 61h10',stroke='#bf7655',sw=3),'rotate(9 75 60)')+G(pencil(),'translate(62 24) rotate(22 20 40) scale(.72)')
    add('education','Learning · alphabet books and a pencil',b)
    # Giant panda: rounded ears, dark eye patches and limbs surrounding pale fur.
    b=E(64,84,34,31,M('paper'),'stroke="#7a858b" stroke-width="1.5"')
    b+=E(36,84,12,24,M('navy'),'transform="rotate(23 36 84)"')+E(92,84,12,24,M('navy'),'transform="rotate(-23 92 84)"')
    b+=E(45,109,17,10,M('navy'))+E(83,109,17,10,M('navy'))
    b+=C(37,27,15,M('navy'))+C(91,27,15,M('navy'))
    b+=E(64,47,40,33,M('paper'),'stroke="#7a858b" stroke-width="1.5"')
    b+=E(46,45,11,14,M('navy'),'transform="rotate(28 46 45)"')+E(82,45,11,14,M('navy'),'transform="rotate(-28 82 45)"')
    b+=C(46,43,4,'#fff')+C(82,43,4,'#fff')+C(47,44,2.1,'#253135')+C(81,44,2.1,'#253135')
    b+=E(64,61,8,5,M('navy'))+P('M64 65v5m0-1q-7 7-13 0m13 0q7 7 13 0',stroke='#58616a',sw=1.6)
    b+=P('M91 110 101 68m-7 30 10-5m-8-8 9-3',stroke='#548653',sw=4)+leaf(101,83,110,.55)+leaf(97,98,10,.5)
    add('pandas','Pandas · giant panda with rounded ears and eye patches',b)
    # Bible uses a book silhouette and embossed cross, separate from alphabet books.
    b=P('M28 19 91 12q10-1 12 10v82q0 10-10 11l-63 5q-13 0-13-13V32q0-11 11-13Z',M('navy'),'#3d5068',1.7)
    b+=P('M28 28 94 21v78l-64 7q-8 0-8-8V36q0-6 6-8Z',M('blue'),'#567c91',1.3)
    b+=P('M31 108 94 101v10l-64 6q-8 0-8-6 2-3 9-3Z',M('paper'),'#9b947f',1.2)
    b+=P('M34 111 92 105m-55 9 55-6',stroke='#c7bca0',sw=1)
    b+=P('M57 39h12v15h15v12H69v24H57V66H42V54h15Z',M('gold'),'#ab7c37',1.2)
    b+=P('M77 103v19l7-6 7 5v-19Z',M('coral'),'#ae644f',1.1)
    add('bible','Bible · blue book with a raised gold cross and ribbon',b)

    # Soccer ball, with colored basketball behind.
    b=C(87,42,27,M('orange'),'stroke="#b5753f" stroke-width="1.5"')+P('M60 42h54m-27-27v54M69 23q30 22 0 39m36-39Q77 42 105 62',stroke='#9b6541',sw=1.8)
    b+=C(51,77,39,M('paper'),'stroke="#8b9c9b" stroke-width="1.5"')+P('m51 57 14 10-5 17H43l-6-17Zm-33 9 18 1m-11 31 18-14m17 0 17 14m-13-31 19-3M48 39l3 18',M('navy'),'#455967',1.6)+P('m18 68-3 15 10 16 13 12 17 3 18-8 13-16-4-17-8-18-16-10-19 2-14 10Z',stroke='#a6b7b4',sw=1.1)
    add('sports','Sports · soccer ball and basketball',b)
    # Everyday blocks have physical front, side and top faces.
    def block(x,y,s,color):return P(f'M{x} {y}l{s*.75} {-s*.27} {s*.25} {s*.25}-{s*.75} {s*.27}Z',M('paper'),'#bbb49f',1)+P(f'M{x+s*.75} {y-s*.27}v{s}l{-s*.75} {s*.27}v{-s}Z',M(color),'#9b9988',1.2)+P(f'M{x+s*.75} {y-s*.27} {x+s} {y-s*.02}v{s}l{-s*.25} {.27*s}Z',M('stone'),'#a3937a',1)
    b=block(18,74,40,'coral')+block(65,73,40,'blue')+block(43,25,40,'leaf')+P('m29 101 8-20 8 20m-13-6h10M77 94h14m-7-8v17M54 48l7-14 7 14Z',stroke='#fff9e9',sw=2.6)
    add('objects','Everyday objects · colorful wooden blocks',b)
    # Acoustic guitar, six strings, tuning pins and carved wooden body.
    b=P('M55 48h17v22c16-9 28 10 18 20 20 34-4 28-25 28-23 0-46-10-25-34-8-10 0-22 15-15Z',M('wood'),'#92623c',1.6)+P('M51 21h23v55H51Z',M('leather'),'#88603e',1.4)+P('m48 9 29-2 1 18-27 3Z',M('wood'),'#966c43',1.2)
    b+=C(63,84,12,M('ink'),'stroke="#e3b76e" stroke-width="3"')+R(49,103,28,5,1,M('ink'))
    for x in [56,60,64,68]:b+=P(f'M{x} 16v90',stroke='#f5e3bd',sw=.7)
    for y in [15,23,35,45,56,66]:b+=P(f'M52 {y}h20',stroke='#e7bd8c',sw=.8)
    for y in [11,20]:b+=C(48,y+3,3,M('metal'))+C(80,y,3,M('metal'))
    b+=P('M40 94q-6 13 6 17',stroke='#f5d59b',sw=2)
    add('music','Music · acoustic guitar with strings',G(b,'translate(8 0) rotate(14 60 60) scale(.92)'))
    # Teal dress on a real wire hanger.
    b=P('M66 10q-7-10-12 0 0 7 10 9m0 0L30 39h69Z',stroke='#7f9e9e',sw=2.4)+P('m47 28 17 9 17-9 22 28-17 7-8-12 23 58H27l23-58-8 12-17-7Z',M('aqua'),'#438ca1',1.5)+P('M51 69h26l5 11H46Z',M('gold'),'#ccaa66',1.1)+P('M49 85 39 107m20-24-4 24m14-24 5 24m6-22 10 22',stroke='#b5e2e4',sw=1.4)+P('M51 31q13 18 26 0',stroke='#f6e4bf',sw=2)
    add('fashion','Fashion · teal dress on a hanger',b)
    # Friendly robot: antenna, metal face, knobs, arms and legs.
    b=P('M47 95v17H33v5h28V95m14 0v22h26v-5H88V95',M('metal'),'#73928f',1.3)+R(32,62,63,38,7,M('blue'),'#467c9c',1.5)+P('M32 70H20v20H10m85-20h13v20h10',stroke='#8da8a2',sw=9)+P('M31 69H20v20H10m85-20h13v20h10',stroke='#e7f1dc',sw=4)
    b+=R(20,21,86,43,11,M('blue'),'#4d8ba5',1.5)+R(29,29,68,26,8,M('navy'),'#4f8797',1)+P('M63 21V11',stroke='#8aa59f',sw=3)+C(63,8,5,M('gold'))+C(47,42,6,M('aqua'))+C(80,42,6,M('aqua'))+C(45,40,2,'#fff')+C(78,40,2,'#fff')+R(43,74,23,15,3,M('paper'))+C(79,81,6,M('coral'))+P('M49 81h11',stroke='#729ea6',sw=2)
    add('robots','Robots · smiling blue robot',b)
    # Weather, not a repeated Christmas tree.
    b=C(40,36,23,M('gold'),'stroke="#c29b4e" stroke-width="1.3"')
    for a in range(0,360,45):b+=G(P('M40 6V1',stroke='#e8b555',sw=3),f'rotate({a} 40 36)')
    b+=P('M27 81C2 79 12 54 30 58c3-28 42-29 49-6 28-10 46 26 20 31Z',M('snow'),'#87b6ca',1.6)+P('M30 93q-13 18-1 20 13-3 1-20m31-1q-12 18 0 21 13-3 0-21',M('aqua'),'#4b97b5',1)+G(leaf(102,112,25,.9))
    add('seasons','Seasons & weather · sun, cloud, raindrops and leaf',G(b,'translate(3 5) scale(.94)'))
    # Party balloons with knots and strings.
    b=''
    for x,y,c in [(36,40,'aqua'),(88,43,'lavender'),(65,27,'coral')]:b+=P(f'M{x} {y+25}q-13 34 0 54',stroke='#b6a18b',sw=1.2)+P(f'm{x} {y+23}-4 7h8Z',M(c),'#b38f7a',.7)+E(x,y,20,26,M(c),'stroke="#b4937f" stroke-width="1"')+P(f'M{x-12} {y-3}q-1-13 9-17',stroke='#fff8e8',sw=2.8)
    b+=spark(108,15,5,'#ebb252')+spark(14,92,5,'#a69cdb')+P('m98 99 7-6m-78-4-5-5',stroke='#e6b14a',sw=3)
    add('celebrations','Celebrations · colorful party balloons',G(b,'translate(2 4) scale(.95)'))
    b=R(19,18,84,90,9,M('paper'),'#b4a58c',1.5)+R(26,25,32,32,5,M('aqua'),'#67a4a5',1)+R(64,25,32,32,5,M('coral'),'#cb8b71',1)+R(26,64,32,32,5,M('lavender'),'#9e8ab2',1)+R(64,64,32,32,5,M('gold'),'#c6a167',1)
    b+=C(42,41,9,'#fff6de')+P('m69 50 11-19 11 19Z','#fff6de')+P('m31 79 10-10 10 10-10 10Z','#fff6de')+P('M71 80h17m-8-8v16',stroke='#fff6de',sw=3)+G(pencil(),'translate(64 30) rotate(24 10 25) scale(.65)')
    add('art-patterns','Art & patterns · colored geometric tiles and pencil',b)
    # Plural search ideas reuse the exact depicted subject, never a generic fox.
    A('foxes','Foxes · red fox',old['animals'],'Subjects')
    # Footer link illustrations each depict the action or information they open.
    def footer(name,label,art):A(name,label,S()+art,'Site navigation')
    compass=C(64,59,45,M('paper'),'stroke="#b5a487" stroke-width="1.8"')+C(64,59,37,M('glass'),'stroke="#7ba7a5" stroke-width="1.2"')+P('m64 26 9 33-9 33-9-33Z',M('coral'),'#bb7656',1.1)+P('m64 26 9 33h-9Z',M('paper'))+P('M30 59h7m54 0h7M64 23v7m0 59v7',stroke='#6f9291',sw=2)+C(64,59,5,M('gold'),'stroke="#a78b53" stroke-width="1"')
    footer('nav-explore','Explore · three-dimensional compass',compass)
    footer('nav-create','Create · drawing tools and fresh paper',G(paper(),'translate(-2 7) rotate(-10 60 60) scale(.92)')+G(brush(),'translate(61 5) rotate(28 20 30) scale(.79)')+G(pencil(),'translate(38 24) rotate(-22 20 40) scale(.75)')+spark(103,26,6,'#d6aa64'))
    footer('nav-information','Good to know · open guide and information seal',G(old['about'],'translate(-3 -2) scale(.83)')+C(92,84,24,M('blue'),'stroke="#6e91a1" stroke-width="1.5"')+C(92,74,2.7,'#fff8e8')+P('M92 82v16',stroke='#fff8e8',sw=4))
    # A real fan of coloring sheets (neutral line art inside decorative colored paper).
    footer('nav-all-pages','All coloring pages · illustrated page collection',G(paper(),'translate(-8 8) rotate(-13 60 60) scale(.91)')+G(paper(),'translate(15 4) rotate(10 60 60) scale(.9)')+G(ns['flower'](),'translate(37 29) scale(.49)')+G(pencil(),'translate(66 28) rotate(17 5 25) scale(.64)'))
    ns['ICON']['nav-all-pages']=G(ns['ICON']['nav-all-pages'],'translate(4 4) scale(.94)')
    b=G(R(17,28,35,70,6,M('aqua'),'#78a8a9',1.1),'rotate(-12 35 65)')+R(45,18,38,82,7,M('paper'),'#b6a58d',1.3)+G(R(79,29,35,70,6,M('coral'),'#c48b71',1.1),'rotate(12 95 65)')
    b+=C(35,55,9,M('paper'))+C(64,47,11,M('gold'))+C(95,57,9,M('paper'))+P('M26 75h17m-13 7h10M54 74h20m-17 8h14M87 77h15m-12 7h10',stroke='#8b9c9a',sw=2)+P('M39 109h50m-43 0 5-5m-5 5 5 5m31-10 5 5-5 5',stroke='#a78559',sw=2)
    footer('nav-age','Browse by age · a progression of three age cards',b)
    b=G(paper(),'translate(-4 8) rotate(-8 60 60) scale(.9)')+G(cat_art,'translate(31 36) scale(.55)')+G(old['kids'],'translate(62 52) scale(.51)')
    footer('nav-kids','Coloring for kids · kitten page and crayons',b)
    b=G(paper(),'translate(0 3) rotate(-5 60 60) scale(.94)')+G(ns['mandala'](),'translate(28 32) scale(.59)')+G(pencil(),'translate(62 24) rotate(19 10 25) scale(.74)')
    footer('nav-adults','Coloring for adults · detailed pattern and pencil',b)
    # Workspace with an actual partially painted page, palette and stylus.
    b=R(15,15,99,80,9,M('navy'),'#456072',1.4)+R(21,22,87,65,4,M('paper'))+P('m24 75 20-30 21 29 12-15 25 19Z',M('leaf'),'#6f9a70',1)+C(85,39,8,M('gold'))+P('M41 100h47m-24-4v10',stroke='#8ca5a2',sw=4)+G(old['studio'],'translate(49 51) scale(.53)')
    footer('nav-studio','Coloring Studio · painting desk with palette',b)
    # Photo to outline: identical geometry shown in color and as white line art.
    b=G(R(11,22,49,68,5,M('paper'),'#bea88c',1.3)+R(17,29,37,48,3,M('sky'))+P('m17 70 12-24 10 18 9-10 6 16Z',M('leaf'),'#4d8765',1)+C(44,39,5,M('gold')),'rotate(-8 35 56)')
    b+=G(R(69,22,49,68,5,M('paper'),'#bea88c',1.3)+R(75,29,37,48,3,'#fff','#8ba3a5',1)+P('m75 70 12-24 10 18 9-10 6 16Z','#fff','#607b80',1.1)+C(102,39,5,'#fff','stroke="#607b80" stroke-width="1"'),'rotate(8 94 56)')
    b+=C(64,96,16,M('coral'),'stroke="#bb7657" stroke-width="1"')+P('M55 96h18m-7-6 6 6-6 6',stroke='#fff9e6',sw=2.4)
    footer('nav-photo','Photo to Coloring Page · matching color and outline views',b)
    b=G(paper(),'translate(-2 7) rotate(-9 60 60) scale(.9)')+P('M47 34q2-14 18-14 18 0 18 15 0 10-11 18v14H57V53q-11-7-10-19Z',M('gold'),'#b18a44',1.3)+P('M59 68h12m-11 5h10',stroke='#8da4a0',sw=3)+G(pencil(),'translate(73 40) rotate(25 8 25) scale(.64)')+spark(103,22,6,'#a499ce')+spark(30,75,5,'#edb65e')
    footer('nav-ai','Create with AI · idea bulb, drawing sheet and pencil',b)
    b=G(old['artwork'],'translate(-1 -3) scale(.9)')+G(old['heart-filled'],'translate(73 76) scale(.33)')
    footer('nav-artwork','My artwork & favorites · saved art with a heart',b)
    b=G(old['printer'],'translate(0 7) scale(.81)')+C(95,91,20,M('leaf'),'stroke="#6f995f" stroke-width="1.2"')+P('m84 91 8 8 14-17',stroke='#fff9e6',sw=3.5)
    footer('nav-print','Printing guide · printer with a checked print',b)
    # Instruction sheet with three ordered stops; glyphs are vector, not embedded fonts.
    b=G(paper(),'translate(0 4) rotate(-5 60 60) scale(.94)')
    for i,(x,y,c) in enumerate([(42,38,'aqua'),(69,62,'gold'),(45,85,'coral')]):
        b+=C(x,y,10,M(c),'stroke="#b6a187" stroke-width="1"')+P(f'M{x+15} {y}h18m-18 5h11',stroke='#b7b4a6',sw=1.6)
    b+=P('M42 50q-3 12 17 12M68 74q-1 11-12 11',stroke='#acac96',sw=1.4,extra='stroke-dasharray="3 3"')+G(pencil(),'translate(79 47) rotate(20 10 20) scale(.55)')
    footer('nav-how-to','How to use JotColoring · three-step illustrated guide',b)
    b=G(old['about'],'translate(-5 -4) scale(.91)')+C(94,91,18,M('aqua'),'stroke="#719aa0" stroke-width="1.2"')+P('M89 81v14q0 8-8 3',stroke='#fff9e5',sw=3.4)+C(93,80,2.1,'#fff9e5')
    footer('nav-about','About JotColoring · creative storybook and J emblem',b)
    # Personal art license depicts ownership of artwork. Commercial depicts a contract and case.
    b=G(paper(True),'translate(-3 4) rotate(-5 60 60) scale(.93)')+R(34,33,42,32,4,M('paper'),'#c5b49a',1)+G(ns['flower'](),'translate(39 34) scale(.28)')+C(91,88,23,M('leaf'),'stroke="#6c955d" stroke-width="1.3"')+C(91,88,15,'none','stroke="#e2efd2" stroke-width="1.5"')+P('M96 82q-12-6-12 6t12 6',stroke='#fff8e4',sw=2.5)
    footer('nav-license','Artwork license · coloring sheet with copyright seal',b)
    b=G(paper(True),'translate(-8 -2) rotate(-8 60 60) scale(.87)')+R(53,68,60,41,7,M('leather'),'#946d49',1.4)+P('M69 69V58q14-9 26 0v11',stroke='#8e7457',sw=5)+P('M56 85q28 9 54-1',stroke='#eed7ad',sw=2)+R(79,82,11,15,2,M('gold'),'#b89154',1)
    footer('nav-commercial','Commercial licensing · artwork contract and business case',b)
    # Human support is represented by headphones, not another question document.
    b=P('M26 71V53q0-39 38-39 39 0 39 39v24',stroke='#4a8194',sw=10)+P('M26 69V53q0-39 38-39 39 0 39 39v22',stroke='#b8e2e1',sw=5)+R(17,55,21,35,8,M('blue'),'#55859d',1.5)+R(91,55,21,35,8,M('blue'),'#55859d',1.5)+P('M102 89q-4 21-28 21',stroke='#5c8a9e',sw=4)+R(57,103,22,9,4,M('coral'),'#be8264',1.2)+G(old['heart-filled'],'translate(44 51) scale(.32)')
    footer('nav-help','Help center · support headset with a heart',b)
    b=P('M18 22h66q10 0 10 10v34q0 10-10 10H45L25 92V76h-7q-10 0-10-10V32q0-10 10-10Z',M('blue'),'#5a8d9f',1.4)+P('M69 59h38q11 0 11 10v24q0 9-10 9h-7v12l-17-12H69q-10 0-10-10V69q0-10 10-10Z',M('gold'),'#c4a266',1.3)
    b+=P('M42 40q0-12 11-12 12 0 12 10 0 9-12 11v8',stroke='#fff9e6',sw=4)+C(53,65,2,'#fff9e6')+P('m75 82 8 8 17-19',stroke='#fff9e6',sw=4)
    footer('nav-faq','Frequently asked questions · question and answer bubbles',b)
    b=G(old['mail'],'translate(1 10) scale(.93)')+G(P('M71 15 117 7 105 47 91 31 78 39l4-18Z',M('aqua'),'#6d9eaa',1.3)+P('m82 21 28-10-19 20',stroke='#eaf4df',sw=1.1),'rotate(-6 97 25)')
    footer('nav-contact','Contact us · envelope and paper airplane',b)
