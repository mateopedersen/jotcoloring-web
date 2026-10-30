"""Build JotColoring's original, hand-drawn vector system. No external art or fonts.

All illustrated icons use a 128-unit canvas, with a minimum four-unit safe area.
Materials share a light source from the upper left. Functional glyphs stay separate.
Edit these named drawings, then run this script; do not edit the generated sprite.
"""
from pathlib import Path
from hashlib import sha256
import json
import math
import re
import sys

ROOT=Path(__file__).resolve().parents[2]
CHECK_ONLY='--check' in sys.argv
def write_output(file,content):
 if CHECK_ONLY:
  if not file.exists() or file.read_text()!=content:raise SystemExit('Generated SVG output is stale: '+str(file.relative_to(ROOT)))
 else:file.write_text(content)

ICON={}
LABEL={}
GROUP={}

def path(d,fill='none',stroke=None,sw=1.5,extra=''):
 return f'<path d="{d}" fill="{fill}"'+(f' stroke="{stroke}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round"' if stroke else '')+f' {extra}/>'
def ellipse(x,y,rx,ry,fill,extra=''):
 return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{fill}" {extra}/>'
def circle(x,y,r,fill,extra=''):return ellipse(x,y,r,r,fill,extra)
def rect(x,y,w,h,r,fill,stroke=None,sw=1.5,extra=''):
 return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}"'+(f' stroke="{stroke}" stroke-width="{sw}"' if stroke else '')+f' {extra}/>'
def g(body,transform='',extra=''):return f'<g'+(f' transform="{transform}"' if transform else '')+f' {extra}>{body}</g>'
def use(name,x=0,y=0,size=128):return f'<use href="#{name}" x="{x}" y="{y}" width="{size}" height="{size}"/>'
def mat(name):return f'url(#jc3-{name})'
def shadow(x=64,y=116,rx=43):
 return ellipse(x,y,rx,5,'#4c2c21','opacity=".07"')+ellipse(x,y,rx*.7,2.6,'#4c2c21','opacity=".10"')
def sparkle(x,y,s=5,color='#ffac39'):
 return path(f'M{x} {y-s}Q{x+1} {y-1} {x+s} {y}Q{x+1} {y+1} {x} {y+s}Q{x-1} {y+1} {x-s} {y}Q{x-1} {y-1} {x} {y-s}Z',color)
def add(name,label,body,group='Actions'):
 ICON[name]=body; LABEL[name]=label; GROUP[name]=group

def paper(lines=False):
 body=path('M31 10h48l22 23v74q0 7-7 7H31q-7 0-7-7V17q0-7 7-7Z','#c5a98f')+path('M27 6h48l22 23v74q0 7-7 7H27q-7 0-7-7V13q0-7 7-7Z',mat('paper'),'#c5b29d',1.4)
 body+=path('M75 6v16q0 7 7 7h15',mat('fold'),'#c5b29d',1.4)+path('M24 101v-87q0-4 4-4h42','none','#fff',2)
 if lines:body+=path('M33 43h49M33 53h41M33 63h49M33 73h32',stroke='#d8cab9',sw=3)
 return body

def pencil(color='orange'):
 return path('M55 13q0-7 9-7t9 7v81l-9 24-9-24Z',mat(color),'#9e5229',1.5)+path('M59 15v76',stroke='#fff2c7',sw=2.8)+path('M69 15v76',stroke='#72321c',sw=1.4,extra='opacity=".28"')+path('M55 93h18l-9 25Z',mat('wood'),'#b38558',1)+path('m61 110 3 8 3-8Z','#4b3226')+path('M56 17h16',stroke='#9f5933',sw=1)+path('M61 9h7',stroke='#ffe7b3',sw=2)

def brush():
 return path('M60 11q1-8 5-8t5 8l-2 63h-7Z',mat('handle'),'#71381f',1.5)+path('M64 13 63 68',stroke='#ffd291',sw=2)+path('M60 70h10l3 18H57Z',mat('metal'),'#857261',1.2)+path('M59 74h10M58 82h13',stroke='#fff',sw=1.1)+path('M57 87h16c7 13-4 30-26 31 9-8 2-19 10-31Z',mat('bristle'),'#513528',1.3)+path('M59 91c-1 12 5 14-7 23M64 91c5 11-2 20-8 23M69 91c5 9 0 14-5 18',stroke='#ba8855',sw=1.1)+path('M49 116q13-1 20-11',stroke='#2d2c29',sw=2)

def leaf(x,y,angle=0,scale=1):
 return g(path('M0 0C-25-2-29-21-29-21-5-7 4-15 0 0Z',mat('leaf'),'#3d7545',1)+path('M0 0-25-18M-10-6l-2-7M-18-11l-4 1',stroke='#c6e18a',sw=.9),f'translate({x} {y}) rotate({angle}) scale({scale})')

def flower():
 b=path('M63 108c-4-22-2-44 1-65',stroke='#42794b',sw=5)+leaf(62,92,0,1.2)+leaf(62,103,105,1)
 for angle in range(0,360,45):
  b+=g(path('M64 55C43 42 42 15 56 11 71 7 78 32 64 55Z',mat('petal'),'#cc632e',1.2)+path('M62 47c-6-13-10-22-8-29',stroke='#ffe5aa',sw=1.5),f'rotate({angle} 64 55)')
 b+=circle(64,55,16,mat('gold'),'stroke="#b87620" stroke-width="1.5"')
 for n in range(14):
  a=n*2.399;r=2+math.sqrt(n)*2.7;b+=circle(round(64+math.cos(a)*r,2),round(55+math.sin(a)*r,2),1.2,'#a96922','opacity=".75"')
 return b+path('M55 47q5-5 10-3',stroke='#fff1bd',sw=2.2)

def fox():
 b=path('M70 101c44 12 42-18 34-30 0 15-10 11-19 14',mat('fur'),'#99502e',1.5)
 b+=path('M104 72c4 12 2 20-8 25l-10-10c8 1 16-2 18-15Z',mat('cream'),'#ba9470',.8)
 b+=path('M43 61c-17 15-22 45-9 51h46c13-9 4-37-12-51Z',mat('fur'),'#9d4d29',1.4)
 b+=path('M47 69c-9 16-3 29 10 36 13-8 17-22 9-36Z',mat('cream'))
 b+=path('M41 87v21m25-20 3 20M34 111h15m15 0h15',stroke='#813f25',sw=1.7)
 b+=path('m30 40-9-30q-1-5 4-3l27 18m20-1L99 6q5-2 4 4l-8 33',mat('fur'),'#87462c',1.5)
 b+=path('m28 15 7 20 11-9Zm49 11 18-12-5 22Z',mat('rose'),'#a36149',1)
 b+=path('M28 33Q62 9 96 34l9 19-13 3 4 8-12 2 2 8-24 13-26-13 2-8-12-2 5-8-12-3Z',mat('fur'),'#9c4c2b',1.5)
 b+=path('M24 53c18 0 25 8 38 25 12-16 22-25 39-25L89 68 62 86 35 68Z',mat('cream'),'#c69e75',.9)
 b+=path('M33 42q9-5 16 1m26 0q8-5 16-1',stroke='#7a3b23',sw=2)
 for x in [43,81]:
  b+=ellipse(x,48,4.4,5.5,'#292929')+circle(x-1.2,46.2,1.5,'#fff')
 b+=path('M55 67q7-4 14 0l-7 8Z',mat('ink'),'#272b2c',1)+path('M62 75v5m0-1q-4 5-9 0m9 0q4 5 9 0',stroke='#6f4532',sw=1.2)
 b+=path('m31 60 10 2m-9 4 10-1m42-3 9-3m-8 7 9-1M47 28l4-4m4 3 4-5m5 5 4-4',stroke='#ffcc7d',sw=1.2)
 return b

