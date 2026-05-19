const fs = require('fs');
const path = require('path');

const knowledgeBase = fs.readFileSync(
  path.join(__dirname, '../knowledge-base/soccer-facts.txt'), 'utf8'
).split('\n\n').filter(chunk => chunk.trim().length > 0);

function retrieve(query, topK = 3) {
  const keywords = query.toLowerCase().split(' ');
  const scored = knowledgeBase.map(chunk => ({
    chunk,
    score: keywords.filter(kw => chunk.toLowerCase().includes(kw)).length,
  }));
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(r => r.chunk)
    .join('\n\n');
}

module.exports = { retrieve };
