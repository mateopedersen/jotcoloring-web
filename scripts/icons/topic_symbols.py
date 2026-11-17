from pathlib import Path
import json,hashlib
out=Path('public/topic-symbols');out.mkdir(exist_ok=True)
S={}
def add(ids,label,body):
 for id in ids.split():S[id]=(label,body)
def path(d,fill='none',stroke='#4e5962',width=3):return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{width}" stroke-linecap="round" stroke-linejoin="round"/>'
def circle(x,y,r,fill,stroke='#4e5962'):return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="3"/>'
def rect(x,y,w,h,fill,rx=5):return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="#4e5962" stroke-width="3"/>'
add('basketball','Basketball',circle(64,62,45,'#ed963e')+path('M19 62h90M64 17v90M32 30q61 32 0 64M96 30q-61 32 0 64','#ed963e','#9b592b',2.5))
add('soccer','Soccer ball',circle(64,64,45,'#fffdf6')+path('m64 43 20 14-8 24H52l-8-24Z','#344e62')+path('M64 19v24M22 50l22 7m8 24-18 18m42-18 18 18m-10-42 22-7'))
add('baseball','Baseball and bat',path('M25 101 81 20q9-12 18-4t-3 20L34 108Z','#d9a66a','#92643f',3)+circle(66,72,32,'#fffdf6')+path('M49 44q27 26 0 56M83 44q-27 26 0 56','none','#b84235',2)+path('m49 51 7-1m-3 9 7 1m-3 8 6 3m-9 8 6 4m-11 5 5 5m29-42-7-1m3 9-7 1m3 8-6 3m9 8-6 4m11 5-5 5','none','#b84235',2))
add('winter-sports','Ice skate',path('M39 20h35v35q7 15 27 19l5 20H20V78l15-9Z','#f8fcfd')+path('M44 30h25m-26 10h27m-28 11h28m-5 43v13m24-13v13M21 108h80q12 0 13-10','none','#658a9b',4))
add('karate','Karate uniform and belt',path('m41 19-24 17 13 30 12-9-6 49h57l-6-49 12 9 13-30-25-17-22 25Z','#fffdf8')+path('m42 20 24 28 20-28M53 35l-8 32m21-19 11 20','none','#9aa8ae',3)+path('M39 68h51v12H39Z','#323c49')+path('m62 74-9 33 12 3 9-32m-9-1 19 27 9-8-20-24','#323c49'))
add('gymnastics','Gymnastics rings',path('M38 12v37M90 12v37','none','#9c7756',5)+circle(38,73,24,'none','#b68247')+circle(90,73,24,'none','#b68247'))
car=path('M20 64 34 36q3-6 12-6h35q10 0 14 8l16 30v24H16V72Z','#efaa56')+path('m35 42-10 23h74L87 42Z','#dcecf0')+rect(16,70,95,22,'#efaa56')+circle(34,94,12,'#364c59')+circle(94,94,12,'#364c59')+path('M22 75h14m55 0h14','none','#fff8df',5)
add('cars','Car',car)
add('police-car','Police car',car+rect(47,24,15,9,'#d65142',2)+rect(62,24,15,9,'#608fc6',2)+path('M54 73h18v15H54Z','#f9fcff'))
add('ambulance','Ambulance',rect(15,35,70,55,'#fff8ed')+path('M85 51h16l14 21v18H85Z','#fff8ed')+path('M89 57h10l10 15H89Z','#c2e2eb')+circle(36,94,12,'#364c59')+circle(95,94,12,'#364c59')+path('M44 44h12v13h13v12H56v13H44V69H31V57h13Z','#d35244')+rect(41,24,22,9,'#d35244',2))
add('trucks','Truck',rect(9,30,66,57,'#73a6b9')+path('M75 47h21l19 24v19H75Z','#ec9f50')+path('M83 53h11l13 18H83Z','#e8f3f4')+circle(31,94,13,'#364c59')+circle(95,94,13,'#364c59'))
add('school-bus','School bus',rect(10,37,108,51,'#f4c453')+''.join(rect(x,45,17,20,'#d5ebef',2)for x in [18,41,64,87])+path('M18 75h91','none','#9b6b2c',3)+circle(32,93,13,'#364c59')+circle(96,93,13,'#364c59'))
add('trains','Train',rect(26,24,76,65,'#73a6b9',12)+rect(35,35,58,26,'#e8f2f5')+circle(43,74,6,'#f5d487')+circle(85,74,6,'#f5d487')+path('m41 89-18 25m64-25 18 25M28 104h72','none','#5e6872',5))
plane=path('m58 12 12 0 4 39 37 26v11L75 74l-1 25 14 12v6l-24-6-24 6v-6l14-12-1-25-36 14V77l37-26Z','#dbeaf0','#5a7f91',3)
add('aircraft jet','Aircraft',plane)
add('boats','Sailboat',path('M16 85h99l-22 24H36Z','#6d9fb5')+path('M61 17v64H24Zm8 12v52h38Z','#fff8e6')+path('M11 116q15-9 29 0t29 0 29 0 21 0','none','#67a7be',3))
add('bicycles','Bicycle',circle(30,86,23,'none','#5f7684')+circle(101,86,23,'none','#5f7684')+path('m30 86 20-41 26 41H30l29-28h30l12 28m-12-28-5-23h14M41 42h21','none','#d78d46',5))
add('excavator construction-vehicles','Excavator',rect(19,90,77,22,'#4e6570',11)+path('M24 82V55h36v27H24l50 0v10H24Z','#e8b64b')+path('M31 62h22v17H31Z','#d6eaf0')+path('M63 67 79 23h13l19 46-13 6-15-35-9 34Z','#edb74b')+path('m111 68 10 12-10 19-20-9 7-15Z','#d8a044'))
add('hot-air-balloon','Hot air balloon',path('M23 49a41 40 0 0 1 82 0q0 22-30 42H53Q23 71 23 49Z','#e8a568')+path('M64 10q-28 30-8 80m8-80q28 30 8 80','none','#a46940',3)+path('m53 91 4 14m18-14-4 14','none','#956a43',3)+rect(53,104,22,17,'#bd905e',3))
add('science','Science flask',path('M47 14h34v9H74v36l28 43q7 13-8 13H34q-15 0-8-13l28-43V23h-7Z','#e3f2f4')+path('M42 78h44l16 25q5 8-7 8H33q-11 0-7-8Z','#7cbfc2')+circle(58,91,5,'#dcf0e9')+circle(77,102,4,'#dcf0e9'))
add('drinks milkshake','Milkshake',path('M34 49h60l-8 67H43Z','#e7abb4')+path('M31 49q-3-13 12-14-2-13 13-13 9-14 20 0 16 0 13 14 13 0 9 13Z','#fff4df')+path('m72 27 9-19h17','none','#78a5b7',6)+path('M53 63v39m15-39v39m14-39-3 39','none','#fff3e8',3))
add('musical-notes','Musical notes',path('M44 83V31l55-13v58M44 40l55-13','none','#5e7797',7)+path('M44 83c-33-10-40 28-14 24 11-1 14-8 14-24m55-7c-33-10-40 28-14 24 11-1 14-8 14-24','#5e7797'))
add('rain','Rain cloud',path('M24 68C5 67 7 39 27 39c4-29 47-33 58-6 28-4 40 34 17 39H28Z','#b6cfdb')+path('m35 86-8 17m39-17-8 17m39-17-8 17','none','#5b9eba',6))
add('rainbow','Rainbow',path('M16 101a48 65 0 0 1 96 0','none','#d7796e',13)+path('M29 101a35 52 0 0 1 70 0','none','#e8b866',12)+path('M41 101a23 40 0 0 1 46 0','none','#88b79c',11)+path('M52 101a12 29 0 0 1 24 0','none','#7eacc3',10))
add('winter january december','Snowflake',path('M64 15v98M22 39l84 50M22 89l84-50M51 23l13 13 13-13M51 105l13-13 13 13M27 54l18-6-3-18m59 68-18-6 3-18M26 75l18 6-3 18m60-68-18 6 3 18','none','#76a6bf',5))
add('summer','Sun',circle(64,64,29,'#f2c55d','#c5903b')+path('M64 7v14m0 86v14M7 64h14m86 0h14M24 24l11 11m58 58 11 11M24 104l11-11m58-58 11-11','none','#d9a64d',6))
add('autumn fall-leaf','Fall leaf',path('M63 16 78 44l23-13-4 31 18 7-25 21 3 19-29-9-29 9 3-19L13 69l18-7-4-31 23 13Z','#d99a50','#a76d38',3)+path('M64 39v81m0-37L44 62m20 21 20-21','none','#9c6a3d',3))
add('christmas christmas-tree christmas-eve','Christmas tree',path('m64 10-25 31h12L27 69h14l-24 33h94L87 69h14L77 41h12Z','#6e9e7c','#477358',3)+rect(56,102,16,15,'#ac8055',2)+circle(53,53,5,'#e5b966')+circle(75,79,5,'#d88270'))
add('halloween trick-or-treat','Halloween pumpkin',path('M61 25q1-15 14-15l-5 20','#759566')+path('M64 29C18 12 4 51 17 88c15 33 78 32 94-1 14-36-3-73-47-58Z','#e9a052','#a86a39',3)+path('m37 53 13 16H29Zm49 0 13 16H78ZM32 84l16 6 16-6 16 6 16-6-10 15H43Z','#675139'))
add('hanukkah','Hanukkiah',path('M64 14v88m-38-63v23q0 18 38 18t38-18V39M38 26v29q0 12 26 12t26-12V26M50 19v25q0 10 14 10t14-10V19M18 51v27q0 17 46 17t46-17V51M48 110h32','none','#b78d47',5)+''.join(path(f'M{x} {y}q-6-8 0-15 6 7 0 15','#edb955','#c89042',1.5)for x,y in [(18,49),(26,37),(38,24),(50,17),(64,12),(78,17),(90,24),(102,37),(110,49)]))
add('eid ramadan','Crescent and star',path('M77 15a48 48 0 1 0 28 77A43 43 0 0 1 77 15Z','#e7bf67','#b58c45',3)+path('m96 24 5 13 14 1-11 9 3 14-12-8-12 8 3-14-11-9 14-1Z','#e7bf67','#b58c45',2))
add('st-patricks-day','Shamrock',path('M63 68C24 79 9 39 31 30c14-7 25 6 26 18-10-20-3-42 13-38 19 4 14 27 3 38 13-25 39-20 40-2 2 24-24 31-40 23 6 19 12 27 23 34l-10 9c-18-16-22-29-23-44Z','#73a279','#49784d',3))
add('gingerbread-man','Gingerbread cookie',circle(64,29,18,'#c79665','#916c49')+path('M51 48 25 38q-12-4-15 7-2 9 10 14l22 9-12 35q-4 12 8 15 9 2 14-11l12-26 12 26q5 13 14 11 12-3 8-15L86 68l22-9q12-5 10-14-3-11-15-7L77 48Z','#c79665','#916c49',3)+circle(58,27,2,'#fff8e6','#fff8e6')+circle(70,27,2,'#fff8e6','#fff8e6')+path('M56 36q8 6 16 0','none','#fff8e6',2)+circle(64,58,3,'#e4b35c')+circle(64,72,3,'#d27e72'))
# Physically shaded native vectors: no embedded raster or external resources.
import re, colorsys, math, random
DEFS = '<filter id="contact" x="-50%" y="-100%" width="200%" height="300%"><feGaussianBlur stdDeviation="2.4"/></filter><filter id="lift" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="1.2" dy="2" stdDeviation="1.2" flood-color="#18202b" flood-opacity=".24"/></filter>'
DEFS += '<radialGradient id="ball-orange" cx=".29" cy=".22" r=".79"><stop stop-color="#ffc073"/><stop offset=".36" stop-color="#e98732"/><stop offset=".73" stop-color="#ba4c17"/><stop offset="1" stop-color="#692911"/></radialGradient><radialGradient id="ball-white" cx=".29" cy=".22" r=".8"><stop stop-color="#ffffff"/><stop offset=".5" stop-color="#f8f8ee"/><stop offset=".8" stop-color="#c9ccca"/><stop offset="1" stop-color="#7f8e94"/></radialGradient><linearGradient id="wood" x1="0" y1="0" x2="1" y2=".5"><stop stop-color="#74451e"/><stop offset=".27" stop-color="#f4d4a4"/><stop offset=".45" stop-color="#bf8e52"/><stop offset=".65" stop-color="#ebc18b"/><stop offset="1" stop-color="#84552c"/></linearGradient><linearGradient id="steel" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#263846"/><stop offset=".16" stop-color="#b2cedb"/><stop offset=".34" stop-color="#f9ffff"/><stop offset=".48" stop-color="#8299a6"/><stop offset=".66" stop-color="#263b49"/><stop offset=".84" stop-color="#d3e2eb"/><stop offset="1" stop-color="#556c79"/></linearGradient><clipPath id="sphere"><circle cx="64" cy="61" r="47"/></clipPath>'
def shade(color):
 h=color.lstrip('#');h=h if len(h)==6 else ''.join(c*2 for c in h)
 r,g,b=[int(h[i:i+2],16)/255 for i in (0,2,4)]
 def mix(t,white=False):
  vals=[v+(1-v)*t if white else v*t for v in (r,g,b)]
  return '#'+''.join(f'{round(v*255):02x}' for v in vals)
 return mix(.63,True),color,mix(.51)
