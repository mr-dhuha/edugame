const fs = require('fs');
const path = require('path');

// Regex for emoji and some symbols I used like check, cross, warning, star, circle
const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}\u{2300}-\u{23FF}\u{2B50}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u2714\u26A0\u274C\u2728\u2794\u25CB]/gu;

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.jsx') || file.endsWith('.js') || file.endsWith('.ts')) {
      const content = fs.readFileSync(file, 'utf8');
      let match;
      while ((match = emojiRegex.exec(content)) !== null) {
        results.push({ file, emoji: match[0], index: match.index });
      }
    }
  });
  return results;
}

const found = walk('./src');
const uniqueFiles = [...new Set(found.map(f => f.file))];
uniqueFiles.forEach(f => {
  console.log('---');
  console.log(f);
  const items = found.filter(x => x.file === f).map(x => x.emoji);
  console.log([...new Set(items)].join(' '));
});
