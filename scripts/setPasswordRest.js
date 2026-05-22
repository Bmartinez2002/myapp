const fs = require('node:fs');
const path = require('node:path');

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
  console.error('Uso: node scripts/setPasswordRest.js <email> <password>');
  process.exit(1);
}

async function request(endpoint, options = {}) {
  const res = await fetch(`${url}/auth/v1${endpoint}`, {
    headers: {
      apiKey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    ...options,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

(async () => {
  const list = await request(`/admin/users?email=${encodeURIComponent(email)}`);
  if (list.status !== 200) {
    console.error('Error al consultar usuario:', list.status, list.data);
    process.exit(1);
  }
  const users = Array.isArray(list.data?.users) ? list.data.users : [];
  if (users.length > 0) {
    const userId = users[0].id;
    const update = await request(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ password, email_confirm: true }),
    });
    if (update.status >= 400) {
      console.error('Error actualizando contraseña:', update.status, update.data);
      process.exit(1);
    }
    console.log('Contraseña actualizada para', email);
    console.log(update.data);
    return;
  }

  const create = await request('/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (create.status >= 400) {
    console.error('Error creando usuario:', create.status, create.data);
    process.exit(1);
  }
  console.log('Usuario creado con contraseña:', email);
  console.log(create.data);
})();