colors=sorted(set(re.findall(r'(?:fill|stroke)="(#[0-9a-fA-F]{3,6})"',''.join(v[1] for v in S.values()))))
for color in colors:
 light,base,dark=shade(color);name='m'+color[1:]
 DEFS+=f'<radialGradient id="{name}" cx=".28" cy=".18" r=".94" gradientTransform="matrix(1 0 0 1.1 0 -.03)"><stop stop-color="{light}"/><stop offset=".4" stop-color="{base}"/><stop offset="1" stop-color="{dark}"/></radialGradient>'
def physical(body):
 body=re.sub(r'fill="(#[0-9a-fA-F]{3,6})"',lambda m:'fill="url(#m'+m[1][1:]+')"',body)
 body=re.sub(r'stroke="(#[0-9a-fA-F]{3,6})"(?=[^>]*stroke-width="(?:[4-9]|1[0-9])(?:\.[0-9]+)?")',lambda m:'stroke="url(#m'+m[1][1:]+')"',body)
 # Fine material edges replace the flat, heavy cartoon outlines.
 body=re.sub(r'stroke-width="([0-9.]+)"',lambda m:'stroke-width="'+str(min(float(m[1]),1.35))+'"' if float(m[1])<=3 else m[0],body)
 return body
S={k:(label,physical(body)) for k,(label,body) in S.items()}
# A round basketball with pebbled leather, recessed curved seams and grazing light.
rng=random.Random(17)
pebbles=''
for y in range(15,109,3):
 for x in range(17,112,3):
  if (x-64)**2+(y-61)**2<46**2:
   px=x+rng.uniform(-.6,.6);py=y+rng.uniform(-.6,.6)
   pebbles+=f'<circle cx="{px:.2f}" cy="{py:.2f}" r=".55" fill="#54280e" opacity=".17"/><circle cx="{px-.23:.2f}" cy="{py-.28:.2f}" r=".3" fill="#fff0be" opacity=".23"/>'
