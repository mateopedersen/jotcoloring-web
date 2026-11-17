"""Original, unbranded collection emblems; orthographic silhouettes, restrained depth.
Run from repository root. No generated brand identities or raster dependencies.
"""
from pathlib import Path
import hashlib, json, math, re
from html import escape
OUT=Path('public/topic-symbols'); OUT.mkdir(exist_ok=True)
S={}
def p(d,f='none',s='#334553',w=.8):return f'<path d="{d}" fill="{f}" stroke="{s}" stroke-width="{w}" stroke-linejoin="round" stroke-linecap="round"/>'
def e(x,y,rx,ry,f,s='none',w=.8):return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{f}" stroke="{s}" stroke-width="{w}"/>'
def c(x,y,r,f,s='none',w=.8):return e(x,y,r,r,f,s,w)
def r(x,y,w,h,f,rx=2,s='none'):return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{f}" stroke="{s}" stroke-width=".8"/>'
def add(ids,label,b):
 for i in ids.split(): S[i]=(label,b)
def wheel(x,y,radius=10):
 b=c(x,y,radius,'url(#rubber)','#18232c')+c(x,y,radius*.67,'url(#metal)','#303c46')+c(x,y,radius*.47,'#435361')
 for a in range(0,360,72):
  a=math.radians(a);b+=p(f'M{x} {y}l{math.sin(a)*radius*.52:.2f} {math.cos(a)*radius*.52:.2f}','none','#dfe7ea',1.7)
 return b+c(x,y,1.6,'#cad3d8')
# Shared physical materials; deliberately no perspective distortion of silhouettes.
DEFS='''<linearGradient id="paint" x2="0" y2="1"><stop stop-color="#a1d5f2"/><stop offset=".36" stop-color="#3989b8"/><stop offset=".6" stop-color="#21638e"/><stop offset=".65" stop-color="#4f9cc6"/><stop offset="1" stop-color="#17466c"/></linearGradient>
<linearGradient id="gold" x2="0" y2="1"><stop stop-color="#ffe0a0"/><stop offset=".4" stop-color="#eeb241"/><stop offset="1" stop-color="#ad6a1c"/></linearGradient>
<linearGradient id="red" x2="0" y2="1"><stop stop-color="#ffb2a4"/><stop offset=".4" stop-color="#d94e44"/><stop offset="1" stop-color="#8e292d"/></linearGradient>
<linearGradient id="green" x2="0" y2="1"><stop stop-color="#b8d4a3"/><stop offset=".4" stop-color="#5c9364"/><stop offset="1" stop-color="#294e3c"/></linearGradient>
<linearGradient id="glass" x2=".8" y2="1"><stop stop-color="#d8edf5"/><stop offset=".4" stop-color="#8ba9b9"/><stop offset=".41" stop-color="#607e90"/><stop offset="1" stop-color="#2d465d"/></linearGradient>
<linearGradient id="metal" x2=".2" y2="1"><stop stop-color="#71808c"/><stop offset=".23" stop-color="#f6f9f9"/><stop offset=".46" stop-color="#9caeb9"/><stop offset=".6" stop-color="#e7eff2"/><stop offset="1" stop-color="#5c707d"/></linearGradient>
<linearGradient id="white" x2=".6" y2="1"><stop stop-color="#ffffff"/><stop offset=".45" stop-color="#f6f4ee"/><stop offset="1" stop-color="#bac5c9"/></linearGradient>
<radialGradient id="rubber" cx=".35" cy=".2" r=".85"><stop stop-color="#52606c"/><stop offset=".6" stop-color="#25313d"/><stop offset="1" stop-color="#111d28"/></radialGradient>
<radialGradient id="leather" cx=".3" cy=".2" r=".85"><stop stop-color="#ffbc6b"/><stop offset=".5" stop-color="#d77b30"/><stop offset="1" stop-color="#85441e"/></radialGradient>
<radialGradient id="ivory" cx=".3" cy=".2" r=".85"><stop stop-color="#fffefa"/><stop offset=".6" stop-color="#f0f0e7"/><stop offset="1" stop-color="#9eafb5"/></radialGradient>
<linearGradient id="wood" x2="1" y2=".3"><stop stop-color="#886039"/><stop offset=".35" stop-color="#eed0a2"/><stop offset=".6" stop-color="#c29763"/><stop offset="1" stop-color="#78512e"/></linearGradient>
<filter id="lift" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="2" stdDeviation="1.5" flood-color="#203544" flood-opacity=".2"/></filter>
<filter id="blur"><feGaussianBlur stdDeviation="2"/></filter>
<clipPath id="sphere"><circle cx="64" cy="61" r="43"/></clipPath>'''
# A long hood, four separate window openings, wheel arches and grounded wheelbase.
# A side view is intentionally used: equal wheel axes and no impossible body planes.
def car(police=False):
 b=p('M10 79 15 65Q17 61 24 60L37 43Q40 39 47 39H72Q79 39 85 46L97 60 112 64Q117 66 118 72V88H109Q107 74 96 74T83 88H46Q44 74 32 74T19 88H10Z','url(#white)' if police else 'url(#paint)')
 b+=p('m29 59 12-14h14v14Zm30-14h13q5 0 9 5l7 9H59Z','url(#glass)','#345263',1)
 b+=p('M12 69h12m79-2 12 3M48 64h36M59 62v20M15 87h6m24 0h39m24 0h9','none','#d5e4e9',1.3)
 b+=r(65,64,6,1.6,'#344957',.5)+r(13,72,10,4,'#fff2cf')+r(112,72,5,4,'#d74139')+r(47,83,35,3,'#233b4e',1)
 b+=wheel(32,87)+wheel(96,87)
 if police:
  b+=p('M48 63h38v18H48Z','#2e4253')+p('m62 66 4 2 4-2v7l-4 5-4-5Z','#e3bc64','#8a6c35',.5)
  b+=r(49,35,22,4,'#293f50',1)+r(50,32,9,4,'url(#red)',1)+r(61,32,9,4,'url(#paint)',1)
 return b
