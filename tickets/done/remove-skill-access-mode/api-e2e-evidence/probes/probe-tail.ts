describe("RSAM upgrade probe (temporary)", () => {
  it("dumps the post-upgrade state of a released data root", async () => {
    const target = makeTarget("rsam-upgrade-probe");
    const scenario = await seedScenario(target, false);
    const memoryRoot = path.join(target.runtimeRoot, "memory");
    const walk = (dir: string): string[] => fs.existsSync(dir)
      ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory()
        ? walk(path.join(dir, entry.name))
        : [path.join(dir, entry.name)])
      : [];
    const snapshot = (): Record<string, unknown> => Object.fromEntries(walk(memoryRoot).sort().map((file) => {
      const relative = path.relative(memoryRoot, file);
      if (!file.endsWith(".json")) return [relative, `<${fs.statSync(file).size} bytes>`];
      try { return [relative, JSON.parse(fs.readFileSync(file, "utf8"))]; } catch { return [relative, "<unparseable>"]; }
    }));
    const attempt = async (label: string, run: () => Promise<unknown>): Promise<unknown> => {
      try { return await run(); } catch (error) { return { probeError: label, message: String((error as Error)?.message ?? error) }; }
    };
    const out: Record<string, unknown> = { seeded: snapshot() };
    const server = await startScenarioServer(target);
    await expectHealthy(server.serverUrl);
    const statuses = await migrationStatuses(server.serverUrl);
    out.statuses = statuses.map(({ migrationId, status, attempts, summary, errorMessage }) =>
      ({ migrationId, status, attempts, summary, errorMessage }));
    out.logs = Object.fromEntries(statuses
      .filter(({ migrationId }) => /team_run_execution_tree|agent_org|skill/.test(migrationId))
      .map(({ migrationId, logPath }) => [migrationId, logPath && fs.existsSync(logPath)
        ? fs.readFileSync(logPath, "utf8").split("\n").slice(0, 60) : null]));
    out.afterStartup = snapshot();
    const id = scenario.rootTeamRunId;
    out.history = await attempt("history", () => executeGraphql(server.serverUrl, `
      query ProbeHistory { listWorkspaceRunHistory(limitPerAgent: 50) {
        workspaceRootPath
        agentDefinitions { agentDefinitionId runs { runId } }
        teamDefinitions { teamDefinitionId runs { teamRunId } }
      } }`));
    out.teamResume = await attempt("teamResume", () => executeGraphql(server.serverUrl, `
      query ProbeResume($teamRunId: String!) { getTeamRunResumeConfig(teamRunId: $teamRunId) { teamRunId isActive executionTree } }`,
      { teamRunId: id }));
    out.teamRestore = await attempt("teamRestore", () => restoreTeamRun(server.serverUrl, id));
    out.orgInspection = await attempt("orgInspection", () => executeGraphql(server.serverUrl, `
      query ProbeOrg($orgRunId: String!) { getAgentOrgRunInspection(orgRunId: $orgRunId) { __typename } }`, { orgRunId: id }));
    out.orgRestore = await attempt("orgRestore", () => executeGraphql(server.serverUrl, `
      mutation ProbeOrgRestore($agentOrgRunId: String!) { restoreAgentOrgRun(agentOrgRunId: $agentOrgRunId) { success message } }`,
      { agentOrgRunId: id }));
    out.afterRestore = snapshot();
    out.orgTerminate = await attempt("orgTerminate", () => executeGraphql(server.serverUrl, `
      mutation ProbeOrgTerminate($agentOrgRunId: String!) { terminateAgentOrgRun(agentOrgRunId: $agentOrgRunId) { success message } }`,
      { agentOrgRunId: id }));
    out.teamTerminate = await attempt("teamTerminate", () => executeGraphql(server.serverUrl, `
      mutation ProbeTeamTerminate($teamRunId: String!) { terminateAgentTeamRun(teamRunId: $teamRunId) { success } }`, { teamRunId: id }));
    out.serverOutputTail = server.output().split("\n").filter((line: string) => /migration|Migration|error|Error|WARN/.test(line)).slice(-80);
    fs.writeFileSync(process.env.RSAM_PROBE_OUT!, JSON.stringify(out, null, 2));
  }, 360_000);
});