seams='M16 62Q64 47 112 63M60 12Q46 62 65 111M30 25Q96 58 30 100M98 24Q34 61 99 99'
b='<circle cx="64" cy="61" r="47" fill="url(#ball-orange)" stroke="#88401f" stroke-width=".7"/>'+pebbles
b+='<g clip-path="url(#sphere)"><path d="'+seams+'" fill="none" stroke="#ffcb82" stroke-opacity=".52" stroke-width="3.2" transform="translate(0 .7)"/><path d="'+seams+'" fill="none" stroke="#4a2719" stroke-width="2.1"/></g>'
S['basketball']=('Textured leather basketball',b)
# Baseball: stitched leather sphere in front of a varnished wooden bat.
b='<path d="M19 104 77 22Q87 8 98 16T96 36L31 112Z" fill="url(#wood)" stroke="#80542f" stroke-width=".8"/>'
b+='<path d="M25 101 82 25M28 104 86 26M32 99 90 29" stroke="#6c3b1b" opacity=".22" fill="none" stroke-width=".7"/><path d="m20 103 10 8m-6-12 10 8m-6-12 10 8" stroke="#24282b" stroke-width="2"/>'
b+='<circle cx="65" cy="74" r="34" fill="url(#ball-white)" stroke="#a2a4a0" stroke-width=".65"/>'
b+='<path d="M49 44Q73 75 49 104M82 44Q58 75 82 104" stroke="#87372b" stroke-width=".9" fill="none"/>'
for y in range(49,102,6):
 t=(y-44)/60
 for side in [-1,1]:
  x=65+side*(16-12*math.sin(math.pi*t))
  b+=f'<path d="m{x-2.2:.1f} {y-1.5} 4.4 3" fill="none" stroke="#b83f34" stroke-width="1.45" stroke-linecap="round"/>'
