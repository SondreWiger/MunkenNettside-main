import fs from 'fs'
import path from 'path'

const docsDir = path.resolve(process.cwd(), 'app', 'use')
const outFile = path.resolve(process.cwd(), 'public', 'docs-index.json')

function extractText(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  // crude extraction: remove JSX tags and keep words
  const text = content.replace(/<[^>]+>/g, ' ').replace(/\{`|`\}/g, ' ').replace(/`/g, ' ')
  // normalize whitespace
  return text.replace(/\s+/g, ' ').trim().slice(0, 10000)
}

function walk(dir) {
  const results = []
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    const stat = fs.statSync(p)
    if (stat.isDirectory()) {
      results.push(...walk(p))
    } else if (name === 'page.tsx') {
      results.push(p)
    }
  }
  return results
}

const pages = walk(docsDir)
const index = pages.map((p) => {
  const rel = path.relative(docsDir, path.dirname(p))
  const href = '/use/' + rel.replaceAll(path.sep, '/')
  const titleMatch = fs.readFileSync(p, 'utf8').match(/<h1[^>]*>([^<]+)<\/h1>/i)
  const title = titleMatch ? titleMatch[1].trim() : href
  return { href, title, snippet: extractText(p) }
})

fs.mkdirSync(path.dirname(outFile), { recursive: true })
fs.writeFileSync(outFile, JSON.stringify(index, null, 2))
console.log('Wrote', outFile)
