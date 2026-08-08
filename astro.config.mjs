// @ts-check
import cloudflare from '@astrojs/cloudflare';
import { defineConfig } from 'astro/config';

export default defineConfig({
  adapter: cloudflare({
    imageService: { build: 'compile', runtime: 'passthrough' },
  }),
  output: 'server',
  server: {
    host: '127.0.0.1',
    port: 4321,
  },
  vite: {
    build: {
      assetsInlineLimit: 0,
    },
  },
});