S['baseball']=('Stitched baseball with wooden bat',b)
# Leather paneled soccer ball with perspective edge panels and seam highlights.
b='<circle cx="64" cy="61" r="47" fill="url(#ball-white)" stroke="#7c898c" stroke-width=".7"/>'
b+='<g clip-path="url(#sphere)"><path d="m61 39 20 13-7 23-25 1-8-23ZM24 21l15 3 4 16-20 9L12 33Zm73-2-14 6 2 18 22 6 8-15ZM17 77l20-2 9 20-12 16-19-9Zm94-2-22 1-8 22 16 14 18-10ZM59 111l-9-17 27-1 8 17Z" fill="#26333b"/><path d="m61 39 0-24m20 37 25-4M74 75l8 23M49 76 37 75m4-22 2-13M39 24l22-9 22 10M23 49l-6 28m90-28 4 26M46 95l4-1m27-1 4 5" fill="none" stroke="#617078" stroke-width="1.2"/><ellipse cx="44" cy="28" rx="26" ry="15" fill="#fff" opacity=".17" transform="rotate(-25 44 28)"/></g>'
S['soccer']=('Paneled soccer ball',b)
# Figure skate: folded white leather, laces, polished heel and hollow-ground blade.
b='<path d="M37 13 70 16 68 48Q74 61 95 67 108 72 110 87L103 94 23 93 18 84 23 65 32 55Z" fill="url(#ball-white)" stroke="#81929a" stroke-width="1"/>'
b+='<path d="m38 18 6 34-17 25q38 11 77 4M34 25l25 3-1 27q7 18 32 22" fill="none" stroke="#a0a9aa" stroke-width=".9"/>'
b+='<path d="M20 85q44 9 90 0l-3 10H20Z" fill="#3a3735"/><path d="M26 95h18v9H26Zm48 0h18v9H74Z" fill="url(#steel)"/><path d="M20 106h78q14 0 18-11l3 1q-3 16-20 17H19Z" fill="url(#steel)" stroke="#667c86" stroke-width=".5"/>'
for y in range(27,62,6):
 x=41-(y-27)*.12
 b+=f'<circle cx="{x}" cy="{y}" r="1.4" fill="#6b7b83"/><circle cx="{x+17}" cy="{y+2}" r="1.4" fill="#6b7b83"/><path d="m{x} {y} 17 2m-17 4 17-2" stroke="#fff" stroke-width="1.8" fill="none"/>'
