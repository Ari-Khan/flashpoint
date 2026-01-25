const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const shardsDir = path.join(root, 'src', 'data', 'shards');
const northPath = path.join(shardsDir, 'countries.north-america.geo.json');
const indexPath = path.join(shardsDir, 'index.json');

function readJson(p){ try{ return JSON.parse(fs.readFileSync(p,'utf8')); }catch(e){ console.error('Failed to parse',p,e.message); process.exit(1); } }
const north = readJson(northPath);
if(!Array.isArray(north.features)){ console.error('Unexpected north-america format'); process.exit(1); }

// Group by subregion; normalize keys
const groups = {};
for(const f of north.features){
  const sub = (f && f.properties && f.properties.subregion) ? f.properties.subregion : 'Other';
  const key = sub.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
  if(!groups[key]) groups[key] = [];
  groups[key].push(f);
}

// Decide file/key naming
const entries = [];
for(const [key, feats] of Object.entries(groups)){
  const file = `countries.north-america.${key}.geo.json`;
  const out = { type: 'FeatureCollection', features: feats };
  fs.writeFileSync(path.join(shardsDir,file), JSON.stringify(out,null,2));
  entries.push({ key: `north-america.${key}`, file, count: feats.length });
  console.log(`Wrote ${feats.length} features to ${file}`);
}

// Update index.json: remove existing north-america entry and insert new entries in place
const index = readJson(indexPath);
const idx = index.findIndex(e => e.key === 'north-america');
if(idx >= 0){
  // replace at same position
  index.splice(idx, 1, ...entries);
} else {
  index.push(...entries);
}
fs.writeFileSync(indexPath, JSON.stringify(index,null,2));
console.log('Updated index.json with', entries.map(e=>e.key).join(', '));

// Remove original north-america shard
fs.unlinkSync(northPath);
console.log('Removed original countries.north-america.geo.json');

console.log('Done.');
