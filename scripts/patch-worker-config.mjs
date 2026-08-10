import fs from 'node:fs';
import path from 'node:path';

const configPath = path.resolve('dist/server/wrangler.json');
if (!fs.existsSync(configPath)) process.exit(0);

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
config.vars = {
  ...config.vars,
  PUBLIC_SUPABASE_URL: process.env.PUBLIC_SUPABASE_URL ?? 'https://axgmdldbwrspmwxeemvb.supabase.co',
  PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_WJfgCa4Qgx72EldohC33Cw_NwYdmDRd',
  PUBLIC_SITE_URL: process.env.PUBLIC_SITE_URL ?? 'https://velora-storefront.highforce.workers.dev',
};
fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
