const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const env = Object.fromEntries(
  fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8')
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((l) => !l.startsWith('#'))
    .map((l) => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx), l.slice(idx + 1)];
    })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

(async () => {
  const email = 'bm22142002@gmail.com';
  const password = '123456';
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  console.log('error', error);
  console.log('data', data ? { session: !!data.session, user: data.user?.email } : data);
})();
