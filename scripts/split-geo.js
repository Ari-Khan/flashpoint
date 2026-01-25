import fs from 'fs';
import path from 'path';

const src = path.resolve(process.cwd(), 'src', 'data', 'country-shapes.geo.json');
const outDir = path.resolve(process.cwd(), 'src', 'data', 'shards');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const raw = fs.readFileSync(src, 'utf8');
const json = JSON.parse(raw);

const groups = {};

json.features.forEach((f) => {
  const continent = (f.properties && f.properties.continent) || 'Unknown';
  const key = continent.replace(/\s+/g, '-').toLowerCase();
  if (!groups[key]) groups[key] = { type: 'FeatureCollection', features: [] };
  groups[key].features.push(f);
});

Object.keys(groups).forEach((k) => {
  const target = path.join(outDir, `country-shapes.${k}.geo.json`);
  fs.writeFileSync(target, JSON.stringify(groups[k]));
  console.log('Wrote', target, "features=", groups[k].features.length);
});

// Write index file listing the shards
const indexFile = path.join(outDir, 'index.json');
const index = Object.keys(groups).map((k) => ({ key: k, file: `./country-shapes.${k}.geo.json`, count: groups[k].features.length }));
fs.writeFileSync(indexFile, JSON.stringify(index, null, 2));
console.log('Wrote index', indexFile);