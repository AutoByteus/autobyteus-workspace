// API/E2E fixture step (ticket evidence): the app has no GraphQL status mutation (statuses change through agents'
// update_task), so the seeded test-owned Tasks get their planned statuses by editing their task.json while the isolated
// instance is stopped. Usage: node API-PROBE-apply-statuses.mjs <serverDataDir> <map.json>...
import fs from 'node:fs'
import path from 'node:path'
const [dataDir, ...maps] = process.argv.slice(2)
for (const mapFile of maps) {
  const map = JSON.parse(fs.readFileSync(mapFile, 'utf8'))
  const counts = {}
  for (const task of Object.values(map.tasks)) {
    const file = path.join(dataDir, 'projects', map.projectId, 'tasks', task.taskId, 'task.json')
    const json = JSON.parse(fs.readFileSync(file, 'utf8'))
    json.status = task.status
    fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n')
    counts[task.status] = (counts[task.status] ?? 0) + 1
  }
  console.log(JSON.stringify({ projectId: map.projectId, set: map.set, counts }))
}