def mandala():
 b=circle(64,61,49,mat('cream'),'stroke="#cd9d5c" stroke-width="1.4"')+circle(64,61,43,'none','stroke="#c79659" stroke-width="1"')
 for a in range(0,360,30):
  b+=g(path('M64 61C45 49 50 24 64 15 78 24 83 49 64 61Z',mat('orange'),'#ad5d2b',1.2)+path('M64 51Q56 35 64 22q8 13 0 29Z',mat('gold'),'#f9e5b6',.7),f'rotate({a} 64 61)')
 for a in range(0,360,45):b+=g(ellipse(64,45,7,14,mat('mint'),'stroke="#54946d" stroke-width="1"'),f'rotate({a} 64 61)')
 return b+circle(64,61,11,mat('gold'),'stroke="#a97130" stroke-width="1.3"')+circle(64,61,4,mat('orange'))

def landscape(line=False):
 return rect(0,0,72,65,3,'#fff' if line else mat('sky'),'#99b7ae' if line else None,1)+circle(53,17,8,'#fff' if line else mat('gold'),'stroke="#35484d" stroke-width="1.3"' if line else '')+path('m0 52 23-33 22 28 12-16 15 21v13H0Z','#fff' if line else mat('leaf'),'#35484d' if line else '#4f8d64',1.2)+path('m14 32 9-13 11 14-9-4-5 4Z','#fff7eb','#35484d' if line else None,1)+path('m0 60 16-15 24 14 16-7 16 9v4H0Z','#fff' if line else mat('orange'),'#35484d' if line else None,1.2)

# Categories: a separate silhouette for every subject, not a generic tile.
add('animals','Animals · red fox',shadow()+fox(),'Categories')
add('flowers','Flowers · garden dahlia',shadow(rx=29)+flower(),'Categories')
add('mandalas','Mandalas · layered rosette',shadow()+mandala(),'Categories')
add('all','All coloring pages',shadow()+g(paper(), 'translate(-6 7) rotate(-12 60 60) scale(.92)')+g(paper(),'translate(13 3) rotate(7 60 60) scale(.89)')+g(flower(),'translate(20 31) scale(.53)')+g(pencil(),'translate(54 22) rotate(29 35 44) scale(.72)'),'Categories')
# Castle with masonry, portcullis and flags.
b=shadow()+path('M20 108h88v7H20Z',mat('stone'),'#c9ab88')
b+=rect(29,49,70,59,3,mat('paper'),'#b08b63')+rect(15,35,25,73,3,mat('stone'),'#b08b63')+rect(88,35,25,73,3,mat('stone'),'#b08b63')
for x in [14,87]:
 b+=path(f'M{x} 37l14-27 14 27Z',mat('orange'),'#b55b28',1.5)+path(f'M{x+14} 11V3h14l-5 5h-9',mat('orange'),'#9c6038',1)
 b+=rect(x+9,51,10,17,4,mat('sky'),'#a27f5e',1)+path(f'M{x+9} 60h10m-5-9v17',stroke='#fdf5e2',sw=1.5)
for y in [76,86,97]:b+=path(f'M17 {y}h21M90 {y}h21',stroke='#d4bda0',sw=1)
b+=path('M49 108V80q15-21 30 0v28Z',mat('wood'),'#88633d',1.4)+path('M55 84v24m9-30v30m9-24v24M50 92h28',stroke='#9d7041',sw=1.6)+circle(69,98,1.8,'#65492c')+rect(51,43,27,6,1,mat('orange'))
add('fantasy','Fantasy · storybook castle',b,'Categories')
# Fir tree ornaments.
b=shadow(rx=34)+rect(57,88,16,24,2,mat('wood'),'#8b613b')
for yy,w in [(76,43),(54,34),(34,25)]:
 b+=path(f'M64 {yy-25}Q{64-w/3} {yy} {64-w} {yy+24}Q64 {yy+32} {64+w} {yy+24}Q{64+w/3} {yy} 64 {yy-25}Z',mat('pine'),'#346c4b',1.4)
 b+=path(f'M{64-w+7} {yy+23}Q64 {yy+10} {64+w-7} {yy+18}',stroke='#b1cb74',sw=1.7)
