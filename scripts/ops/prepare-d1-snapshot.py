#!/usr/bin/env python3
"""Validate an actual D1 SQL export in memory and emit a private durable snapshot.

Original SQL enters via stdin, never a command argument or persisted file. Private
AI jobs/uploads/reservations are deliberately omitted from permanent catalog backup;
their schemas remain. This is not a backup of user AI work or browser projects.
"""
import hashlib, importlib.util, json, pathlib, re, sqlite3, sys

spec=importlib.util.spec_from_file_location('catalog_transfer',pathlib.Path(__file__).with_name('catalog-transfer.py'))
transfer=importlib.util.module_from_spec(spec);spec.loader.exec_module(transfer)
EPHEMERAL=['ai_free_reservation','creator_upload','creator_job']
MAX_BYTES=50_000_000

def prepare(source, destination):
    if len(source)>MAX_BYTES: raise ValueError('Export exceeds reviewed 50 MB rehearsal bound')
    root=pathlib.Path(destination)
    if not root.is_dir() or any(root.iterdir()): raise ValueError('Snapshot directory must exist and be empty')
    db=sqlite3.connect(':memory:')
    def authorize(action,a,b,_db,_trigger):
        if action in (sqlite3.SQLITE_ATTACH,sqlite3.SQLITE_DETACH,sqlite3.SQLITE_CREATE_VTABLE):return sqlite3.SQLITE_DENY
        if action==sqlite3.SQLITE_FUNCTION and b in ('load_extension','readfile','writefile'):return sqlite3.SQLITE_DENY
        if action==sqlite3.SQLITE_PRAGMA and b is not None and a.lower() not in ('foreign_keys','defer_foreign_keys','table_info','index_info','index_list','foreign_key_list','integrity_check','foreign_key_check'):return sqlite3.SQLITE_DENY
        return sqlite3.SQLITE_OK
    db.set_authorizer(authorize)
    try:
        db.executescript(source.decode('utf8'))
        actual={r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")}
        _, table_order=transfer.schema_tables(actual-{'d1_migrations'})
        if actual-set(table_order)-{'d1_migrations'} or set(table_order)-actual:raise ValueError('Unexpected canonical schema; review before export')
        if db.execute('PRAGMA integrity_check').fetchone()[0]!='ok' or db.execute('PRAGMA foreign_key_check').fetchone():raise ValueError('Source SQL integrity or foreign-key failure')
        original_counts={table:db.execute('SELECT COUNT(*) FROM "'+table+'"').fetchone()[0] for table in table_order}
        if sum(original_counts.values())>100000:raise ValueError('Snapshot exceeds reviewed 100k-row rehearsal bound')
        # Do not retain private prompts/photo ownership beyond their original retention.
        for table in EPHEMERAL:db.execute('DELETE FROM "'+table+'"')
        db.commit()
        if db.execute('PRAGMA foreign_key_check').fetchone():raise ValueError('Snapshot filtering broke a foreign key')
        dumped=[line for line in db.iterdump() if line not in ('BEGIN TRANSACTION;','COMMIT;')]
        # D1 keeps foreign keys enabled: define every referenced table before rows.
        # Install triggers after rows to avoid replaying publication side effects.
        tables=[line for line in dumped if line.startswith('CREATE TABLE')]
        rows=[line for line in dumped if line.startswith(('INSERT INTO','DELETE FROM'))]
        rest=[line for line in dumped if line not in tables and line not in rows]
        if any(not line.startswith(('CREATE INDEX','CREATE UNIQUE INDEX','CREATE TRIGGER')) for line in rest):raise ValueError('Unexpected SQL dump statement')
        # D1 may commit import batches independently, so defer_foreign_keys alone
        # is insufficient. Parent rows must precede dependent rows as well.
        data_order=['d1_migrations']+table_order+['sqlite_sequence']
        def row_order(line):
            match=re.match(r'(?:INSERT INTO|DELETE FROM)\s+["`\[]?([a-z_][a-z0-9_]*)',line)
            if not match or match[1] not in data_order:raise ValueError('Unexpected data table in dump')
            return data_order.index(match[1])
        rows.sort(key=row_order)
        lines=tables+rows+rest
        sql=('PRAGMA defer_foreign_keys=TRUE;\n'+'\n'.join(lines)+'\n').encode('utf8')
        snapshot=root/'catalog.sql'
        with snapshot.open('xb') as output:output.write(sql)
        snapshot.chmod(0o600)
        expected={}
        for table in sorted(actual):
            info=list(db.execute('PRAGMA table_info("'+table+'")'))
            columns=[{'name':r[1],'type':r[2],'primary_position':r[5]} for r in info]
            pk=[r[1] for r in sorted(info,key=lambda r:r[5]) if r[5]]
            if not pk:raise ValueError('Stable primary key required')
            digest=hashlib.sha256();count=0
            for row in db.execute('SELECT * FROM "'+table+'" ORDER BY '+','.join('"'+k+'"' for k in pk)):
                data={col['name']:(str(value) if value is not None and col['type'].upper()=='INTEGER' else value) for col,value in zip(columns,row)}
                digest.update((transfer.canonical(data)+'\n').encode('utf8'));count+=1
            expected[table]={'rows':count,'sha256':digest.hexdigest(),'columns':columns,'primary_key':pk}
        schema=[dict(zip(['type','name','table'],r)) for r in db.execute("SELECT type,name,tbl_name FROM sqlite_master WHERE type IN ('table','index','trigger') AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY type,name")]
        sequences=[{'name':r[0],'seq':str(r[1])} for r in db.execute('SELECT name,seq FROM sqlite_sequence ORDER BY name')]
        result={'format':'jotcoloring-durable-d1-snapshot/1','source_export_sha256':hashlib.sha256(source).hexdigest(),'source_export_bytes':len(source),'sql_sha256':hashlib.sha256(sql).hexdigest(),'sql_bytes':len(sql),'source_row_counts':original_counts,'excluded_private_rows':{table:original_counts[table] for table in EPHEMERAL},'excluded_private_tables':EPHEMERAL,'tables':expected,'schema_objects':schema,'autoincrement_sequences':sequences,'outbox_watermark':str(db.execute('SELECT COALESCE(MAX(seq),0) FROM outbox_event').fetchone()[0]),'private_ai_restore':'Intentionally excluded; disable AI until live quota and retention state is reconciled','r2_asset_bytes':'Not included in this DB snapshot; restore and verify immutable R2 object backups separately'}
        (root/'snapshot.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');(root/'snapshot.json').chmod(0o600)
        return result
    finally:db.close()

if __name__=='__main__':
    try:
        source=sys.stdin.buffer.read(MAX_BYTES+1)
        result=prepare(source,sys.argv[1])
        print(json.dumps({'status':'PREPARED','sql_bytes':result['sql_bytes'],'sql_sha256':result['sql_sha256'],'tables':len(result['tables']),'excluded_private_rows':result['excluded_private_rows']}))
    except Exception:
        # SQL errors may include private source text; do not print them.
        print('Snapshot preparation refused; no source SQL or private values logged',file=sys.stderr);sys.exit(1)
