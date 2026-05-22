const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');

function parseDotEnv(content) {
  return Object.fromEntries(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const idx = line.indexOf('=');
        return [line.slice(0, idx), line.slice(idx + 1)];
      })
  );
}

const envPath = path.resolve(__dirname, '../.env.local');
if (!fs.existsSync(envPath)) {
  console.error('.env.local no existe');
  process.exit(1);
}
const env = parseDotEnv(fs.readFileSync(envPath, 'utf-8'));
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}
const email = process.argv[2];
const password = process.argv[3];
if (!email || !password) {
  console.error('Uso: node scripts/setPassword.js <email> <password>');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

(async () => {
  const { data: userData, error: lookupError } = await supabase.auth.admin.getUserByEmail(email);
  if (lookupError && lookupError.message !== 'User not found') {
    console.error('Error buscando usuario:', lookupError);
    process.exit(1);
  }

  if (userData?.user) {
    const { data, error } = await supabase.auth.admin.updateUserById(userData.user.id, {
      password,
      email_confirm: true,
    });
    if (error) {
      console.error('Error actualizando password:', error);
      process.exit(1);
    }
    console.log('Password actualizado para:', email);
    console.log(data);
    return;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) {
    console.error('Error creando usuario:', error);
    process.exit(1);
  }
  console.log('Usuario creado con password:', email);
  console.log(data);
})();