for x,y,c in [(50,65,'orange'),(77,82,'gold'),(47,92,'rose'),(68,48,'gold'),(82,100,'orange')]:b+=circle(x,y,5,mat(c),'stroke="#fae2b1" stroke-width=".6"')+circle(x-1.7,y-1.7,1.3,'#fff6dd')
b+=path('m64 5 4 11 12 1-9 8 3 12-10-6-10 6 3-12-9-8 12-1Z',mat('gold'),'#b27c35',1.1)
add('holidays','Holidays · decorated evergreen',b,'Categories')
# Camper van, no brand marks or unsupported product identity.
b=shadow()+path('M11 85V49q0-22 19-22h52q10 0 17 9l17 24v31q0 8-8 8H20q-9 0-9-14Z',mat('orange'),'#a9572d',1.6)
b+=path('M12 52h99l4 9v18H12Z',mat('cream'),'#d7b28c',1)+path('M21 34h21v28H18V45q0-9 3-11Zm28 0h21v28H49Zm28 0h8q5 0 9 6l15 22H77Z',mat('glass'),'#72958d',1.5)
b+=path('m24 37 12 0-12 20M53 38h11L53 53M82 38h4l15 18H82Z','#fff','none',extra='opacity=".40"')+path('M46 29v62m28-62v62M20 77h84',stroke='#b56936',sw=1.2)+path('M80 70h8',stroke='#78634e',sw=2.5)
for x in [33,93]:b+=circle(x,97,15,mat('rubber'),'stroke="#2b3030" stroke-width="2"')+circle(x,97,8,mat('metal'),'stroke="#687777" stroke-width="1"')+circle(x,97,3,'#6e7c7b')
b+=rect(9,84,13,9,3,mat('metal'))+rect(105,77,10,10,2,'#fff7bf','#dba158',1)+path('M10 92h9m87 0h11',stroke='#fff1cf',sw=3)
add('vehicles','Vehicles · camper van',b,'Categories')
# Saturn with separate rear/front rings.
b=shadow(rx=39)+g(ellipse(64,62,58,19,'none','stroke="#b66d38" stroke-width="9"')+ellipse(64,62,57,19,'none','stroke="#f5c57b" stroke-width="4"'),'rotate(-25 64 62)')+circle(64,59,37,mat('planet'),'stroke="#c17c3a" stroke-width="1.4"')
b+=path('M33 43q27 8 60-5M29 54q32 12 70-5M30 68q36 11 67-6M39 83q29 5 49-4',stroke='#ffd991',sw=4,extra='opacity=".6"')+g(path('M8 62a56 19 0 0 0 112 0',stroke='#b16a3d',sw=9)+path('M8 61a56 19 0 0 0 112 0',stroke='#f8cd87',sw=4),'rotate(-25 64 62)')+sparkle(103,16,8)+sparkle(21,24,4)+circle(111,99,2,'#cfa66b')
add('space','Space · ringed planet',b,'Categories')
# Clownfish with accurate bands and fins.
b=shadow(rx=38)+path('m37 55-25-21 4 29-4 28 28-21Z',mat('orange'),'#a94f28',1.4)+path('M30 61c8-35 67-40 82-4q8 17-12 27-39 23-70-23Z',mat('orange'),'#a7522a',1.5)
b+=path('m45 41 10-16 27 7 10 9m-45 41 15 17 21-12',mat('orange'),'#a54d27',1.4)+path('M43 43q11 17 5 37l11 6q7-28-2-48Zm35-8q7 26-1 54l9-2q11-28 2-49Z',mat('cream'),'#3d3c37',1.6)+path('M62 60q19-9 19 5L63 76Z',mat('petal'),'#a6532a',1)+path('m66 64 10-1m-9 5 7-2m-57-23 9 17-8 20',stroke='#ffdc97',sw=1)
b+=circle(99,56,6,'#292d2c')+circle(97.5,54,2,'#fff')+path('m107 70 5-2',stroke='#9c4826',sw=1.4)
for x,y,r in [(23,19,5),(10,11,3),(111,28,4)]:b+=circle(x,y,r,mat('glass'),'stroke="#78ada6" stroke-width=".8"')+circle(x-1,y-1,r/3,'white')
add('ocean','Ocean · clownfish',b,'Categories')
# Cupcake with ridged paper and berry.
b=shadow(rx=37)+path('M27 61h75l-10 49q-28 9-55 0Z',mat('orange'),'#b25b29',1.6)
for x in [36,47,59,71,83,94]:b+=path(f'M{x} 68 {42+(x-36)*.78} 109',stroke='#ffe0a0',sw=2.5)
b+=path('M28 65C9 58 21 42 33 43c-8-14 6-24 20-21 0-17 25-23 32-6 13-3 25 9 17 20 19 8 18 23 0 29Z',mat('frosting'),'#c47765',1.4)+path('M30 48q34 13 69-3M40 33q24 7 43-1M26 60q13 7 30 4',stroke='#fff4dc',sw=3)
b+=path('M63 15q-13-11-6-17',stroke='#547a42',sw=2)+circle(63,15,10,mat('berry'),'stroke="#ad4536" stroke-width="1"')+path('M58 10q3-3 6-2',stroke='#ffb4a3',sw=2)
for x,y in [(40,52),(70,43),(91,55),(54,31)]:b+=path(f'M{x} {y}l3 3',stroke='#edbd62',sw=2)
add('food','Food · frosted cupcake',g(b,'translate(0 5) scale(.96)'),'Categories')
# Friendly sauropod, anatomically recognizable long neck and four legs.
b=shadow()+path('M33 72C15 80 10 66 7 62c-1 19 11 31 33 26',mat('leaf'),'#447a4b',1.5)
b+=path('M34 68q-13 9-10 26l3 16h14l3-16h18l1 16h15l5-26c21-3 25-23 24-40l-1-17q-1-18-19-19-18 0-20 18-1 16 13 20 0 19-18 19Z',mat('leaf'),'#3b7449',1.6)
b+=path('M32 108h10m23 0h12M42 89l4 21h10l3-20M82 90l-1 17h9l3-20',stroke='#52784a',sw=2)+path('M72 78q24 2 25-36',stroke='#c4db8a',sw=7)+circle(88,27,6,'#243e31')+circle(86.5,25.5,2,'white')+circle(101,34,1.4,'#355d3c')+path('M100 42q-6 3-12-1',stroke='#315c3a',sw=1.3)
for x,y,r in [(38,73,4),(52,75,5),(64,71,3),(83,54,3)]:b+=circle(x,y,r,'#d0d783','opacity=".85"')
add('dinosaurs','Dinosaurs · long-necked dinosaur',b,'Categories')
# Woodland oak.
b=shadow(rx=39)+path('M57 61q8 27-4 49h28q-11-24-3-49Z',mat('wood'),'#785434',1.4)+path('M66 106V60m0 22-12-13m15 3 14-12',stroke='#b68854',sw=2)
b+=path('M31 86C11 83 9 60 24 51 16 30 35 18 47 23 52 3 82 2 91 21c24-2 33 20 21 34 17 16 3 39-17 35-14 14-38 9-40 2-11 4-20 0-24-6Z',mat('leaf'),'#42764a',1.6)
b+=path('M25 64q-5-13 9-17m4-17q8-10 21-4m3-11q16-7 24 6',stroke='#cce18f',sw=3)+path('M87 44q8 7 3 13m-57 20q8 5 16 0M68 71q4 10 17 7',stroke='#4a844b',sw=1.7)+circle(39,56,5,'#dfc36d')+circle(87,31,4,'#dfc36d')
add('woodland','Woodland · oak tree',b,'Categories')
# Puppy.
b=shadow(rx=32)+path('M39 67q-20 20-10 43h51q13-22-8-43Z',mat('cream'),'#9d7553',1.3)+path('M48 80v29m18-29v29m-34 2h18m12 0h18',stroke='#b58c65',sw=1.5)
b+=path('M32 24C12 22 8 67 23 73q13 4 22-21m33-29c22-6 34 42 20 51-10 5-21-7-25-21',mat('wood'),'#845c3a',1.6)+path('M30 39q-1-24 33-25 31-1 32 25l-5 29q-9 21-28 21-24-1-30-21Z',mat('cream'),'#b29372',1.5)
b+=path('M33 29q16-14 24 3l-4 22-21 2Z',mat('wood'))
for x in [47,78]:b+=ellipse(x,48,5,6,'#2b2c2b')+circle(x-1.5,46,1.7,'#fff')
b+=ellipse(63,69,20,14,mat('paper'))+path('M55 64q8-7 16 0l-8 7Z',mat('ink'))+path('M63 71v6m-11-3q11 9 22 0',stroke='#73513a',sw=1.5)+path('M59 80h10q0 14-6 12t-4-12Z',mat('rose'),'#b86653',1)+path('M36 88q25 10 47-1',stroke='#dc7632',sw=5)+circle(62,94,5,mat('gold'))
add('pets','Pets · puppy',b,'Categories')
# Cow.
b=shadow(rx=37)+path('M34 35 16 17q-6 18 17 25m60-7 19-18q6 18-18 25',mat('cream'),'#97795f',1.5)+path('M40 24q-8-6-8-17 13 0 18 14m28 0q6-14 18-14 0 11-9 17',mat('wood'),'#876440',1.3)+path('M30 40q0-24 34-24t34 24l-4 44q-2 25-30 25T34 84Z',mat('paper'),'#a59e92',1.6)
b+=path('M33 35q13-18 29-9l-4 24-23 14Z',mat('ink'))+path('M81 20q19 5 17 25l-17 5-10-17Z',mat('ink'))
for x in [45,83]:b+=ellipse(x,53,4,5,'#222928')+circle(x-1,51.5,1.3,'#fff')
b+=ellipse(64,87,32,24,mat('rose'),'stroke="#b77766" stroke-width="1.5"')+ellipse(47,86,4,6,'#915847')+ellipse(81,86,4,6,'#915847')+path('M51 100q13 5 26-1',stroke='#ac6a57',sw=1.5)+path('M53 30q4-9 7-10m4 10 1-10m4 11 5-8',stroke='#d5c5ae',sw=1.5)
add('farm-animals','Farm animals · cow',b,'Categories')
# Songbird.
b=shadow(rx=40)+path('M20 105h89',stroke='#9a6b42',sw=6)+path('m64 93-4 12m17-14-2 14m-21 0h10m6 0h10',stroke='#aa6635',sw=2)+path('M52 70 9 50l14 40 34-2Z',mat('blue'),'#397e94',1.5)+path('M41 54q1-28 26-32 28-5 37 18 4 16-6 26-6 31-34 33-28-2-29-25Z',mat('blue'),'#3f7b8a',1.5)
b+=path('M87 54q19 14 5 32-21 24-47 4 33 0 42-36Z',mat('orange'),'#d58b4a',1)+path('M44 54q29-8 36 21-25 9-40-7Z',mat('teal'),'#3c7985',1.4)+path('m45 59 21 14m-22-7 12 9m-35-15 19 24',stroke='#a9e3dd',sw=1.4)+path('m104 43 15 7-16 6Z',mat('gold'),'#ad7d38',1.2)+circle(88,40,5,'#263b42')+circle(86.5,38.5,1.8,'#fff')
add('birds','Birds · garden songbird',b,'Categories')

