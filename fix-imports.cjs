const fs = require("fs");
const path = require("path");

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes("node_modules") && !file.includes("dist")) {
        results = results.concat(walk(file));
      }
    } else if (file.endsWith(".ts")) {
      results.push(file);
    }
  });
  return results;
}

const files = walk("packages/wallet-core");
files.forEach(f => {
  let content = fs.readFileSync(f, "utf8");
  content = content.replace(/from\s+["\'](\.[^"\']+)["\']/g, (match, p1) => {
    if (p1.endsWith(".js") || p1.endsWith(".ts") || p1.endsWith(".json")) return match;
    return `from "${p1}.js"`;
  });
  fs.writeFileSync(f, content);
});
console.log("Done");
