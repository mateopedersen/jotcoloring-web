"""Resolve shared sprite resources into self-contained, cacheable SVGs.

External <use> loses paint servers in WebKit. Keeping each SVG image's paint
servers and nested symbols in the same image document works across engines.
"""
from pathlib import Path
from hashlib import sha256
import json, re, sys

ROOT=Path(__file__).resolve().parents[2]
CHECK='--check' in sys.argv
OUT=ROOT/'public/illustrations/resolved'
OUT.mkdir(parents=True,exist_ok=True)

def write(path, data):
 if CHECK:
  if not path.exists() or path.read_text()!=data: raise SystemExit('Outdated generated asset: '+str(path.relative_to(ROOT)))
 else: path.write_text(data)

def make(source, names, prefix, version):
 target=OUT/f'{prefix}-{version}'
 target.mkdir(parents=True,exist_ok=True)
 resources={}
 for match in re.finditer(r'<(linearGradient|radialGradient|clipPath|filter|symbol)\b([^>]*)>(.*?)</\1>',source,re.S):
  tag,attrs,inner=match.groups()
  match_id=re.search(r'\bid="([^"]+)"',attrs)
  if match_id: resources[match_id.group(1)]=(tag,attrs,inner,match.group())
 output={}
 for name in names:
  if name not in resources or resources[name][0]!='symbol': raise ValueError('Missing symbol '+name)
  _,attrs,body,_=resources[name]
  box=re.search(r'viewBox="([^"]+)"',attrs).group(1)
  found=set(); pending=re.findall(r'(?:url\(#|href="#)([^)"\s]+)',body)
  while pending:
   key=pending.pop()
   if key in found:continue
   if key not in resources:raise ValueError(f'Missing reference {name}: {key}')
   found.add(key); pending.extend(re.findall(r'(?:url\(#|href="#)([^)"\s]+)',resources[key][3]))
  defs=''.join(resources[key][3] for key in sorted(found))
  svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{box}" fill="none"><defs>{defs}</defs>{body}</svg>\n'
  filename=f'{name}.svg'
  write(target/filename,svg)
  output[name]=f'/illustrations/resolved/{prefix}-{version}/{filename}'
 return output

catalog=json.loads((ROOT/'src/icons/catalog.json').read_text())
tools=json.loads((ROOT/'src/studio/tool-catalog.json').read_text())
icons=make((ROOT/('public'+catalog['url'])).read_text(),[x['id'] for x in catalog['icons']+catalog['scenes']],'jc',catalog['url'].rsplit('-',1)[1].removesuffix('.svg'))
studio=make((ROOT/('public'+tools['url'])).read_text(),tools['names'],'studio',tools['url'].rsplit('-',1)[1].removesuffix('.svg'))
print(f'{len(icons)} illustrations and {len(studio)} studio tools resolved')
