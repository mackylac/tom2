import fs from 'node:fs'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

function portfolioLocalFileSyncPlugin(): Plugin {
  return {
    name: 'portfolio-local-file-sync',
    configureServer(server) {
      server.middlewares.use('/__sync_portfolio_data', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('Method Not Allowed')
          return
        }

        let body = ''
        req.on('data', (chunk) => {
          body += chunk
        })
        req.on('end', () => {
          try {
            const incoming = JSON.parse(body)
            if (
              !incoming ||
              !Array.isArray(incoming.projects) ||
              !incoming.siteSettings
            ) {
              res.statusCode = 400
              res.end(JSON.stringify({ ok: false }))
              return
            }

            const targetPath = path.resolve(
              process.cwd(),
              'src/data/portfolio-data.json'
            )

            let existingComparable = ''
            if (fs.existsSync(targetPath)) {
              try {
                const currentRaw = fs.readFileSync(targetPath, 'utf-8')
                const currentJson = JSON.parse(currentRaw)
                existingComparable = JSON.stringify({
                  siteSettings: currentJson.siteSettings,
                  projects: currentJson.projects,
                })
              } catch {
                // Ignore parse error
              }
            }

            const incomingComparable = JSON.stringify({
              siteSettings: incoming.siteSettings,
              projects: incoming.projects,
            })

            if (existingComparable !== incomingComparable) {
              const payload = {
                version: incoming.version || '2.0.0',
                updatedAt: new Date().toISOString(),
                siteSettings: incoming.siteSettings,
                projects: incoming.projects,
              }
              fs.writeFileSync(
                targetPath,
                JSON.stringify(payload, null, 2) + '\n',
                'utf-8'
              )
            }

            res.setHeader('Content-Type', 'application/json')
            res.statusCode = 200
            res.end(JSON.stringify({ ok: true }))
          } catch {
            res.statusCode = 500
            res.end(JSON.stringify({ ok: false }))
          }
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), portfolioLocalFileSyncPlugin()],
})
