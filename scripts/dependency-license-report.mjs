import { readFileSync } from "node:fs";

const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
const root = lock.packages?.[""] || {};
const directNames = new Set([
  ...Object.keys(root.dependencies || {}),
  ...Object.keys(root.devDependencies || {}),
]);
const packageNameFromPath = (path) => {
  const marker = "node_modules/";
  const index = path.lastIndexOf(marker);
  return index >= 0 ? path.slice(index + marker.length) : path;
};
const rows = Object.entries(lock.packages || {})
  .filter(([path]) => Boolean(path))
  .map(([path, value]) => ({
    path,
    name: value.name || packageNameFromPath(path),
    version: value.version || "UNKNOWN",
    license: value.license || "UNKNOWN",
  }));

const counts = new Map();
for (const row of rows) {
  counts.set(row.license, (counts.get(row.license) || 0) + 1);
}

console.log("Dependency license inventory (informational; not legal advice)\n");
console.log("License\tPackages");
for (const [license, count] of [...counts].sort((a, b) => b[1] - a[1])) {
  console.log(`${license}\t${count}`);
}

console.log("\nDirect package\tVersion\tLicense");
for (const row of rows
  .filter(
    ({ name, path }) =>
      directNames.has(name) && path === `node_modules/${name}`,
  )
  .sort((a, b) => a.name.localeCompare(b.name))) {
  console.log(`${row.name}\t${row.version}\t${row.license}`);
}

const reviewPattern = /UNKNOWN|GPL|AGPL|LGPL|MPL|FSL|CC-BY|EPL|CDDL/i;
console.log("\nPackages requiring license review");
for (const row of rows
  .filter(({ license }) => reviewPattern.test(license))
  .sort((a, b) => a.name.localeCompare(b.name))) {
  console.log(`${row.name}\t${row.version}\t${row.license}`);
}
