#!/usr/bin/env node
// autobyteus-358 / item autobyteus-200 probe: how long the whole-backlog read takes at 20 Projects x 1,000 Tasks.
// Test-owned data only: writes a fresh Projects folder under <dataRoot> with the store's own file format
// (projectFileContent / taskFileContent), then times, with the built server (dist):
//   - ProjectService.listProjects()  (the Projects list query: every Project's Task counts)
//   - every ProjectStore.listTasks()  (what the Embedding page's first load reads: every Task of every Project)
// Usage: node projects-backlog-probe.mjs <serverDistDir> <dataRoot> [projects=20] [tasksPerProject=1000] [samples=5]
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";

const [dist, dataRoot, projectsArg = "20", tasksArg = "1000", samplesArg = "5"] = process.argv.slice(2);
const load = (rel) => import(pathToFileURL(path.join(dist, rel)).href);
const { ProjectStore, projectFileContent, taskFileContent } = await load("projects/stores/project-store.js");
const { ProjectsLayout, segment } = await load("projects/stores/projects-layout.js");
const { ProjectService } = await load("projects/services/project-service.js");

const root = path.join(dataRoot, "projects");
const nProjects = Number(projectsArg), nTasks = Number(tasksArg), samples = Number(samplesArg);
const words = "the agent run task project memory review design build release team member message view load".split(" ");
const text = (n) => Array.from({ length: n }, (_, i) => words[(i * 7 + n) % words.length]).join(" ");

const seedStart = Date.now();
await fs.mkdir(root, { recursive: true });
for (let p = 0; p < nProjects; p += 1) {
  const projectId = `project_${randomUUID()}`;
  const now = new Date().toISOString();
  const prefix = `p${p}`;
  const dir = path.join(root, segment(projectId));
  await fs.mkdir(path.join(dir, "tasks"), { recursive: true });
  await fs.writeFile(path.join(dir, "project.json"), JSON.stringify(projectFileContent({
    projectId, name: `Probe project ${p}`, description: text(30), createdAt: now, updatedAt: now,
    workspaces: [], taskKeys: { prefix, lastNumber: nTasks } }), null, 2));
  const writes = [];
  for (let t = 0; t < nTasks; t += 1) {
    const taskId = `project_task_${randomUUID()}`;
    const task = { taskId, taskKey: `${prefix}-${t + 1}`, title: `Task ${t} ${text(8)}`, description: text(220),
      status: ["TODO", "IN_PROGRESS", "DONE", "CANCELLED"][t % 4], dependsOnTaskIds: [], partOfTaskId: null,
      createdAt: now, updatedAt: now, contextFiles: [],
      comments: Array.from({ length: t % 3 }, (_, c) => ({ id: randomUUID(), createdAt: now, text: text(40 + c) })) };
    const taskDir = path.join(dir, "tasks", segment(taskId));
    writes.push(fs.mkdir(taskDir, { recursive: true })
      .then(() => fs.writeFile(path.join(taskDir, "task.json"), JSON.stringify(taskFileContent(projectId, task), null, 2))));
    if (writes.length >= 200) await Promise.all(writes.splice(0));
  }
  await Promise.all(writes);
}
const seedMs = Date.now() - seedStart;

const store = new ProjectStore(new ProjectsLayout(root));
const service = new ProjectService({ store });
const time = async (fn) => { const s = performance.now(); const r = await fn(); return { ms: performance.now() - s, r }; };
const listProjectsMs = [], allTasksMs = [];
let taskTotal = 0;
for (let i = 0; i < samples; i += 1) {
  const a = await time(() => service.listProjects());
  listProjectsMs.push(Math.round(a.ms));
  const b = await time(async () => {
    const projects = await store.listProjects();
    const lists = await Promise.all(projects.map((p) => store.listTasks(p.projectId)));
    return lists.reduce((n, l) => n + l.length, 0);
  });
  allTasksMs.push(Math.round(b.ms)); taskTotal = b.r;
}
const median = (xs) => [...xs].sort((x, y) => x - y)[Math.floor(xs.length / 2)];
const os = await import("node:os");
console.log(JSON.stringify({ projects: nProjects, tasksPerProject: nTasks, taskTotal, seedMs,
  listProjectsMs, listProjectsMedianMs: median(listProjectsMs), allTasksMs, allTasksMedianMs: median(allTasksMs),
  loadAverage: os.loadavg().map((x) => Math.round(x * 100) / 100), node: process.version, platform: `${os.platform()} ${os.release()}` }));