S['winter-sports']=('White leather figure skate and polished steel blade',b)
DEFS+='<linearGradient id="woven" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#182126"/><stop offset=".45" stop-color="#646b6b"/><stop offset="1" stop-color="#222a2c"/></linearGradient>'
# Gymnastics: paired wooden rings, edge thickness, grain and woven straps.
b=''
for x in [36,90]:
 b+=f'<path d="M{x-3} 8h6v44h-6Z" fill="url(#woven)"/><path d="M{x-1} 8v42" stroke="#fff" stroke-opacity=".5" stroke-width=".6"/>'
 b+=f'<ellipse cx="{x+1}" cy="79" rx="23" ry="29" fill="none" stroke="#74441d" stroke-width="9"/><ellipse cx="{x}" cy="77" rx="23" ry="29" fill="none" stroke="url(#wood)" stroke-width="8"/><ellipse cx="{x-1}" cy="76" rx="22" ry="28" fill="none" stroke="#f4dcb5" stroke-opacity=".7" stroke-width="1"/><ellipse cx="{x}" cy="77" rx="24" ry="30" fill="none" stroke="#9a672d" stroke-opacity=".55" stroke-width=".6"/>'
S['gymnastics']=('Wooden gymnastics rings and suspension straps',b)
# Karate gi: shaded woven cotton, overlapping lapels, stitching and tied black belt.
b='<path d="m40 15-26 19 13 32 13-7-5 47 59 0-5-47 13 7 13-32-28-19-23 19Z" fill="url(#ball-white)" stroke="#9caaa9" stroke-width=".9"/>'
b+='<path d="m43 16 23 27 18-26M48 21 69 47 54 70M40 24 60 48 47 66m-17-27 10 18m58-18-9 18M42 78l-2 23m48-23 2 23" fill="none" stroke="#a7afaa" stroke-width="1.2"/><path d="m47 21 19 22m17-24-16 22" stroke="#fff" stroke-width="2"/>'
b+='<path d="M37 67q27 5 55 0v12q-26 6-55 0Z" fill="url(#woven)"/><path d="m60 76-8 34 12 3 9-35 17 27 9-7-24-26Z" fill="#242b2e" stroke="#10181c" stroke-width=".7"/><path d="m62 79-7 29m18-29 20 20M39 70q23 5 50 0" fill="none" stroke="#646c6b" stroke-width=".8"/>'
S['karate']=('Woven white karate gi and tied black belt',b)
# Unbranded compact car in a three-quarter view, with separate body planes and alloy wheels.
car3d='<path d="M10 70 30 45 74 30 100 43 117 70 114 94 72 108 17 94Z" fill="url(#mefaa56)" stroke="#795632" stroke-width=".7"/>'
car3d+='<path d="M10 70 66 83 72 108 17 94Z" fill="#bf752c"/><path d="m66 83 51-13-3 24-42 14Z" fill="#e8a14c"/>'
car3d+='<path d="m29 48 44-13 21 10-34 16Z" fill="url(#ball-white)"/><path d="m29 48 31 13 6 19-46-11Z" fill="url(#steel)" stroke="#535d60" stroke-width="1"/><path d="m65 61 31-13 12 20-36 11Z" fill="url(#steel)" stroke="#535d60" stroke-width="1"/>'
car3d+='<path d="m39 51 9 2-13 18-9-2Zm43 3 6-2-10 25-5 1Z" fill="#fff" opacity=".25"/><path d="m72 81 40-10M70 86l40-10M95 76v20" fill="none" stroke="#fff3d8" stroke-opacity=".55" stroke-width=".8"/>'
car3d+='<path d="M10 75 24 79 25 84 10 81Zm37 9 18 4 1 5-18-4Z" fill="#fff5ce" stroke="#c3a479" stroke-width=".5"/><path d="m27 81 17 4 1 5-17-4Z" fill="#273138"/><path d="m17 89 48 12M99 85l8-2" stroke="#5e6363" stroke-width="1.2"/>'
for x,y,rx,ry in [(27,94,9,13),(91,95,8,12)]:
 car3d+=f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="#182129"/><ellipse cx="{x-1}" cy="{y-1}" rx="{rx-2}" ry="{ry-2}" fill="url(#steel)" stroke="#202d35" stroke-width="1.5"/><ellipse cx="{x-1}" cy="{y-1}" rx="2" ry="3" fill="#6a7a82"/>'
 for a in range(0,360,60):
  car3d+=f'<path d="M{x-1} {y-1}l0 -8" stroke="#dbe5e7" stroke-width="1.4" transform="rotate({a} {x-1} {y-1})"/>'