add('cars','Passenger car',car());add('police-car','Police patrol car',car(True))
# Box vehicles use a visible chassis, windows confined to the body and two axles.
b=r(12,42,71,44,'url(#white)',4,'#697d88')+p('M83 53h16q4 0 7 5l11 18v10H83Z','url(#white)')+p('M88 58h10l9 15H88Z','url(#glass)')+r(13,74,103,5,'url(#red)')+r(49,35,21,5,'url(#red)',2)+r(86,78,5,2,'#5c6a73')+p('M44 49h10v9h9v10h-9v9H44v-9h-9V58h9Z','#bf3d3e','none')+wheel(31,87)+wheel(98,87)
add('ambulance','Emergency ambulance',b)
b=r(9,33,67,49,'url(#paint)',3,'#3d586a')+p('M77 50h21q4 0 7 5l13 18v14H77Z','url(#gold)')+p('M84 55h13l11 16H84Z','url(#glass)')+r(12,82,103,5,'#354955')+wheel(29,88,11)+wheel(97,88,11)+r(109,76,8,4,'#fff1b8')+p('M13 39h58','none','#cae6f4',1)
add('trucks','Delivery truck',b)
b=r(8,43,111,44,'url(#gold)',5,'#8b6c37')+r(10,42,107,4,'#f6d077')
for x in [16,34,52,70,88]:b+=r(x,50,14,16,'url(#glass)',1,'#6b6d59')
b+=r(105,50,8,33,'url(#glass)',1,'#6b6d59')+p('M12 71h87m-87 5h87','none','#4e473b',1.4)+wheel(30,88)+wheel(96,88)+r(11,81,7,3,'#e5e6dc')
add('school-bus','Yellow school bus',b)
b=p('M35 20Q64 13 93 20L98 88H30Z','url(#paint)')+r(36,28,56,30,'url(#glass)',6,'#b9cbd3')+p('M64 30v26M33 67h62','none','#d2e1e6',1.5)+c(41,73,4,'#fff1bf')+c(87,73,4,'#fff1bf')+r(44,82,40,7,'#293c4e')+p('m40 92-17 22m65-22 17 22M29 106h70','none','url(#metal)',4)
add('trains','Passenger train',b)
plane=p('M61 13Q64 6 67 13L70 56 115 82v7L70 74l-1 24 15 12v5l-20-6-20 6v-5l15-12-1-24-45 15v-7l45-26Z','url(#white)','#68818e',1)+p('M62 21h4l2 14h-8Z','url(#glass)','none')+p('M64 39v62M18 84l40-22m12 0 40 22','none','#96aab4',.8)
add('aircraft jet','Jet aircraft',plane)
b=p('M16 85h96l-17 23H36Z','url(#paint)')+p('M61 20v61H26Zm7 17v44h33Z','url(#white)','#7c939c',.7)+p('M64 17v68','none','url(#wood)',2)+p('M14 114q12-5 24 0t24 0 24 0 24 0','none','#77a8bf',2)
add('boats','Sailing boat',b)
b=e(29,85,23,23,'none','#334655',3)+e(100,85,23,23,'none','#334655',3)
for x in [29,100]:
 for a in range(0,360,45):
  a=math.radians(a);b+=p(f'M{x} 85l{math.sin(a)*21:.2f} {math.cos(a)*21:.2f}','none','#b4c3ca',.6)