# Creative tools and file formats.
add('brush','Brush · wood handle and metal ferrule',shadow(rx=36)+g(brush(),'rotate(37 64 64)'),'Studio tools')
add('edit','Rename · drawing pencil',shadow(rx=36)+g(pencil(),'rotate(38 64 64)'))
# Art palette includes pigment wells and carved thumb hole.
b=shadow()+path('M22 82C1 59 21 26 54 23c37-4 66 20 57 46-6 15-25 4-34 13-8 8 6 21-9 27-15 7-34-9-46-27Z',mat('wood'),'#8b603b',1.6)
b+=path('M20 64q-2-25 31-34m-20 63q17 15 30 11',stroke='#ecd3a6',sw=2.2)+ellipse(88,59,9,6,'#72533b','transform="rotate(23 88 59)"')+ellipse(88,57,8,5,'#fff2d6','transform="rotate(23 88 57)"')
for x,y,r,c in [(35,54,9,'blue'),(56,39,8,'orange'),(79,39,7,'gold'),(31,77,8,'berry'),(51,92,9,'leaf')]:b+=circle(x+1,y+2,r,'#5b3a2a','opacity=".22"')+circle(x,y,r,mat(c))+ellipse(x-2,y-3,r*.35,r*.2,'#fff','opacity=".65"')
b+=g(brush(),'translate(39 -4) rotate(35 60 60) scale(.76)')
add('studio','Coloring Studio · artist palette',b,'Creative')
# Camera with lens rings, viewfinder, shutter, strap eyelets.
b=shadow()+rect(17,40,97,67,13,'#a8582f')+rect(13,35,99,68,13,mat('orange'),'#aa5730',1.6)+path('M35 36l7-17h32l9 17Z',mat('ink'),'#3b3f40',1.4)+rect(44,23,23,10,3,mat('glass'),'#d0cebe',1)+rect(85,29,16,6,2,mat('metal'),'#8d8172',1)
b+=path('M14 52h98v33H14Z',mat('leather'))+rect(22,42,17,9,2,mat('paper'),'#bd8c5f',1)+circle(70,69,29,mat('metal'),'stroke="#624d3e" stroke-width="2"')+circle(70,69,24,mat('ink'))+circle(70,69,19,mat('lens'),'stroke="#8cc6c7" stroke-width="1.5"')+circle(70,69,11,'#16414d')+ellipse(64,61,7,4,'#eafff7','transform="rotate(-28 64 61)" opacity=".85"')+circle(78,78,3,'#6cbbbc')+path('M24 96h21',stroke='#ffca8a',sw=2)
add('photo','Photo to Coloring Page · camera',b,'Creative')
# Picture frame.
b=shadow()+g(rect(18,14,94,99,9,'#b59270')+rect(14,9,94,99,9,mat('paper'),'#bba188',1.5)+g(landscape(),'translate(24 20) scale(1.03)')+path('M27 97h47',stroke='#c2ae96',sw=3),'rotate(-6 64 64)')
add('image','Image · framed landscape',b,'Files')
# Favorites: warm coral enamel heart with beveled edge; selected state has a separate symbol.
heart=path('M64 108 19 66C-6 39 29 2 57 28l7 7 7-7c28-26 63 11 38 38Z',mat('rose'),'#b9684e',1.6)+path('M64 102 24 64C1 39 28 9 55 33l9 9 9-9c25-23 54 6 31 31Z',mat('cream'),'#fff0d8',1.3)+path('M26 40q3-14 17-10',stroke='#fff',sw=3.2)
add('heart','Favorites · sculpted heart',shadow()+heart,'Creative')
add('heart-filled','Saved favorite · coral heart',shadow()+path('M64 108 19 66C-6 39 29 2 57 28l7 7 7-7c28-26 63 11 38 38Z',mat('berry'),'#9e4233',1.6)+path('M22 47q-3-17 15-22m37 16q12-17 27-5',stroke='#ffd1a7',sw=3,extra='opacity=".85"'),'Creative')
# Single drawing sheet with star and pencil.
b=shadow()+g(paper(),'rotate(-8 60 60)')+g(path('m59 28 9 19 21 3-15 15 4 21-19-10-19 10 4-21-15-15 21-3Z',mat('gold'),'#b97e2f',1.4)+path('m49 49 9-17 6 15',stroke='#fff1b9',sw=2),'rotate(-8 60 60)')+g(pencil(),'translate(47 14) rotate(32 35 55) scale(.76)')+sparkle(106,18,8)
add('ai','Create with AI · idea and pencil',b,'Creative')
# Kids: real wax crayons with wrappers.
b=shadow(rx=37)
for angle,color in [(-23,'blue'),(0,'orange'),(23,'leaf')]:
 b+=g(path('M52 102V34l12-23 12 23v68q-12 8-24 0Z',mat(color),'#8e7255',1.3)+rect(52,45,24,46,1,mat('paper'),'#c0b39b',1)+path('M53 50h22m-22 36h22',stroke='#ad9f88',sw=1.2)+ellipse(64,67,6,10,mat(color))+path('M57 37v6m1-15 5-9',stroke='#fff0c6',sw=1.8),f'rotate({angle} 64 94)')
add('kids','Kids · wax crayons',b,'Creative')
# Boards / artwork.
b=shadow()+g(rect(15,13,90,96,8,mat('wood'),'#a16a3e',1.5)+rect(21,19,78,84,4,mat('cork')),'rotate(-5 60 60)')
for x,y,a,c in [(27,25,-7,'orange'),(61,53,7,'leaf')]:
 b+=g(rect(x,y,43,49,3,mat('paper'),'#c0af99',1)+rect(x+5,y+6,33,28,2,mat(c))+path(f'M{x+6} {y+33}l10-15 9 8 7-10v17Z',mat('cream'))+circle(x+21,y+3,4,mat('berry')),f'rotate({a} {x+21} {y+25})')
add('artwork','My artwork · pinned drawings',b,'Creative')
add('boards','Boards · pinned drawings',b)
# Printer: paper in/out, control lights and recessed slot.
b=shadow()+rect(32,7,65,65,4,mat('paper'),'#b9ada0',1.4)+path('M43 21h42m-42 9h31',stroke='#b8b4ac',sw=2.4)+rect(12,40,106,57,12,mat('metal'),'#8c867c',1.5)+path('M14 62h101v23H14Z',mat('orange'),'#a45d32',1)+rect(27,72,77,15,5,mat('ink'))+circle(102,52,4,mat('leaf'))+circle(89,52,3,'#f7d98c')
b+=path('M36 78h58l5 34H31Z',mat('paper'),'#b5a797',1.3)+path('M43 89h42m-43 7h35m-36 7h38',stroke='#b3b5ae',sw=2)+path('M19 47q3-4 9-4h14',stroke='#fff',sw=2)
add('printer','Printing guide · desktop printer',b,'Creative')
# File sheets, each format has a meaningful illustration.
for fmt,label,color in [('pdf','PDF','orange'),('png','PNG','blue'),('jpeg','JPG','gold'),('webp','IMG','leaf'),('svg','SVG','purple'),('docx','DOCX','blue')]:
 b=shadow()+paper()
 if fmt=='svg':
  b+=path('M35 62C33 30 81 31 83 61',stroke='#7559a5',sw=3)+path('M35 62 30 37m53 24 4-24M30 37h57',stroke='#aa8cc7',sw=1.2)
  for x,y in [(35,62),(30,37),(83,61),(87,37)]:b+=rect(x-3,y-3,6,6,1,mat('purple'),'#705193',1)
 elif fmt in ['webp','png','jpeg']:
  b+=g(landscape(),'translate(30 34) scale(.78 .55)')
 elif fmt=='docx':
  b+=rect(31,35,10,8,1,mat('blue'))+path('M47 36h35m-35 6h31M32 51h50m-50 8h44m-44 8h33',stroke='#7a9fbc',sw=2.3)
 else:
  b+=path('M42 65c8-10 13-25 13-30s-6-6-6 0 10 23 24 29c13 5 14-3 5-5-12-3-27 0-36 6-11 7-12 13-5 11 5-2 9-9 10-12',stroke='#cf542c',sw=2.3)
 b+=rect(14,77,88,27,6,'#9b5a32')+rect(13,74,88,27,6,mat(color),'#b17d52',1.2)+path('M20 78h73',stroke='#fff',sw=1.2,extra='opacity=".45"')+f'<text x="57" y="93" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" font-weight="800" fill="white">{label}</text>'
 add('file-'+fmt,f'{label} file',b,'Files')
