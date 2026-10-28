#!/usr/bin/env python3
"""Rehearse a real prepared catalog backup/restore locally, without Cloudflare calls."""
import argparse,datetime,hashlib,importlib.util,json,pathlib,re,shutil,sqlite3,time
spec=importlib.util.spec_from_file_location('backup',pathlib.Path(__file__).with_name('backup.py'));backup=importlib.util.module_from_spec(spec);spec.loader.exec_module(backup)
def checksum(path):
    value=hashlib.sha256()
    with path.open('rb') as source:
        for chunk in iter(lambda:source.read(1024*1024),b''):value.update(chunk)
    return value.hexdigest()
def restore_database(path, migrations, sql):
    db=sqlite3.connect(path)
    def authorizer(action,arg1,arg2,_database,_source):
        if action in (sqlite3.SQLITE_ATTACH,sqlite3.SQLITE_DETACH):return sqlite3.SQLITE_DENY
        if action==sqlite3.SQLITE_FUNCTION and arg2=='load_extension':return sqlite3.SQLITE_DENY
        if action==sqlite3.SQLITE_PRAGMA and arg2 is not None and arg1!='foreign_keys':return sqlite3.SQLITE_DENY
        return sqlite3.SQLITE_OK
    db.set_authorizer(authorizer)
    for migration in sorted(pathlib.Path(migrations).glob('*.sql')):db.executescript(migration.read_text())
    db.executescript(sql.read_text());db.commit()
    if db.execute('PRAGMA integrity_check').fetchone()[0]!='ok' or db.execute('PRAGMA foreign_key_check').fetchone():raise ValueError('Restored DB integrity failure')
    return db

def run(plan_dir,destination):
    start=time.monotonic();root=pathlib.Path(destination);root.mkdir(parents=True,exist_ok=False)
    staged=root/'staged';staged.mkdir();plan_dir=pathlib.Path(plan_dir);uploads=json.loads((plan_dir/'uploads.json').read_text());plan=json.loads((plan_dir/'plan.json').read_text());keys={};raw=0;derived=0
    def copy(source,key):
        target=backup.safe_path(staged,key);target.parent.mkdir(parents=True,exist_ok=True)
        if target.exists():
            if checksum(target)!=checksum(source):raise ValueError('Immutable backup key conflict')
        else:shutil.copyfile(source,target)
    for row in uploads:
        if not re.fullmatch(r'jc-[a-z0-9-]+',row['content_id']) or not re.fullmatch(r'[a-f0-9]{64}',row['sha256']):raise ValueError('Unsafe content/hash')
        source=pathlib.Path(row['local_file'])
        if source.stat().st_size!=row['bytes'] or checksum(source)!=row['sha256']:raise ValueError('Prepared source differs from manifest')
        if row['role']=='source_original':
            if row['public_key'] is not None:raise ValueError('Raw source incorrectly public')
            key='raw/'+row['private_key'];raw+=1
        else:
            if row['role'] not in ['catalog_thumb_bw','catalog_preview_bw','printable_webp_bw','printable_pdf_a4_bw','printable_pdf_letter_bw','home_half_color']:raise ValueError('Unknown derivative role')
            key='objects/sha256/'+row['sha256']+'/'+row['role']+('.pdf' if row['mime']=='application/pdf' else '.webp');derived+=1
        copy(source,key)
        for ref in [row['private_key'],row['public_key']]:
            if ref:keys[ref]=key
    for name in ['catalog-bootstrap.sql','search-bootstrap.sql','uploads.json','plan.json']:copy(plan_dir/name,'bootstrap/'+name)
    for row in uploads:
        if row['role']=='catalog_thumb_bw':
            for name in ['manifest.json','reviews.json','files.json']:copy(pathlib.Path(row['local_file']).parent/name,'bootstrap/'+row['content_id']+'/'+name)
    created=backup.create(staged,root/'snapshot','local-bootstrap-rehearsal','uncommitted-local-build','catalog-0005/search-0002')
    backup.verify(root/'snapshot');backup.restore(root/'snapshot',root/'restored')
    restored=root/'restored';db=restore_database(root/'restored-catalog.sqlite','migrations/catalog',restored/'bootstrap/catalog-bootstrap.sql');search=restore_database(root/'restored-search.sqlite','migrations/search',restored/'bootstrap/search-bootstrap.sql')
    try:
        contents=db.execute("SELECT COUNT(*) FROM content WHERE status='published'").fetchone()[0];assets=db.execute('SELECT COUNT(*) FROM asset').fetchone()[0];documents=search.execute('SELECT COUNT(*) FROM search_document').fetchone()[0]
        if (contents,assets,documents)!=(plan['contents'],plan['assets'],plan['contents']):raise ValueError('Restored table count mismatch')
        for key,digest,size,original in db.execute('SELECT object_key,sha256,bytes,original_key FROM asset'):
            target=backup.safe_path(restored,keys[key])
            if target.stat().st_size!=size or checksum(target)!=digest or keys.get(original)!=keys.get(key):raise ValueError('Restored active asset/key mismatch')
        missing=db.execute("SELECT c.id FROM content c WHERE c.status='published' AND (SELECT COUNT(DISTINCT role) FROM asset a WHERE a.content_id=c.id AND a.content_version=c.active_version AND a.verified=1 AND role IN ('catalog_thumb_bw','catalog_preview_bw','printable_webp_bw','printable_pdf_a4_bw'))<>4").fetchall()
        if missing:raise ValueError('Restored content lacks required active assets')
        fox=search.execute("SELECT d.id FROM search_fts JOIN search_document d ON d.rowid=search_fts.rowid WHERE search_fts MATCH '\"fox\"*' AND d.visibility='published'").fetchall()
        if fox!=[('jc-woodland-friends',)]:raise ValueError('Restored FTS query mismatch')
        result={'measured_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'PASS','environment':'isolated local filesystem + SQLite, actual prepared source/derivative bytes','contents':contents,'derived_assets':derived,'private_raw_sources':raw,'restored_search_documents':documents,'files':created['files'],'checks':['Every staged and restored byte/checksum verified','Both fresh databases migrate and restore SQL','All active asset keys/hash/bytes join restored files','All published content has four required verified active roles','Restored FTS fox query matches expected ID','Raw source assets remain private in the plan'],'rto_local_seconds':round(time.monotonic()-start,3),'snapshot_generated_at':plan['generated_at'],'cloudflare_remote_restore':'NOT RUN','r2_api_metadata_cors_restore':'NOT RUN','production_rto_rpo':'NOT RUN','snapshot_manifest_sha256':checksum(root/'snapshot'/backup.MANIFEST)}
        return result
    finally:db.close();search.close()
if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('plan_directory');parser.add_argument('new_destination');args=parser.parse_args();result=run(args.plan_directory,args.new_destination);pathlib.Path('docs/evidence/bootstrap-restore.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