b+=p('m29 85 19-38 26 38H29l32-30h28l11 30m-11-30-5-21h13M41 43h20','none','url(#paint)',3.5)+c(74,85,4,'url(#metal)')+p('m74 85 8 6h6','none','#425463',2)
add('bicycles','Bicycle',b)
b=r(13,88,75,22,'url(#rubber)',11)+r(19,93,63,12,'url(#metal)',6)+p('M20 86V55h32v31Zm32-5h24v11H20v-6Z','url(#gold)')+p('M25 60h22v19H25Z','url(#glass)')+p('M58 86 76 26h12l21 42-10 6-18-32-11 44Z','url(#gold)')+p('m108 65 13 10-8 23-22-9 8-16Z','url(#metal)')+c(80,33,3,'url(#metal)')+c(64,66,3,'url(#metal)')+p('M78 37 64 81m24-39 14 25','none','#596873',2)
for x in [27,44,61,76]:b+=c(x,99,4,'#748793')
add('excavator construction-vehicles','Tracked excavator',b)
b=p('M24 46C24 0 104 0 104 46Q104 71 76 91H52Q24 71 24 46Z','url(#red)')+p('M64 12Q37 43 55 90m9-78q27 31 9 78','none','url(#gold)',11)+p('m53 93 4 13m18-13-4 13','none','#725843',1.4)+r(53,106,22,13,'url(#wood)',2)+p('M56 109h16m-16 4h16','none','#886341',.6)
add('hot-air-balloon','Hot air balloon',b)
b=p('M48 17h32v8h-7v34l29 44q6 12-8 12H34q-14 0-8-12l29-44V25h-7Z','url(#white)','#7396a3')+p('M42 80h44l15 24q4 7-7 7H34q-11 0-7-7Z','url(#paint)','#3985a8',.6)+c(57,93,5,'#d9edf1')+c(77,103,3,'#c5e8ed')+p('M60 31v27l-9 14','none','#fff',2)
add('science','Laboratory flask',b)
b=p('M35 52h58l-8 63H44Z','url(#red)','#b27780')+p('M33 52q-2-13 12-15-1-13 13-13 9-12 19 0 14 1 12 14 12 1 10 14Z','url(#white)','#c5b8a1')+p('m74 26 8-17h15','none','url(#paint)',5)+p('M50 66l4 35m11-35v36m15-36-4 35','none','#f4d4d5',2)
add('drinks milkshake','Milkshake with whipped cream',b)
b=p('M43 84V31l55-12v58M43 42l55-12','none','url(#metal)',6)+e(31,96,14,10,'url(#paint)')+e(86,89,14,10,'url(#paint)')
add('musical-notes','Musical notes',b)
b=p('M27 70C6 70 8 40 29 40c5-30 44-32 55-6 28-3 39 34 15 36Z','url(#white)','#91a9b5')+''.join(p(f'M{x} 84q-13 18-3 23 13 3 3-23Z','url(#paint)','#528ba6',.4) for x in [36,66,96])
add('rain','Rain cloud',b)
b=''
for radius,col in [(48,'url(#red)'),(37,'url(#gold)'),(26,'url(#green)'),(15,'url(#paint)')]:b+=p(f'M{64-radius} 104a{radius} {radius*1.45} 0 0 1 {2*radius} 0','none',col,10)
add('rainbow','Rainbow',b)
b=''
for a in range(0,360,60):b+=f'<g transform="rotate({a} 64 64)">'+p('M64 16v48m0-36-12-10m12 10 12-10m-12 26-15-12m15 12 15-12','none','url(#metal)',3)+'</g>'
add('winter january december','Ice crystal snowflake',b)
b=c(64,64,29,'url(#gold)','#ba8d38')
for a in range(0,360,45):b+=f'<g transform="rotate({a} 64 64)">'+p('M64 12v12','none','url(#gold)',4)+'</g>'
add('summer','Sun',b)
b=p('M64 15 78 43l22-10-3 29 17 7-25 22 3 18-28-9-28 9 3-18-25-22 17-7-3-29 22 10Z','url(#gold)','#a97435')+p('M64 40v79m0-35L43 62m21 22 21-22','none','#9a6834',1.4)
add('autumn fall-leaf','Maple leaf',b)
b=r(57,102,14,16,'url(#wood)',1)+p('M64 12 39 42h12L29 70h13l-23 33h90L86 70h13L77 42h12Z','url(#green)','#426449')+p('m64 12 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1Z','url(#gold)','#b18a36',.5)
for x,y in [(52,51),(75,78),(45,91)]:b+=c(x,y,4,'url(#red)')
add('christmas christmas-tree christmas-eve','Decorated Christmas tree',b)
b=p('M61 27q1-14 13-15l-4 18Z','url(#green)')+e(43,71,25,40,'url(#leather)','#a96a32')+e(85,71,25,40,'url(#leather)','#a96a32')+e(64,72,26,42,'url(#leather)','#a96a32')+p('m40 58 11 13H31Zm48 0 11 13H79ZM38 89l12 4 14-4 14 4 12-4-9 13H47Z','#473d2e','#624226',.6)
add('halloween trick-or-treat','Jack o lantern pumpkin',b)
# Nine distinct lights, central shamash raised above the other eight.
b=p('M64 26v82m-41-53v27q0 17 41 17t41-17V55M35 46v28q0 15 29 15t29-15V46M47 37v26q0 15 17 15t17-15V37M57 37v22q0 7 7 7t7-7V37M49 112h30','none','url(#gold)',3)
for x,y in [(23,53),(35,44),(47,35),(57,35),(64,23),(71,35),(81,35),(93,44),(105,53)]:b+=p(f'M{x} {y}q-6-7 0-13 6 6 0 13Z','url(#gold)','#b68834',.4)
add('hanukkah','Nine branch Hanukkah menorah',b)
b=p('M77 16a46 46 0 1 0 28 76A42 42 0 0 1 77 16Z','url(#gold)','#b38a3e')+p('m96 24 4 12 13 1-10 8 3 13-11-7-10 7 2-13-10-8 13-1Z','url(#gold)','#b38a3e',.5)
add('eid ramadan','Crescent moon and star',b)
b=p('M62 72C22 86 8 46 29 35c13-7 25 5 28 17-12-24-3-44 12-40 19 4 15 27 4 39 14-26 39-20 39-1 0 23-25 31-40 22 4 16 12 27 23 34l-9 8c-15-12-24-27-24-42Z','url(#green)','#47714a')+p('M64 67V37m1 33-26-19m27 19 26-18','none','#b4cea5',.7)
add('st-patricks-day','Shamrock',b)
b=c(64,29,18,'url(#wood)','#956c44')+p('M51 47 27 39q-13-5-16 6-2 9 10 14l21 9-11 34q-4 12 7 15 10 3 15-11l11-24 11 24q5 14 15 11 11-3 7-15L86 68l21-9q12-5 10-14-3-11-16-6L77 47Z','url(#wood)','#956c44')+c(58,28,2,'#fff6df')+c(70,28,2,'#fff6df')+p('M57 36q7 6 14 0','none','#fff6df',2)+c(64,58,3,'url(#red)')+c(64,73,3,'url(#red)')
add('gingerbread-man','Gingerbread cookie',b)
# Sport equipment has dedicated construction; no mixed generic sports emblem.
b=c(64,61,43,'url(#leather)','#884820')
for y in range(23,103,4):
 for x in range(24,105,4):
  if (x-64)**2+(y-61)**2<41**2:b+=c(x,y,.45,'#77451e')
