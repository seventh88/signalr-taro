// Edit the index.d.ts file to add the UMD export
const fs = require('fs');
const path = require('path');

const target = path.resolve(__dirname, "..", "dist", "types", "index.d.ts");

let content = fs.readFileSync(target);
fs.writeFileSync(target, content + "\r\nexport as namespace signalR;");