car3d+='<path d="m104 64 10-2 4 3-9 4Z" fill="url(#steel)"/>'
S['cars']=('Unbranded car in three-quarter view',car3d)
S['police-car']=('Police car with red and blue emergency lights',car3d+'<path d="m55 40 16-5 12 5-17 5Z" fill="#263541"/><path d="m56 37 7-2 4 7-9-2Z" fill="#cc2e32"/><path d="m64 35 7-2 9 5-12 4Z" fill="#3b8ed2"/><path d="m78 82 8-2 1 9-4 5-5-3Z" fill="#eff2f1" stroke="#65757b" stroke-width=".5"/>')

registry={}
previous=json.loads(Path('src/content/topic-symbols.json').read_text()) if Path('src/content/topic-symbols.json').exists() else {}
for id,(label,body) in S.items():
 svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img"><title>{label}</title><defs>{DEFS}</defs><ellipse cx="65" cy="117" rx="39" ry="4" fill="#273442" opacity=".22" filter="url(#contact)"/><g filter="url(#lift)">{body}</g></svg>\n'
 sha=hashlib.sha256(svg.encode()).hexdigest();file=f'{id}.{sha[:12]}.svg';(out/file).write_text(svg);registry[id]={'src':'/topic-symbols/'+file,'label':label,'sha256':sha,'kind':'original-topic-symbol'}
Path('src/content/topic-symbols.json').write_text(json.dumps(registry,indent=2)+'\n')
# Remove only superseded symbols named by this generator's own previous manifest.
for id,old in previous.items():
 if old['src']!=registry[id]['src']:
  old_path=Path('public'+old['src'])
  if old_path.is_file() and hashlib.sha256(old_path.read_bytes()).hexdigest()==old['sha256']: old_path.unlink()
print('Created',len(S),'material-shaded topic-specific vector symbols')
