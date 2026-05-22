const fs = require('fs');
const path = require('path');

async function main() {
  const iconSvg = path.resolve(__dirname, '../public/icons/icon.svg');
  const maskableSvg = path.resolve(__dirname, '../public/icons/icon-maskable.svg');
  const out = path.resolve(__dirname, '../public/icons');

  if (!fs.existsSync(iconSvg)) {
    console.error('No se encontró', iconSvg);
    process.exit(1);
  }

  let sharp;
  try {
    sharp = require('sharp');
  } catch (err) {
    console.error('El paquete "sharp" no está instalado. Instálalo con:');
    console.error('  pnpm add -D sharp');
    console.error('Luego ejecuta:');
    console.error('  node scripts/generateIcons.js');
    process.exit(1);
  }

  const sizes = [
    { src: iconSvg, name: 'icon-192.png', size: 192 },
    { src: iconSvg, name: 'icon-256.png', size: 256 },
    { src: iconSvg, name: 'icon-512.png', size: 512 },
    { src: maskableSvg, name: 'icon-maskable-512.png', size: 512 },
    { src: iconSvg, name: 'apple-touch-icon-180.png', size: 180 },
  ];

  for (const s of sizes) {
    if (!fs.existsSync(s.src)) {
      console.warn('Advertencia: no existe', s.src);
      continue;
    }
    const svg = fs.readFileSync(s.src);
    const outPath = path.join(out, s.name);
    try {
      await sharp(svg).resize(s.size, s.size, { fit: 'contain' }).png().toFile(outPath);
      console.log('Generado', outPath);
    } catch (e) {
      console.error('Error generando', outPath, e.message || e);
    }
  }
}

main();
