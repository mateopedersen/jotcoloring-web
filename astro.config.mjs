import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import {execFileSync} from 'node:child_process';
let revision=process.env.GITHUB_SHA||process.env.WORKERS_CI_COMMIT_SHA||'';
if(!revision){try{revision=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim()}catch{revision='development'}}
const release=/^[a-f0-9]{40}$/.test(revision)?revision:'development';
export default defineConfig({ output: 'server', session:false, devToolbar:{enabled:false}, vite:{define:{'import.meta.env.PUBLIC_RELEASE_SHA':JSON.stringify(release)},build:{assetsInlineLimit:0,rolldownOptions:{output:{codeSplitting:{groups:[{name:'pdf-engine',test:/\/node_modules\/pdf-lib\//}]}}}}}, adapter: cloudflare({imageService:'passthrough'}), server:{port:4321,host:'127.0.0.1'} });
