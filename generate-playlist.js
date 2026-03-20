// 自动生成 playlist.json（可选工具）
// 用法: node generate-playlist.js

const fs = require('fs');
const path = require('path');

const playlistDir = path.join(__dirname, 'playlist');
const outputFile = path.join(playlistDir, 'playlist.json');

try {
  const entries = fs.readdirSync(playlistDir, { withFileTypes: true });
  
  const files = entries
    .filter(entry => entry.isFile() && /\.(mid|midi)$/i.test(entry.name))
    .map(entry => ({
      name: entry.name,
      path: `playlist/${encodeURIComponent(entry.name)}`
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

  const json = {
    files: files
  };

  fs.writeFileSync(outputFile, JSON.stringify(json, null, 2), 'utf-8');
  console.log(`✓ 已生成 playlist.json (${files.length} 个文件)`);
  files.forEach(f => console.log(`  - ${f.name}`));
} catch (err) {
  console.error('错误:', err.message);
  process.exit(1);
}