add('pdf','PDF document',ICON['file-pdf'],'Files')
# License: original page and embossed wax-style approval seal.
b=shadow()+paper(True)+g(path('m73 81-8 32 15-7 11 10 5-33Z',mat('orange'),'#b96731',1.2)+circle(87,75,22,mat('gold'),'stroke="#b98a3e" stroke-width="2"')+circle(87,75,17,'none','stroke="#fff2bd" stroke-width="1.3"')+path('m77 75 7 7 14-16',stroke='#fff',sw=4),'rotate(-5 87 75)')
add('license','Artwork license · permission seal',b,'Creative')
# Help, FAQ, contact: distinct speech bubbles/envelope.
for name,label in [('help','Help · question bubble'),('faq','FAQ · conversation bubbles')]:
 b=shadow(rx=40)
 if name=='faq':b+=path('M23 15h73q10 0 10 10v42q0 10-10 10H57L36 92V77H23q-10 0-10-10V25q0-10 10-10Z',mat('paper'),'#bfb5a3',1.4)+path('M27 33h51m-51 11h39',stroke='#bfb5a3',sw=3)
 tr='translate(22 30) scale(.77)' if name=='faq' else ''
 b+=g(path('M24 17h76q12 0 12 12v52q0 12-12 12H61l-27 19V93H24q-12 0-12-12V29q0-12 12-12Z',mat('orange'),'#aa5a32',1.6)+path('M19 33q0-9 10-9h52',stroke='#ffe9b5',sw=2.5)+path('M51 45c0-19 30-20 30-2 0 12-17 12-17 25',stroke='#fff9ee',sw=6)+circle(64,80,3.4,'#fff9ee'),tr)
 add(name,label,b,'Creative')
b=shadow()+g(rect(11,28,107,77,8,mat('paper'),'#bba289',1.5)+path('M13 34 64 77l51-43',mat('orange'),'#b96935',1.5)+path('m13 99 36-32m29 0 37 32',stroke='#c8a589',sw=1.6)+path('m21 38 43 35 43-35',stroke='#ffe6b2',sw=2),'rotate(-6 64 64)')
add('mail','Contact · envelope',b,'Creative')
# About: open coloring book.
b=shadow()+path('M11 30q28-13 53 0 26-13 53 0v76q-27-8-53 3-26-11-53-3Z',mat('wood'),'#9b6f45',1.5)+path('M14 22q26-11 50 1 23-12 50-1v77q-27-6-50 5-25-11-50-5Z',mat('paper'),'#c5b299',1.4)+path('M64 23v81',stroke='#b7a68e',sw=1.6)+g(flower(),'translate(10 31) scale(.42)')+path('M78 42h22M78 51h25m-25 9h19M78 81h21',stroke='#baa88f',sw=2.1)+g(pencil(),'translate(74 43) rotate(30 20 30) scale(.53)')
add('about','About JotColoring · open coloring book',b,'Creative')
# Search glass.
b=shadow()+g(path('M58 70h17v47H58Z',mat('orange'),'#a35a32',1.5)+path('M62 77v33',stroke='#ffd5a0',sw=2.5)+rect(56,64,21,16,3,mat('metal'),'#89928d',1.3)+circle(66,40,31,mat('metal'),'stroke="#6f8987" stroke-width="1.5"')+circle(66,40,24,mat('glass'),'stroke="#658c8b" stroke-width="1.4"')+path('M49 37q1-14 16-15',stroke='#fff',sw=3.8)+path('M58 56q11 5 21-6',stroke='#d8fff1',sw=1.8),'rotate(-38 64 64)')
add('search','Search · magnifying glass',b,'Creative')
add('zoom','Zoom · magnifying glass',b+path('M47 42h20m-10-10v20',stroke='#365f63',sw=3),'Studio tools')
# Fill can tilted, with a paint drop.
b=shadow()+g(path('M30 32h56l-4 62q-25 14-48 0Z',mat('metal'),'#84958e',1.5)+ellipse(58,33,28,10,mat('ink'),'stroke="#cedcd0" stroke-width="2"')+ellipse(58,33,21,6,mat('orange'))+path('M30 53v-19c0-31 57-31 57 0v20',stroke='#7d8a84',sw=4)+path('M30 50v-17c0-28 57-28 57 0v17',stroke='#ecf1dc',sw=1.5)+path('M33 58q25 10 51 0l-2 30q-23 12-48 0Z',mat('orange'))+path('M41 65v19',stroke='#ffdb9a',sw=3),'rotate(-28 58 64)')+path('M98 79c-4 13-12 17-12 25a12 12 0 0 0 24 0c0-8-8-13-12-25Z',mat('orange'),'#b35c2f',1.3)+path('M93 100q-3 7 3 10',stroke='#ffe4b2',sw=2)
add('fill','Fill · paint bucket',b,'Studio tools')
# Eraser with translucent edge and sleeve.
b=shadow()+g(path('M24 22h80v70l-14 16H24Z',mat('rose'),'#b97765',1.5)+path('m104 22 8 12v62l-22 12 14-16Z','#c57766','#a76e5b',1.2)+rect(24,53,80,34,1,mat('paper'),'#c8bca5',1.3)+path('M31 26h64M31 58h64',stroke='#fff1dd',sw=2.2)+path('M37 64h34m-34 8h51',stroke='#cbbca6',sw=2),'rotate(32 64 64)')
add('eraser','Erase · artist eraser',b,'Studio tools')
# Pipette.
b=shadow(rx=33)+g(path('M51 14q13-18 26 0v25H51Z',mat('orange'),'#a95831',1.5)+rect(49,35,30,13,4,mat('metal'),'#788c89',1.3)+path('M55 48h18v41l-7 10v11l-8 7V97l-3-8Z',mat('glass'),'#649494',1.4)+path('M59 70h10v19l-7 10v9',stroke='#2a9a9c',sw=4)+path('M59 51v32M56 18v12',stroke='#fff',sw=2),'rotate(34 64 64)')
add('picker','Pick a color · glass eyedropper',b,'Studio tools')
# Hand.
b=shadow(rx=35)+path('M38 109 22 79q-8-17 1-20 8-4 18 18V30q0-13 9-13t9 13v26-39q0-12 9-12t9 12v39-32q0-10 8-10t8 10v37-22q0-10 8-10t8 10v43q0 20-22 28Z',mat('skin'),'#b27c52',1.5)+path('M49 30v35m19-44v40m17-31v34m14-16v21M42 82q14-14 30-1m-18 22h26',stroke='#c58c61',sw=1.5)+path('M46 25v18m18-28v24m17-18v19',stroke='#fff0c8',sw=2.3)
add('move','Move canvas · open hand',b,'Studio tools')
# Library actions. Everyday objects are illustrated; small navigation keeps crisp glyphs.
b=shadow()+path('M8 62C35 22 91 22 120 62 92 103 35 103 8 62Z',mat('paper'),'#988979',1.6)+circle(64,62,27,mat('teal'),'stroke="#3d7b82" stroke-width="1.5"')+circle(64,62,15,mat('ink'))+circle(56,53,6,'#fff')+circle(73,70,3,'#b0dfd3')+path('M18 56q45-39 91 0',stroke='#cfb594',sw=2)+path('m30 38-5-9m27 2-2-12m26 12 3-12m22 20 6-9',stroke='#a2754b',sw=2)
add('eye','Quick view · eye',b)
add('notes','Notes, tags and rating · notebook',shadow()+rect(24,13,83,102,7,mat('orange'),'#a75b31',1.5)+rect(20,9,80,101,7,mat('paper'),'#bca48a',1.4)+path('M38 12v95',stroke='#efb4a0',sw=1)+path('M46 34h40m-40 13h32m-32 13h40m-40 13h35',stroke='#aeb6ae',sw=2)+''.join(ellipse(24,y,6,3,'none','stroke="#a79980" stroke-width="2.4"') for y in [24,40,56,72,88])+g(pencil(),'translate(61 36) rotate(32 22 40) scale(.62)'))
folder=path('M13 39V25q0-9 9-9h29l10 12h44q9 0 9 9v62q0 9-9 9H22q-9 0-9-9Z',mat('orange'),'#a66330',1.4)+path('M21 42h88l-9 64H17Z',mat('paper'),'#c0a886',1.2)+path('M10 51q0-8 9-8h91q10 0 8 10l-9 48q-1 10-11 10H19q-8 0-9-10Z',mat('gold'),'#ba873e',1.5)+path('M19 49h83',stroke='#fff0b7',sw=2.5)
add('folder','Move to a board · folder',shadow()+folder)
star=path('m64 10 15 32 36 4-26 25 6 36-31-17-31 17 6-36L13 46l36-4Z',mat('gold'),'#ac792d',1.7)+path('m64 20-10 28-28 3 22 18-6 26 22-15 23 15-6-26 22-18-28-3Z',mat('orange'),'#ffd383',1)+path('M64 20v60L48 69 54 48Z','#fff2b4','none',extra='opacity=".5"')
add('star','Star artwork · gold star',shadow()+star)
share=path('m35 61 53-30m-53 33 53 30',stroke='#a85631',sw=10)+path('m34 57 53-30m-53 33 53 30',stroke='#f5b76b',sw=6)
for x,y in [(29,59),(94,23),(94,96)]:share+=circle(x+1,y+3,17,'#a85933')+circle(x,y,17,mat('orange'),'stroke="#ac6034" stroke-width="1.3"')+circle(x-4,y-5,6,'#ffe3ac','opacity=".8"')
add('share','Share · connected nodes',shadow()+share)
link=rect(18,31,67,31,15,'none','#9e5c33',10,extra='transform="rotate(-38 51 47)"')+rect(18,28,67,31,15,'none',mat('gold'),7,extra='transform="rotate(-38 51 47)"')+rect(44,67,67,31,15,'none','#6e8583',10,extra='transform="rotate(-38 77 83)"')+rect(44,64,67,31,15,'none',mat('metal'),7,extra='transform="rotate(-38 77 83)"')+path('m52 74 24-24',stroke='#b7854c',sw=8)+path('m51 71 24-24',stroke='#ffe5a3',sw=4)
add('link','Copy page link · linked rings',shadow()+link)
copy=shadow()+g(paper(True),'translate(-8 0) rotate(-9 60 60) scale(.9)')+g(paper(True),'translate(24 22) scale(.78)')
add('copy','Copy details · duplicate documents',copy)
add('duplicate','Duplicate artwork · two drawings',shadow()+g(paper(),'rotate(-12 60 60) scale(.88)')+g(paper(),'translate(24 21) scale(.8)')+circle(94,95,23,mat('leaf'),'stroke="#477e4f" stroke-width="1.5"')+path('M82 95h24m-12-12v24',stroke='#fff6d9',sw=4))
# Export / import tray.
def tray():
 return path('M15 85 27 69h75l12 16v24q0 7-7 7H22q-7 0-7-7Z',mat('metal'),'#7f8e88',1.5)+path('M16 85h25l7 10h34l7-10h25',mat('paper'),'#b6bcaa',1.2)+path('M22 109h85',stroke='#ecf1db',sw=2)
