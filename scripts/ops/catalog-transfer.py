#!/usr/bin/env python3
"""Consistent, streamed local canonical SQLite snapshot to versioned NDJSON.
Run on a local snapshot/export, never on a Cloudflare remote endpoint. The source
uses query_only and one read transaction spans every table. WAL sidecar creation
may require opening the existing file read/write; no SQL data writes are issued. All INTEGER cells
are decimal strings so IDs/counters survive JavaScript's integer precision limit.
"""
import argparse, datetime, hashlib, json, pathlib, sqlite3

LEGACY_TABLES = ['category','content','content_revision','content_category','content_tag','content_age','asset','asset_review','slug_redirect','import_job','import_item','outbox_event','processed_event','audit_event','category_count','creator_job','creator_upload','capacity_snapshot','request_limit','sitemap_entry','ai_free_reservation']
AGE_TABLES = LEGACY_TABLES + ['age_recommendation']
TABLES = AGE_TABLES + ['color_reference_job','color_reference_scan','color_ai_reservation']
SCHEMA_TABLES = {'jotcoloring-catalog-transfer/1': LEGACY_TABLES, 'jotcoloring-catalog-transfer/2': AGE_TABLES, 'jotcoloring-catalog-transfer/3': TABLES}
def schema_tables(actual):
    for schema, tables in SCHEMA_TABLES.items():
        if actual == set(tables): return schema, tables
    raise ValueError('Canonical schema changed: '+str(sorted(actual.symmetric_difference(TABLES))))
def canonical(value):
    return json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(',',':'))
def export_catalog(source, destination):
    source=pathlib.Path(source).resolve(strict=True); destination=pathlib.Path(destination)
    if destination.exists(): raise ValueError('Destination already exists; never overwrite a snapshot')
    destination.parent.mkdir(parents=True,exist_ok=True)
    db=sqlite3.connect(source.as_uri()+'?mode=rw',uri=True)
    db.execute('PRAGMA query_only=ON'); db.execute('BEGIN')
    try:
        actual={r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name<>'d1_migrations'")}
        schema, tables = schema_tables(actual)
        if db.execute('PRAGMA integrity_check').fetchone()[0]!='ok': raise ValueError('SQLite integrity check failed')
        if db.execute('PRAGMA foreign_key_check').fetchone() is not None: raise ValueError('Source has broken foreign keys')
        watermark=str(db.execute('SELECT COALESCE(MAX(seq),0) FROM outbox_event').fetchone()[0])
        stats={}; total=0
        with destination.open('x',encoding='utf8',newline='\n') as out:
            def line(value): out.write(canonical(value)+'\n')
            line({'kind':'header','schema':schema,'created_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source_kind':'local SQLite consistent read transaction','outbox_watermark':watermark,'integer_encoding':'decimal-string','tables':tables})
            for table in tables:
                info=list(db.execute('PRAGMA table_info("'+table+'")'))
                columns=[{'name':r[1],'type':r[2],'primary_position':r[5]} for r in info]
                count=db.execute('SELECT COUNT(*) FROM "'+table+'"').fetchone()[0]
                line({'kind':'table','table':table,'columns':columns,'row_count':count})
                pk=[r[1] for r in sorted(info,key=lambda r:r[5]) if r[5]]
                if not pk: raise ValueError('Missing stable primary key: '+table)
                order=','.join('"'+name+'"' for name in pk)
                digest=hashlib.sha256(); got=0
                cursor=db.execute('SELECT * FROM "'+table+'" ORDER BY '+order)
                while True:
                    rows=cursor.fetchmany(256)
                    if not rows: break
                    for row in rows:
                        data={col['name']:(str(value) if value is not None and col['type'].upper()=='INTEGER' else value) for col,value in zip(columns,row)}
                        payload=canonical(data); digest.update((payload+'\n').encode('utf8'))
                        line({'kind':'row','table':table,'data':data,'sha256':hashlib.sha256(payload.encode('utf8')).hexdigest()}); got+=1
                if got!=count: raise ValueError('Snapshot row count changed')
                stats[table]={'rows':got,'sha256':digest.hexdigest()}; total+=got
            line({'kind':'footer','tables':stats,'rows':total,'outbox_watermark':watermark})
        file_hash=hashlib.sha256()
        with destination.open('rb') as stream:
            for chunk in iter(lambda:stream.read(1024*1024),b''): file_hash.update(chunk)
        return {'path':str(destination),'rows':total,'tables':stats,'outbox_watermark':watermark,'sha256':file_hash.hexdigest()}
    finally:
        db.rollback();db.close()
if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('source');parser.add_argument('destination');args=parser.parse_args()
    print(json.dumps(export_catalog(args.source,args.destination),indent=2))
