const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const shardsDir = path.join(root, 'src', 'data', 'shards');
const indexPath = path.join(shardsDir, 'index.json');
const index = JSON.parse(fs.readFileSync(indexPath,'utf8'));
let sum=0; let actual=0; 
for (const e of index){ sum += e.count; const js = JSON.parse(fs.readFileSync(path.join(shardsDir,e.file),'utf8')); actual += (js.features||[]).length; }
console.log('index sum counts:', sum, 'actual features:', actual);
if (sum !== actual) {
  console.error('Mismatch!'); process.exit(2);
}
console.log('All good.');