b+='<g clip-path="url(#sphere)">'+p('M21 61h86M64 18v86M34 27Q92 61 34 95M94 27Q36 61 94 95','none','#5d3725',2)+'</g>'
add('basketball','Leather basketball',b)
b=p('M22 103 81 22q8-11 17-4t-2 18L32 111Z','url(#wood)','#8a643f')+p('m23 102 10 8m-6-12 10 8m-6-12 10 8','none','#39454c',2)+c(65,76,33,'url(#ivory)','#a5b1b1')+p('M48 48Q74 76 48 104M82 48Q56 76 82 104','none','#9e4c3c',1)
for y in range(52,103,5):
 t=(y-48)/56
 for side in [-1,1]:
  x=65+side*(17-13*math.sin(math.pi*t));b+=p(f'm{x-2:.2f} {y-1.5} 4 3','none','#b3473a',1.3)
add('baseball','Baseball with wooden bat',b)
b=c(64,61,43,'url(#ivory)','#879b9f')+'<g clip-path="url(#sphere)">'+p('m63 41 19 13-7 23H51l-8-23ZM30 19l11 7-3 14-21 8-7-19Zm68 0-13 7 3 15 23 7 6-19ZM15 77l22-2 10 22-13 14-22-10Zm97 0-23-2-10 22 15 14 23-10ZM51 108l2-14h23l3 14Z','#2d3b48')+p('M63 41V18M82 54l22-9M75 77l10 20M51 77 38 94M43 54 30 43','none','#6d828d',1)+'</g>'
add('soccer','Soccer ball',b)
b=p('M37 17h32v33q5 12 26 19 12 4 13 16l-6 8H23l-5-8 7-20 9-8Z','url(#white)','#8b9ca4')+p('M40 21l5 33-17 24q38 9 73 2M39 28h21v27q8 17 29 21','none','#aab4b6',1)+p('M21 86q44 8 87-1l-3 9H22Z','#3e4548')+r(28,94,12,10,'url(#metal)')+r(78,94,12,10,'url(#metal)')+p('M20 106h80q11 0 15-10l3 1q-3 15-18 15H20Z','url(#metal)','#697f8a',.5)
for y in range(30,62,6):b+=p(f'M41 {y}l17 2m-17 4 17-2','none','#fefefd',1.8)
add('winter-sports','Figure skating boot and steel blade',b)
b=p('m41 19-24 18 12 29 12-9-5 48h56l-5-48 12 9 12-29-26-18-22 17Z','url(#white)','#a0aead')+p('m44 21 21 25 18-24M50 28l21 23-15 20M40 29l18 23-12 15m-16-26 10 16m58-16-10 16','none','#a7b1b1',1)+p('M38 68q26 5 52 0v12q-26 5-52 0Z','url(#rubber)')+p('m61 77-9 33 11 3 9-35 17 26 9-7-23-23Z','url(#rubber)')+p('M42 71q22 4 45 0m-24 9-7 26m18-26 19 19','none','#6a747a',.7)
add('karate','Karate uniform with black belt',b)
b=''
for x in [38,90]:b+=r(x-3,10,6,41,'url(#rubber)',1)+e(x+1,80,21,27,'none','#835b36',8)+e(x,78,21,27,'none','url(#wood)',7)+e(x-.6,77,21,27,'none','#edcf9f',.8)
add('gymnastics','Wooden gymnastics rings',b)
# Fixed material coordinates also shade perfectly vertical and horizontal strokes.
DEFS=re.sub(r'<linearGradient id="([^"]+)" x2="([^"]+)" y2="([^"]+)">', lambda m: f'<linearGradient id="{m[1]}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="{float(m[2])*128:g}" y2="{float(m[3])*128:g}">', DEFS)
registry={};previous=json.loads(Path('src/content/topic-symbols.json').read_text())
assert set(S)==set(previous),(set(S)^set(previous))
for id,(label,body) in S.items():
 svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img"><title>{escape(label)}</title><defs>{DEFS}</defs><ellipse cx="64" cy="119" rx="37" ry="3" fill="#273d49" opacity=".17" filter="url(#blur)"/><g filter="url(#lift)">{body}</g></svg>\n'
 sha=hashlib.sha256(svg.encode()).hexdigest();file=f'{id}.{sha[:12]}.svg';(OUT/file).write_text(svg);registry[id]={'src':'/topic-symbols/'+file,'label':label,'sha256':sha,'kind':'original-topic-symbol'}
Path('src/content/topic-symbols.json').write_text(json.dumps(registry,indent=2)+'\n')
for id,old in previous.items():
 if old['src']!=registry[id]['src']:
  f=Path('public'+old['src'])
  if f.is_file() and hashlib.sha256(f.read_bytes()).hexdigest()==old['sha256']:f.unlink()
print('Rebuilt',len(S),'original subject emblems')
