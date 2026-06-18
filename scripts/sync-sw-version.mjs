import fs from 'node:fs'

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
const swPath = 'public/sw.js'

if (!fs.existsSync(swPath)) {
  process.exit(0)
}

const sw = fs.readFileSync(swPath, 'utf8')
const next = sw.replace(/__APP_VERSION__/g, pkg.version || 'dev')
fs.writeFileSync(swPath, next)