def downarrow(up=False):
 d='M52 12h24v43h18L64 86 34 55h18Z' if not up else 'M52 85h24V42h18L64 11 34 42h18Z'
 return path(d,mat('orange'),'#ad592b',1.6)+path('M57 19v42H44m15 15 20-20' if not up else 'M57 77V36H44m17-15 17 17',stroke='#ffe8b2',sw=2.2)
add('download','Download · arrow into tray',shadow()+tray()+downarrow())
add('upload','Import · arrow from tray',shadow()+tray()+downarrow(True))
add('up','Move earlier · up arrow',shadow(rx=30)+g(downarrow(True),'translate(0 9)'))
add('down','Move later · down arrow',shadow(rx=30)+g(downarrow(),'translate(0 9)'))
# Backup drive with status light.
b=shadow()+path('M30 22h69l17 58v24q0 9-9 9H21q-9 0-9-9V80Z',mat('metal'),'#7b8c89',1.5)+path('M15 81h99v20H15Z',mat('ink'),'#707d76',1)+path('M31 32h65l11 41H20Z',mat('paper'),'#b8bfad',1)+circle(98,94,4,mat('leaf'))+path('M25 93h37',stroke='#a7b7ab',sw=2)+g(downarrow(),'translate(25 12) scale(.58)')
add('backup','Editable backup · storage drive',b)
# Archive box.
b=shadow()+path('M20 43h89v67H20Z',mat('wood'),'#9a683e',1.5)+path('M14 29h100v23H14Z',mat('gold'),'#b68a47',1.5)+path('M22 54h84v5H22Z','#6f4b30','none',extra='opacity=".2"')+rect(44,65,42,24,3,mat('paper'),'#ac8d65',1.3)+path('M53 75h24m-24 6h17',stroke='#ad9b7f',sw=1.8)+path('M20 34h84',stroke='#fff0bd',sw=2.3)
add('archive','Archive · storage box',b)
# Bin.
b=shadow(rx=33)+path('M27 32h77l-7 77q-33 9-63 0Z',mat('metal'),'#7e8a83',1.6)+path('M44 43v56m20-56v58m20-58v56',stroke='#82978f',sw=5)+path('M43 43v56m20-56v58m20-58v56',stroke='#e4eddb',sw=2)+path('M47 25v-9q17-9 34 0v9',stroke='#8c9d90',sw=6)+rect(22,24,88,15,4,mat('metal'),'#7b8f84',1.5)+path('M29 28h70',stroke='#f3f5e8',sw=2)
add('trash','Trash · wastebasket',b)
# Time, tags, settings.
b=shadow()+circle(64,62,50,mat('orange'),'stroke="#a76136" stroke-width="1.6"')+circle(64,62,42,mat('paper'),'stroke="#a29680" stroke-width="1.2"')
for a in range(12):
 angle=a*math.pi/6;b+=path(f'M{64+math.sin(angle)*34:.2f} {62-math.cos(angle)*34:.2f}l{math.sin(angle)*3:.2f} {-math.cos(angle)*3:.2f}',stroke='#6c7f75',sw=2)
