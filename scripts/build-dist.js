const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
fs.copyFileSync(path.join(root, "index.html"), path.join(dist, "index.html"));
fs.cpSync(path.join(root, "css"), path.join(dist, "css"), { recursive: true });
fs.cpSync(path.join(root, "js"), path.join(dist, "js"), { recursive: true });

console.log("Đã tạo dist cho static hosting.");
