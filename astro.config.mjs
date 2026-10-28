import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
export default defineConfig({ output: 'server', session:false, devToolbar:{enabled:false}, adapter: cloudflare({imageService:'passthrough'}), server:{port:4321,host:'127.0.0.1'} });