b+=path('M64 36v26l21 12',stroke='#344f4f',sw=4)+circle(64,62,4,mat('orange'))+path('M30 45q8-18 25-20',stroke='#fff',sw=2.5)
add('clock','Recently saved · clock',b)
b=shadow()+path('m17 66 45-46 40-1 9 41-45 46q-7 7-14 0L17 80q-7-7 0-14Z',mat('gold'),'#b4813e',1.5)+circle(88,40,8,mat('paper'),'stroke="#b38144" stroke-width="1.5"')+path('M89 40c34-23 6-45-3-25',stroke='#9c6d44',sw=2.5)+path('m38 70 28-28M48 80l26-27',stroke='#fff1c3',sw=3)
add('tag','Tags · paper label',b)
b=shadow()
for a in range(0,360,45):b+=g(rect(54,8,20,33,3,mat('metal'),'#899b91',1.5),f'rotate({a} 64 62)')
b+=circle(64,62,37,mat('metal'),'stroke="#80988c" stroke-width="1.5"')+circle(64,62,22,mat('orange'),'stroke="#aa6638" stroke-width="1.4"')+circle(64,62,12,mat('paper'),'stroke="#a8b4a4" stroke-width="1.3"')+path('M40 49q8-14 23-14',stroke='#fff8dc',sw=2.4)
add('settings','Settings · precision gear',b)
# Filter glass funnel.
b=shadow(rx=30)+path('M13 19h102L78 65v38l-27 12V65Z',mat('glass'),'#6b9390',1.5)+path('M19 28h90L76 68v27l-21 9V68Z',mat('orange'),'#b26a35',1.2)+ellipse(64,20,51,10,mat('metal'),'stroke="#8b9d92" stroke-width="1.4"')+ellipse(64,20,42,5,mat('glass'))+path('M29 38 59 70v23',stroke='#ffe9b1',sw=3)
add('filter','Filters · funnel',b)
# Lock & selection.
b=shadow(rx=34)+path('M37 58V34a27 27 0 0 1 54 0v24',stroke='#7d9087',sw=13)+path('M35 57V34a27 27 0 0 1 54 0v24',stroke='#e3e9d3',sw=6)+rect(22,49,85,63,12,mat('gold'),'#ad7e37',1.5)+circle(64,75,9,mat('ink'))+path('m60 80-3 18h14l-3-18Z',mat('ink'))+path('M32 58h60',stroke='#fff1be',sw=2.5)
add('lock','Privacy · padlock',g(b,'translate(0 4) scale(1 .96)'))
add('select','Select artwork · checked card',shadow()+g(paper(),'rotate(-6 64 64)')+circle(73,71,29,mat('leaf'),'stroke="#40794e" stroke-width="1.5"')+path('m57 71 12 13 23-28',stroke='#fff9dd',sw=5))
add('check','Saved · check seal',shadow(rx=35)+circle(64,60,46,mat('leaf'),'stroke="#44784b" stroke-width="1.5"')+circle(64,60,39,'none','stroke="#c1dd99" stroke-width="1.2"')+path('m41 60 17 17 31-37',stroke='#fffbe7',sw=7))
# Layers and project stack.
b=shadow()+path('m13 85 51-26 51 26-51 28Z',mat('wood'),'#97734e',1.5)+path('m13 65 51-26 51 26-51 28Z',mat('paper'),'#b6a68f',1.5)+path('m13 45 51-26 51 26-51 28Z',mat('orange'),'#ad6634',1.5)+path('m23 44 41-19 40 19',stroke='#ffe4ab',sw=2)
add('layers','Layers · stacked sheets',b,'Studio tools')
add('projects','Projects · layered artwork',b)
# Pin.
b=shadow(rx=25)+g(path('M61 70h7v39l-3 11-4-11Z',mat('metal'),'#78877d',1.2)+path('M43 18h42l-8 40 18 15q-30 13-60 0l18-15Z',mat('orange'),'#ac6032',1.5)+ellipse(64,19,22,8,mat('gold'),'stroke="#ba8a43" stroke-width="1.3"')+path('M55 29 52 55',stroke='#ffe4ab',sw=3),'rotate(28 64 64)')
add('pin','Pin to top · pushpin',b)
# Layout view icons: miniature actual layouts.
for name,label,blocks in [('grid','Grid view',[(21,24,38,34),(68,24,38,34),(21,68,38,34),(68,68,38,34)]),('list','List view',[(21,24,85,18),(21,53,85,18),(21,82,85,18)]),('masonry','Masonry view',[(21,24,38,47),(68,24,38,28),(21,80,38,22),(68,61,38,41)])]:
 b=shadow()+rect(11,12,107,103,12,mat('paper'),'#c4ae94',1.4)
 for i,(x,y,w,h) in enumerate(blocks):b+=rect(x,y,w,h,5,mat('orange' if i==0 else 'mint'),'#bdb090',1)+path(f'M{x+5} {y+5}h{w-10}',stroke='#fff',sw=1.2,extra='opacity=".6"')
 add(name,label,b)
# Rounded information medallion.
for name,label,glyph in [('info','Information','i')]:
 b=shadow(rx=34)+circle(64,61,47,mat('blue'),'stroke="#467d97" stroke-width="1.6"')+circle(64,61,39,'none','stroke="#bee2dc" stroke-width="1.2"')+f'<text x="64" y="86" text-anchor="middle" font-family="Georgia,serif" font-size="76" font-weight="bold" fill="#fff8e6">{glyph}</text>'
 add(name,label,b)
# Direction/refresh icons rendered as physical ribbon only in larger library actions.
for name,label,transform in [('undo','Undo',''),('redo','Redo','translate(128 0) scale(-1 1)'),('refresh','Refresh','')]:
 b=path('M31 43C48 12 101 22 108 56c7 29-11 49-33 53l-4-17c20-3 26-29 9-42-10-9-23-8-33 1l15 8-48 12 3-47Z',mat('orange'),'#a75c30',1.6)+path('M36 42q24-23 49-4',stroke='#ffe8b4',sw=3)
 if name=='refresh':b+=path('M71 96 89 83l-2 26-24-5Z',mat('gold'),'#b27b3d',1)
 add(name,label,shadow()+g(b,transform))
add('save','Save · archive drawer',ICON['backup'])

# Age cards: readable age digits, no 18+ symbolism.
for band,label,color in [('3-5','3–5','orange'),('6-8','6–8','leaf'),('9-12','9–12','blue'),('13-17','13–17','purple'),('adults','Adults','gold')]:
 b=shadow(rx=37)+g(paper(),'rotate(-7 60 60) scale(.94)')+circle(58,56,31,mat(color),'stroke="#a08969" stroke-width="1.2"')
 if band=='adults':b+=g(mandala(),'translate(30 29) scale(.44)')
 else:b+=f'<text x="58" y="63" text-anchor="middle" font-family="Arial,sans-serif" font-size="{18 if len(label)>4 else 22}" font-weight="800" fill="#fff">{label}</text>'
 b+=path('M38 96h37',stroke='#bba88c',sw=2.2)+g(pencil(),'translate(50 20) rotate(26 25 50) scale(.7)')
 add('age-'+band,'Recommended age · '+label,b,'Age recommendations')

# Privacy shield and clearer save/refresh objects.
shield=path('m64 9 43 17v35c0 31-43 52-43 52S21 92 21 61V26Z',mat('metal'),'#719080',1.6)+path('m64 17 35 14v30c0 24-35 44-35 44S29 85 29 61V31Z',mat('leaf'),'#548258',1.2)+path('m42 59 16 17 29-33',stroke='#fffbe9',sw=6)+path('m34 34 30-11 26 10',stroke='#d8edaf',sw=2)
add('privacy','Privacy · protective shield',shadow(rx=36)+shield,'Creative')
add('save','Save · project disk',shadow()+path('M23 12h72l18 18v72q0 10-10 10H23q-10 0-10-10V22q0-10 10-10Z',mat('orange'),'#a65e33',1.6)+rect(34,12,53,37,3,mat('metal'),'#8e9d92',1.2)+rect(66,17,12,27,1,mat('ink'))+rect(30,64,66,48,4,mat('paper'),'#b7a58d',1.2)+path('M41 77h44m-44 10h35m-35 10h40',stroke='#b5b6a4',sw=2)+path('M20 24v68',stroke='#ffdb9e',sw=2))
add('refresh','Refresh · two rotating arrows',shadow()+path('M22 48C29 16 73 9 96 34l12-14 6 39-38-1 12-12C72 29 44 35 39 53Z',mat('orange'),'#b46b36',1.5)+path('M106 80c-7 32-51 39-74 14l-12 14-6-39 38 1-12 12c16 17 44 11 49-7Z',mat('mint'),'#68947a',1.5)+path('M29 43q16-26 44-17M99 85q-16 26-44 17',stroke='#fff2c8',sw=2))

# Larger page illustrations use the same tangible objects at a readable scale.
SCENES={}
def scene_base():
 return ellipse(210,287,158,16,'#795237','opacity=".08"')+circle(210,146,125,mat('soft'))+sparkle(45,64,10)+sparkle(369,54,7)+circle(366,240,4,'#a4bf90')
def sheet(x,y,w,h,angle=0):
 return g(rect(x+5,y+8,w,h,12,'#b49370','none',extra='opacity=".28"')+rect(x,y,w,h,12,mat('paper'),'#c8b397',1.7)+path(f'M{x+17} {y+16}h{w-34}',stroke='#fff',sw=2),f'rotate({angle} {x+w/2} {y+h/2})')
