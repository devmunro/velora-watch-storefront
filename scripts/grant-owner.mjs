import { createClient } from '@supabase/supabase-js';

const email = process.argv[2]?.trim().toLowerCase();
const url = process.env.PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!email || !email.includes('@')) {
  throw new Error('Usage: pnpm admin:grant-owner owner@example.com');
}

if (!url || !secretKey) {
  throw new Error('PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be configured locally.');
}

const supabase = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
});

const { count, error: countError } = await supabase
  .schema('private')
  .from('staff_members')
  .select('user_id', { count: 'exact', head: true })
  .eq('role', 'owner')
  .eq('active', true);

if (countError) throw countError;
if ((count ?? 0) > 0) {
  throw new Error('An active owner already exists. Use the staff administration page to grant further access.');
}

let matchedUser;
for (let page = 1; page <= 10 && !matchedUser; page += 1) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw error;
  matchedUser = data.users.find((user) => user.email?.toLowerCase() === email);
  if (data.users.length < 1000) break;
}

if (!matchedUser) {
  throw new Error('No customer account exists for that email. Sign in to Velora once, then run this command again.');
}

const { error } = await supabase.schema('private').from('staff_members').insert({
  user_id: matchedUser.id,
  role: 'owner',
  active: true,
});

if (error) throw error;
console.log(`Owner access granted to ${email}.`);
