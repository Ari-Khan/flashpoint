import fs from 'fs';
import path from 'path';

const shardsDir = path.resolve(process.cwd(), 'src', 'data', 'shards');
const indexPath = path.join(shardsDir, 'index.json');
const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

const outIndex = [];
let totalNew = 0;

for (const entry of index) {
  const filePath = path.join(shardsDir, entry.file);
  const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const count = (json.features || []).length;

  if (count <= 40) {
    // keep as-is
    outIndex.push(entry);
    continue;
  }

  // attempt to split by subregion
  const groups = {};
  json.features.forEach((f) => {
    const sub = (f.properties && f.properties.subregion) || (f.properties && f.properties.region_wb) || 'misc';
    const key = sub.replace(/\s+/g, '-').toLowerCase();
    if (!groups[key]) groups[key] = { type: 'FeatureCollection', features: [] };
    groups[key].features.push(f);
  });

  const groupKeys = Object.keys(groups);
  if (groupKeys.length <= 1) {
    // subregion not helpful -> split alphabetically into two groups
    const aGroup = { type: 'FeatureCollection', features: [] };
    const bGroup = { type: 'FeatureCollection', features: [] };
    json.features.forEach((f) => {
      const n = (f.properties && (f.properties.name || f.properties.name_en || '')) + '';
      const c = (n[0] || '').toUpperCase();
      if (c >= 'A' && c <= 'M') aGroup.features.push(f); else bGroup.features.push(f);
    });
    const base = path.basename(entry.file, '.geo.json');
    const fA = `country-shapes.${base}.a-m.geo.json`;
    const fB = `country-shapes.${base}.n-z.geo.json`;
    fs.writeFileSync(path.join(shardsDir, fA), JSON.stringify(aGroup));
    fs.writeFileSync(path.join(shardsDir, fB), JSON.stringify(bGroup));
    outIndex.push({ key: `${entry.key}.a-m`, file: `./${fA}`, count: aGroup.features.length });
    outIndex.push({ key: `${entry.key}.n-z`, file: `./${fB}`, count: bGroup.features.length });
    totalNew += 2;
    console.log(`Split ${entry.file} into ${fA} (${aGroup.features.length}) and ${fB} (${bGroup.features.length})`);
  } else {
    // write by subregion
    for (const k of groupKeys) {
      const outName = `country-shapes.${entry.key}.${k}.geo.json`;
      fs.writeFileSync(path.join(shardsDir, outName), JSON.stringify(groups[k]));
      outIndex.push({ key: `${entry.key}.${k}`, file: `./${outName}`, count: groups[k].features.length });
      totalNew++;
      console.log(`Wrote ${outName} (${groups[k].features.length})`);
    }
  }
}

// write new index
fs.writeFileSync(indexPath, JSON.stringify(outIndex, null, 2));
console.log('Wrote new index.json with', outIndex.length, 'entries (', totalNew, 'new files )');