SCENES['about']=scene_base()+use('about',47,39,258)+g(use('studio',222,161,142),'rotate(-8 293 232)')+use('flowers',276,17,99)
SCENES['license']=scene_base()+sheet(110,37,188,225,-7)+use('license',111,55,198)+use('edit',258,117,149)+use('all',30,168,99)
SCENES['help']=scene_base()+use('about',45,101,243)+use('help',191,22,173)+use('search',262,159,133)
SCENES['privacy']=scene_base()+sheet(103,37,185,220,-8)+use('privacy',112,58,185)+use('lock',262,174,113)+use('edit',28,140,138)
SCENES['notfound']=scene_base()+use('all',75,34,250)+use('search',240,151,133)
# A half-colored flower page shows privacy in the context of coloring, not a cookie biscuit.
SCENES['cookies']=ellipse(155,256,124,13,'#795237','opacity=".1"')+sheet(46,20,163,220,-8)+g(flower(),'translate(69 59) scale(1.05)')+g(g(re.sub(r'fill="url\([^)]*\)"', 'fill="white"', re.sub(r'stroke="#[a-fA-F0-9]+"', 'stroke="#393e36"',flower())),'translate(69 59) scale(1.05)'),extra='clip-path="url(#jc3-cookie-half)"')+path('M137 54v142',stroke='#d0b69b',sw=1,extra='stroke-dasharray="3 5"')+use('edit',162,27,145)+use('privacy',186,152,114)+sparkle(265,39,8)
# The two views use identical mountain geometry. This is an explanatory illustration.
SCENES['photo']=scene_base()+g(sheet(30,55,158,203)+g(landscape(),'translate(42 69) scale(1.86 2.27)')+path('M52 235h76',stroke='#baa990',sw=4),'rotate(-8 109 156)')+g(sheet(227,38,158,203)+g(landscape(True),'translate(239 52) scale(1.86 2.27)')+path('M249 218h76',stroke='#baa990',sw=4),'rotate(7 306 139)')+circle(210,149,30,mat('orange'),'stroke="#fff5df" stroke-width="5"')+path('M195 149h29m-11-11 11 11-11 11',stroke='#fff8e6',sw=3)+use('edit',292,196,110)

# Material definitions are shared once per sprite, not repeated in every button.
colors={
 'paper':['#ffffff','#fffdf4','#e4d9c3'], 'fold':['#fff8de','#ebdfc6','#c4b398'],
 'orange':['#ffe1a3','#ff943d','#c24c21'], 'gold':['#fff0af','#efba55','#b78330'],
 'cream':['#fffef3','#f8e7c6','#d8b88e'], 'fur':['#ffcf7c','#e98a3d','#ae4d26'],
 'petal':['#ffe6b3','#f5a365','#d7663c'], 'rose':['#ffe0ce','#eeaa91','#c1725d'],
 'leaf':['#d0e695','#77b261','#36774f'], 'pine':['#b6d694','#548d62','#275e49'],
 'mint':['#def2c1','#a0c7a4','#5a937e'], 'wood':['#e9c68c','#bc8b53','#875a33'],
 'stone':['#fff0d4','#e5c79d','#b69770'], 'sky':['#e6f7ef','#addcd6','#77b2b2'],
 'glass':['#ffffff','#d0ece2','#81b7b9'], 'blue':['#cfedf0','#72b7cd','#3f7b9b'],
 'teal':['#d1f0db','#6fb6ad','#357788'], 'planet':['#ffe5ac','#edab51','#bd7437'],
 'frosting':['#fff0da','#f5b69f','#d88c83'], 'berry':['#ffc09c','#e7704d','#ac3d35'],
 'metal':['#f6f4df','#bacac0','#718b86'], 'rubber':['#59615e','#35413f','#202d2e'],
 'ink':['#5d6361','#343e40','#1f282d'], 'handle':['#f3b873','#bc6930','#733820'],
 'bristle':['#d4a16a','#936139','#3a3026'], 'lens':['#d9f1e2','#388a9b','#133747'],
 'leather':['#eaa46e','#b96939','#82482f'], 'purple':['#e9d7fa','#b69bce','#7d64a4'],
 'cork':['#e6c991','#c5a570','#a8814f'], 'skin':['#ffe6b9','#e9b281','#bc805b']}
defs=''
for name,stops in colors.items():
 defs+=f'<linearGradient id="jc3-{name}" x1=".13" y1="0" x2=".8" y2="1">'+''.join(f'<stop offset="{o}" stop-color="{c}"/>' for o,c in zip(['0','.48','1'],stops))+'</linearGradient>'
# Eyes and lens have a radial surface reflection as well as clear outline rings.
defs+='<radialGradient id="jc3-soft" cx=".4" cy=".3" r=".7"><stop stop-color="#fff6df"/><stop offset="1" stop-color="#f7dfb9" stop-opacity="0"/></radialGradient>'
defs+='<clipPath id="jc3-cookie-half"><rect x="137" y="40" width="90" height="190"/></clipPath>'
body='<defs>'+defs+'</defs>'+''.join(f'<symbol id="{name}" viewBox="0 0 128 128">{content}</symbol>' for name,content in ICON.items())
body+=''.join(f'<symbol id="scene-{name}" viewBox="0 0 {320 if name=="cookies" else 420} {280 if name=="cookies" else 320}">{content}</symbol>' for name,content in SCENES.items())
svg='<svg xmlns="http://www.w3.org/2000/svg" fill="none">'+body+'</svg>\n'
digest=sha256(svg.encode()).hexdigest()[:12]
filename=f'jotcoloring-icons-{digest}.svg'
out=ROOT/'public/illustrations';out.mkdir(exist_ok=True,parents=True)
if not CHECK_ONLY:
 for old in out.glob('jotcoloring-icons-*.svg'):old.unlink()
write_output(out/filename,svg)
registry={'url':'/illustrations/'+filename,'viewBox':'0 0 128 128','scenes':[{'id':'scene-'+name,'viewBox':'0 0 320 280' if name=='cookies' else '0 0 420 320'} for name in SCENES],'icons':[{'id':name,'label':LABEL[name],'group':GROUP[name]} for name in ICON]}
write_output(ROOT/'src/icons/catalog.json',json.dumps(registry,ensure_ascii=False,indent=2)+'\n')
# Standalone originals for local review. These are generated evidence, not extra client downloads.
preview=ROOT/'.local/svg-design/individual';preview.mkdir(exist_ok=True,parents=True)
for name,content in ICON.items():
 if not CHECK_ONLY:(preview/(name+'.svg')).write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none"><defs>'+defs+'</defs>'+content+'</svg>')
print(f'{len(ICON)} original illustrations → {filename} ({len(svg.encode()):,} bytes)')

# Compatibility sheets keep previously cached pages working, with the refreshed artwork.
compat={
 'category-3d.svg':(96,['all','animals','flowers','fantasy','mandalas','holidays','vehicles','space','ocean','food','dinosaurs','woodland','pets','farm-animals','birds']),
 'creative-tools-v2.svg':(128,['all','animals','flowers','mandalas','kids','studio','photo','ai','artwork','printer','license','about','help','faq','mail']),
 'artwork-actions.svg':(96,['eye','edit','notes','boards','folder','star','share','link','copy','pdf','image','backup','duplicate','up','down','archive','trash','download'])
}
for file,(box,names) in compat.items():
 content=''.join(f'<symbol id="{name}" viewBox="0 0 {box} {box}">'+g(ICON[name],f'scale({box/128})')+'</symbol>' for name in names)
 if file=='creative-tools-v2.svg':content+='<symbol id="pencil" viewBox="0 0 128 128">'+pencil()+'</symbol><symbol id="floral-line" viewBox="0 0 128 128">'+flower()+'</symbol>'
 write_output(out/file,'<svg xmlns="http://www.w3.org/2000/svg" fill="none"><defs>'+defs+'</defs>'+content+'</svg>\n')
# Style choices demonstrate the line styles themselves, with white colorable regions.
import re
for style in ['simple','cute']:
 art=fox()
 art=re.sub(r'fill="(?:url\([^)]*\)|#[a-fA-F0-9]{3,6})"','fill="white"',art)
 art=re.sub(r'stroke="[^"]+"','stroke="#292e2b"',art)
 if style=='cute':
  art+=ellipse(43,48,5.7,7.5,'#292e2b')+ellipse(81,48,5.7,7.5,'#292e2b')+circle(41.4,45.7,1.8,'white')+circle(79.4,45.7,1.8,'white')
 art+=path('M55 67q7-4 14 0l-7 8Z','#292e2b')
 preview_svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 150" fill="none"><rect width="160" height="150" fill="#fffdfa"/>'+g(art,'translate(16 8)')+'</svg>\n'
 write_output(ROOT/'public'/f'style-{style}.svg',preview_svg)
