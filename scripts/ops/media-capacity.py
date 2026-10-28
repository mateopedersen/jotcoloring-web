#!/usr/bin/env python3
"""Measure the prepared, checksum-bound media plan; never estimate account usage."""
import argparse,datetime,hashlib,json,math,pathlib,statistics

def stats(values):
    values=sorted(values)
    return {'count':len(values),'total_bytes':sum(values),'median_bytes':statistics.median(values),'p95_bytes':values[math.ceil(len(values)*.95)-1],'min_bytes':min(values),'max_bytes':max(values)}
def measure(plan):
    rows=json.loads(pathlib.Path(plan).read_text())
    for row in rows:
        p=pathlib.Path(row['local_file']);digest=hashlib.sha256()
        with p.open('rb') as stream:
            for chunk in iter(lambda:stream.read(1024*1024),b''):digest.update(chunk)
        if digest.hexdigest()!=row['sha256'] or p.stat().st_size!=row['bytes']:raise ValueError('Prepared source changed')
    derived=[r for r in rows if r['role']!='source_original'];raw=[r for r in rows if r['role']=='source_original'];per={}
    for row in derived:per[row['content_id']]=per.get(row['content_id'],0)+row['bytes']
    return {'measured_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'actual final branded local artifacts; no traffic or paid usage assumption','active_derivatives':stats([r['bytes'] for r in derived]),'all_active_variants_per_content':stats(list(per.values())),'private_raw_sources':stats([r['bytes'] for r in raw]),'by_role':{role:stats([r['bytes'] for r in derived if r['role']==role]) for role in sorted({r['role'] for r in derived})},'max_pdf_bytes':max(r['bytes'] for r in derived if r['mime']=='application/pdf'),'pdf_byte_limit':1000000,'content_count':len(per),'scale_projections':[{'items':n,'active_derivative_bytes':round(sum(per.values())/len(per)*n),'kind':'linear_projection_only','raw_originals_revisions_and_backups_included':False} for n in [100000,1000000,5000000]]}
if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('plan');parser.add_argument('--output',default='docs/evidence/media-capacity.json');args=parser.parse_args();result=measure(args.plan);pathlib.Path(args.output).write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k not in ['by_role','scale_projections']},indent=2))
