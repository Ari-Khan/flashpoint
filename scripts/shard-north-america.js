const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const customPath = path.join(root, 'src', 'data', 'custom.geo.json');
const shardsDir = path.join(root, 'src', 'data', 'shards');
const indexPath = path.join(shardsDir, 'index.json');
const outFile = 'countries.north-america.geo.json';
const outPath = path.join(shardsDir, outFile);

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    console.error('Failed to parse JSON at', p, e.message);
    process.exit(1);
  }
}

const custom = readJson(customPath);
if (!Array.isArray(custom.features)) {
  console.error('Unexpected custom.geo.json format: no features array');
  process.exit(1);
}

const naFeatures = custom.features.filter(f => f && f.properties && f.properties.continent === 'North America');
const remaining = custom.features.filter(f => !(f && f.properties && f.properties.continent === 'North America'));

if (naFeatures.length === 0) {
  console.log('No North America features found in custom.geo.json. Nothing to do.');
  process.exit(0);
}

// Write new shard
const outGeo = { type: 'FeatureCollection', features: naFeatures };
fs.writeFileSync(outPath, JSON.stringify(outGeo, null, 2));
console.log(`Wrote ${naFeatures.length} features to ${outPath}`);

// Update custom.geo.json
const newCustom = { ...custom, features: remaining };
fs.writeFileSync(customPath, JSON.stringify(newCustom, null, 2));
console.log(`Removed ${naFeatures.length} features from ${customPath}`);

// Update index.json
const index = readJson(indexPath);
if (!Array.isArray(index)) {
  console.error('Unexpected index.json format: expected array');
  process.exit(1);
}

const key = 'north-america';
const existing = index.find(e => e.key === key);
if (existing) {
  console.log(`index.json already contains ${key}, updating count and file`);
  existing.file = outFile;
  existing.count = naFeatures.length;
} else {
  // Insert before south-america if present, else append
  const insertBefore = index.findIndex(e => e.key === 'south-america');
  const entry = { key, file: outFile, count: naFeatures.length };
  if (insertBefore >= 0) index.splice(insertBefore, 0, entry);
  else index.push(entry);
}
fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
console.log('Updated index.json with north-america entry');

console.log('Done.');
