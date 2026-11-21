"""The collaboration contract as an executable model (autobyteus-461).

Every operation applies the contract's rules (target-collaboration-contract.md §2 … §4) to an in-memory disk: a dict
from a node-qualified path ("A:memory/agents/<id>/run_metadata.json") to its JSON. Run lists and message logs are
lists. The DelegationIndex is derived from the disk, never stored. Nothing here reads the user's data.
"""
import copy, json

ELL = "…"

NOT_FOUND = lambda a: (f"No agent or agent team you can talk with has the address {a}. To answer a message or report your task result, "
                       "use send_message_to with target_agent_run_id set to the sender run id. To have a task done by a new agent, use delegate_task.")
CLOSED = ("This task agent's Task is closed. Only the agent that assigned the Task can continue it: set the Task to TODO or IN_PROGRESS, "
          "then message the task agent's run id (for a task agent team, its coordinator's run id).")

DELEGATED_WORK = lambda action, names: (f"This run can't be {action} while a run it delegated to is working ({names}). "
                                        "Try again when it has finished, or stop it first.")
NOT_RUNNING = lambda r: (f"No running agent has the run id '{r}', so the message was not sent. A stopped agent is not woken. Use an exact run id you were given: "
                         "a sender run id (from a message or your new task), a run id delegate_task returned to you, or one list_running_agents lists. "
                         "For an agent on another node, also pass node.")

TEAM_RUN_ID = lambda r, c: (f"{r} is a task agent team's run id, and send_message_to talks with agents. "
                            f"To talk with the team, use its coordinator's run id: {c}.")

# autobyteus-587 RF-14 replaces CM-11, under which a linked run on another node was reached without node: a message to
# a run on another node always names that node. Texts from `remote-refusal-codes.ts` (nodeRequired / nodeMismatch).
NODE_REQUIRED = lambda n: f'This agent runs on node "{n}"; pass node: "{n}" with its run id.'
NODE_MISMATCH = lambda n, given: f'This agent runs on node "{n}", not "{given}"; pass node: "{n}".'

SAVED_TASK_TO_PEER ="A saved Task (task_id) can't be given to an agent on another node yet, so nothing was started. Delegate with a description instead."

class Refused(Exception):
    """A refusal. `tool` decides its shape: send_message_to answers {accepted, code, message}; delegate_task {delegated, message}."""
    def __init__(self, code, message, tool="send_message_to"):
        super().__init__(message); self.code = code; self.message = message; self.tool = tool

def addr_of_def(def_id): return "/" + def_id.replace("-", "_")

class Defs:
    """The catalog: agent definitions, team definitions (members, coordinator, handoffs), org definitions."""
    def __init__(self):
        self.agents, self.teams, self.orgs = {}, {}, {}
    def agent(self, def_id, name): self.agents[def_id] = name
    def team(self, def_id, name, members, coordinator, handoffs=()):
        self.teams[def_id] = {"name": name, "members": list(members), "coordinator": coordinator, "handoffs": list(handoffs)}
    def org(self, def_id, name, agents, mounted, handoffs=()):
        self.orgs[def_id] = {"name": name, "agents": list(agents), "mounted": list(mounted), "handoffs": list(handoffs)}

class World:
    def __init__(self, defs):
        self.defs = defs
        self.disk = {}
        self.runs = {}          # agent run id -> (node, run kind, run id)
        self.result = None
        self.receiver_sees = None
        self.node_ids = {"A": "node-a-77d2", "B": "node-b-1f0e"}
        self.node_names = {"A": "node-a", "B": "node-b"}

    # ---------- paths
    @staticmethod
    def p(node, path): return f"{node}:{path}"
    def agent_dir(self, node, run_id): return f"memory/agents/{run_id}"
    def run_file(self, node, kind, run_id):
        return self.p(node, {"agent": f"memory/agents/{run_id}/run_metadata.json",
                             "agent_team": f"memory/agent_teams/{run_id}/team_run_execution_tree.json",
                             "agent_org": f"memory/agent_orgs/{run_id}/agent_org_run_execution_tree.json"}[kind])
    def log_path(self, node, kind, run_id):
        return self.p(node, {"agent": f"memory/agents/{run_id}/communication_messages_active.jsonl",
                             "agent_team": f"memory/agent_teams/{run_id}/team_communication_messages_active.jsonl",
                             "agent_org": f"memory/agent_orgs/{run_id}/agent_org_communication_messages_active.jsonl"}[kind])
    def index_path(self, node, kind):
        return self.p(node, {"agent": "memory/run_history_index.json", "agent_team": "memory/team_run_history_index.json",
                             "agent_org": "memory/agent_org_run_history_index.json"}[kind])
    ROW_KEY = {"agent": "runId", "agent_team": "teamRunId", "agent_org": "orgRunId"}
    def row(self, node, kind, run_id):
        for r in self.disk.get(self.index_path(node, kind), []):
            if r[self.ROW_KEY[kind]] == run_id: return r
        return None
    def add_row(self, node, kind, row): self.disk.setdefault(self.index_path(node, kind), []).append(row)
    def member_dir(self, node, kind, run_id, agent_id, team_run_id=None):
        if kind == "agent": return self.p(node, f"memory/agents/{run_id}/ (memory)")
        if kind == "agent_team": return self.p(node, f"memory/agent_teams/{run_id}/{agent_id}/ (memory)")
        return self.p(node, f"memory/agent_orgs/{run_id}/{team_run_id + '/' if team_run_id else ''}{agent_id}/ (memory)")

    # ---------- runs and their agents
    def run_of(self, agent_id):
        if agent_id not in self.runs: raise Refused("COLLABORATION_TARGET_NOT_FOUND", f"No run has agent {agent_id}.")
        return self.runs[agent_id]
    def file_of(self, run): return self.disk[self.run_file(*run)]
    def agent_info(self, agent_id):
        """(own-space address, mounted team prefix or None, mounted team members {address: id}, coordinator id)."""
        node, kind, run_id = self.run_of(agent_id); f = self.file_of((node, kind, run_id))
        if kind == "agent": return (f.get("address") or addr_of_def(f["agentDefinitionId"]), None, {}, None)
        if kind == "agent_team":
            ms = {m["address"]: m["agentRunId"] for m in f["rootTeam"]["members"]}
            return (next(a for a, i in ms.items() if i == agent_id), None, ms, ms[f["rootTeam"]["coordinatorAddress"]])
        for m in f["rootOrg"]["members"]:
            if m.get("agentRunId") == agent_id: return (m["address"], None, {}, None)
            for y in m.get("members", []):
                if y["agentRunId"] == agent_id:
                    sub = {z["address"]: z["agentRunId"] for z in m["members"]}
                    return (y["address"], m["address"], sub, sub[m["coordinatorAddress"]])
        raise KeyError(agent_id)
    def standing(self, run):
        node, kind, run_id = run; f = self.file_of(run)
        if kind == "agent": return {f.get("address") or addr_of_def(f["agentDefinitionId"]): run_id}
        if kind == "agent_team": return {m["address"]: m["agentRunId"] for m in f["rootTeam"]["members"]}
        out = {}
        for m in f["rootOrg"]["members"]:
            if "agentRunId" in m: out[m["address"]] = m["agentRunId"]
            for y in m.get("members", []): out[y["address"]] = y["agentRunId"]
            if "members" in m: out[m["address"]] = next(y["agentRunId"] for y in m["members"] if y["address"] == m["coordinatorAddress"])
        return out
    def agents_of(self, run): return sorted(set(self.standing(run).values()))
    def agents_with_addresses(self, run):
        """The tree's per-run agents: each agent by run ID with its own address in the run's space, read once from the run's own file."""
        node, kind, run_id = run; f = self.file_of(run)
        if kind == "agent": out = [(run_id, f.get("address") or addr_of_def(f["agentDefinitionId"]))]
        elif kind == "agent_team": out = [(m["agentRunId"], m["address"]) for m in f["rootTeam"]["members"]]
        else:
            out = []
            for m in f["rootOrg"]["members"]:
                if "agentRunId" in m: out.append((m["agentRunId"], m["address"]))
                out += [(y["agentRunId"], y["address"]) for y in m.get("members", [])]
        return [{"agentRunId": i, "address": a} for i, a in sorted(out)]
    def entry_agent(self, run):
        node, kind, run_id = run; f = self.file_of(run)
        if kind == "agent": return run_id
        return next(m["agentRunId"] for m in f["rootTeam"]["members"] if m["address"] == f["rootTeam"]["coordinatorAddress"])

    # ---------- Tasks
    def task_dir(self, node, task):
        return f"projects/{task['projectId']}/tasks/{task['taskId']}" if task.get("projectId") else f"ad-hoc-tasks/{task['taskId']}"
    def tasks(self, node):
        return {v["taskId"]: (k, v) for k, v in self.disk.items() if k.startswith(node + ":") and k.endswith("/task.json")}
    def task_by_key(self, node, key):
        for tid, (k, v) in self.tasks(node).items():
            if v.get("taskKey") == key or tid == key: return v
        raise Refused("TASK_NOT_FOUND", f"No Task {key}.")
    def resources_path(self, node, task): return self.p(node, self.task_dir(node, task) + "/agent_run_resources.json")
    def entries(self, node):
        """Every Task entry on the node: (task id, entry)."""
        out = []
        for k, v in self.disk.items():
            if k.startswith(node + ":") and k.endswith("/agent_run_resources.json"):
                out += [(v["taskId"], e) for e in v["agentRunResources"]]
        return out
    @staticmethod
    def run_key_of_entry(e):
        a = e["agentRun"]; return ("agent", a["agentRunId"]) if a["kind"] == "agent" else ("agent_team", a["teamRunId"])
    def entries_of(self, node, run): return [(t, e) for t, e in self.entries(node) if self.run_key_of_entry(e) == (run[1], run[2])]
    def open_tasks(self, node, run): return {t for t, e in self.entries_of(node, run) if e["closedAt"] is None}
    def assigners(self, node, task_id):
        return {(e["delegatedFrom"]["delegatingRun"]["kind"], e["delegatedFrom"]["delegatingRun"]["runId"])
                for t, e in self.entries(node) if t == task_id and e["role"] == "assigned"}
    def run_by_key(self, node, kind, run_id): return (node, kind, run_id)

    # ---------- the DelegationIndex (derived)
    def tree(self, node):
        nodes = {}
        def ensure(k):
            if k not in nodes:
                run = (node, k[0], k[1]); local = self.run_file(*run) in self.disk
                nodes[k] = {"run": {"kind": k[0], "runId": k[1]}, "parent": None, "tasks": [], "agents": self.agents_with_addresses(run) if local else []}
            return nodes[k]
        stored = lambda k: self.run_file(node, k[0], k[1]) in self.disk
        for t, e in self.entries(node):
            dr = e["delegatedFrom"]["delegatingRun"]; drk = (dr["kind"], dr["runId"])
            # a deleted run is not a node (contract §4, T-8): an entry naming it keeps its record, but the tree skips it
            if "nodeId" not in e and not stored(self.run_key_of_entry(e)): continue
            if stored(drk): ensure(drk)
            n = ensure(self.run_key_of_entry(e))
            if stored(drk):
                n["parent"] = {"kind": dr["kind"], "runId": dr["runId"]}; n["delegatorAgentRunId"] = e["delegatedFrom"]["delegatorAgentRunId"]
            asg = sorted(a for a in self.assigners(node, t) if stored(a))
            n["tasks"].append({"taskId": t, "role": e["role"], "open": e["closedAt"] is None,
                               "assigner": {"kind": asg[0][0], "runId": asg[0][1]} if asg else None})
            if "nodeId" in e: n["node"] = e["nodeId"]; n["agents"] = [{"agentRunId": m["agentRunId"], "address": m["address"]} for m in e["members"]]
        # one tree per run the user started (contract §4): a node's tree is the run at the top of its chain
        def top_of(n):
            seen = set()
            while n["parent"] is not None and (n["parent"]["kind"], n["parent"]["runId"]) in nodes and id(n) not in seen:
                seen.add(id(n)); n = nodes[(n["parent"]["kind"], n["parent"]["runId"])]
            return n["run"]
        for n in nodes.values(): n["tree"] = top_of(n)
        order = ["run", "tree", "parent", "delegatorAgentRunId", "node", "tasks", "agents"]
        return [{k: n[k] for k in order if k in n} for n in nodes.values()]

    # ---------- the rules
    def can_message(self, node, a, b):
        """§2.2: (a) a shared open Task, or (b) one is the assigner of an open Task of the other."""
        if a == b: return True
        ta, tb = self.open_tasks(node, a), self.open_tasks(node, b)
        if ta & tb: return True
        if any((a[1], a[2]) in self.assigners(node, t) for t in tb): return True
        if any((b[1], b[2]) in self.assigners(node, t) for t in ta): return True
        return False
    def resolve(self, sender, address):
        """§2.3. Returns (receiver agent id, step) or raises not found / self."""
        node, kind, run_id = run = self.run_of(sender)
        own, prefix, team, _ = self.agent_info(sender)
        if address == own: raise Refused("COLLABORATION_SELF_TARGET_REJECTED", "You can't send a message to yourself.")
        if kind == "agent_team" and address in team: return team[address], 1
        if prefix:
            if address == prefix: return self.agent_info(sender)[3], 1
            if address.startswith(prefix + "/"):
                if address in team: return team[address], 1
                raise Refused("COLLABORATION_TARGET_NOT_FOUND", NOT_FOUND(address))
        if self.entries_of(node, run):
            if kind == "agent_team":  # BEFORE step 2 (SR-081, CR-461-081): an address under the run's own delegated name means its own
                # teammate, never the assigner's namesake agent; the assigner's agent stays reachable by run ID
                # an address under the name the team was delegated to (its recipientAddress, the prefix its members used
                # before SR-025) is corrected, not resolved: the refusal names the address to use (contract §2.3)
                for pre in sorted({e["recipientAddress"] for t, e in self.entries_of(node, run)}):
                    if address == pre:
                        raise Refused("COLLABORATION_TARGET_NOT_FOUND", f"{address} is no longer an address: your team is addressed from its own root. "
                                      f"Your team as a whole has no address; its coordinator is {self.file_of(run)['rootTeam']['coordinatorAddress']}.")
                    if address.startswith(pre + "/") and address[len(pre):] in team:
                        raise Refused("COLLABORATION_TARGET_NOT_FOUND", f"{address} is no longer an address: your team is addressed from its own root. "
                                      f"Use {address[len(pre):]}.")
            # step 2 belongs to a run that works on a Task (its entries), not to every delegated run: a run whose Task
            # was deleted is a run of its own and uses step 3 (§5.4.4)
            for t in sorted(self.open_tasks(node, run)) or sorted({t for t, e in self.entries_of(node, run)}):
                for ak in sorted(self.assigners(node, t)):
                    if self.run_file(node, ak[0], ak[1]) not in self.disk: continue  # a deleted assigner reaches nothing (T-8)
                    st = self.standing((node, ak[0], ak[1]))
                    if address in st: return st[address], 2
            raise Refused("COLLABORATION_TARGET_NOT_FOUND", NOT_FOUND(address))
        st = self.standing(run)
        if address in st and st[address] != sender: return st[address], 3
        raise Refused("COLLABORATION_TARGET_NOT_FOUND", NOT_FOUND(address))
    def reaching_address(self, receiver, sender):
        """§2.4: the sender's own-space address, when the receiver resolves it back to the sender."""
        if self.run_of(receiver)[0] != self.run_of(sender)[0]: return None
        own = self.agent_info(sender)[0]
        try: return own if self.resolve(receiver, own)[0] == sender else None
        except Refused: return None

    # ---------- operations: runs the user starts
    def start_agent(self, node, run_id, def_id, at, project=None):
        self.runs[run_id] = (node, "agent", run_id)
        self.disk[self.run_file(node, "agent", run_id)] = {
            "runId": run_id, "agentDefinitionId": def_id, "workspaceRootPath": "/Users/me/projects/x",
            "memoryDir": f"…/memory/agents/{run_id}", "llmModelIdentifier": ELL, "llmConfig": {ELL: ELL}, "autoExecuteTools": True,
            "runtimeKind": ELL, "platformAgentRunId": ELL, "startedAt": at}
        self.add_row(node, "agent", {"runId": run_id, "agentDefinitionId": def_id, "agentName": self.defs.agents[def_id],
                                     "workspaceRootPath": "/Users/me/projects/x", "summary": ELL, "createdAt": at, "archivedAt": None, "terminatedAt": None})
        self.disk[self.member_dir(node, "agent", run_id, run_id)] = "created"
        if project:
            self.disk.setdefault(self.p(node, f"projects/{project}/project_runs.json"), {"projectId": project, "runs": []})["runs"].append(
                {"root": {"kind": "agent", "runId": run_id}, "linkedAt": at})
    def _team_file(self, run_id, def_id, member_ids, at):
        d = self.defs.teams[def_id]
        return {"schemaVersion": 1, "createdAt": at, "archivedAt": None, "applicationBinding": None,
                "handoffs": [{"from": f, "to": t, "rules": [r]} for f, t, r in d["handoffs"]],
                "rootTeam": {"address": "/", "teamDefinitionId": def_id, "teamDefinitionName": d["name"], "teamRunId": run_id,
                             "coordinatorAddress": addr_of_def(d["coordinator"]), "defaultLaunchConfiguration": {ELL: ELL},
                             "members": [{"address": addr_of_def(m), "agentDefinitionId": m, "role": ELL, "description": ELL,
                                          "agentRunId": member_ids[m], "platformAgentRunId": ELL, "launchConfiguration": {ELL: ELL}}
                                         for m in d["members"]]}}
    def start_team(self, node, run_id, def_id, member_ids, at):
        for i in member_ids.values(): self.runs[i] = (node, "agent_team", run_id)
        self.disk[self.run_file(node, "agent_team", run_id)] = self._team_file(run_id, def_id, member_ids, at)
        d = self.defs.teams[def_id]
        self.add_row(node, "agent_team", {"teamRunId": run_id, "teamDefinitionId": def_id, "teamDefinitionName": d["name"],
                                          "workspaceRootPath": "/Users/me/projects/x", "summary": ELL, "createdAt": at, "archivedAt": None, "terminatedAt": None})
    def start_org(self, node, run_id, def_id, agent_ids, team_run_ids, at):
        d = self.defs.orgs[def_id]; members = []
        for a in d["agents"]:
            self.runs[agent_ids[a]] = (node, "agent_org", run_id)
            members.append({"address": addr_of_def(a), "agentDefinitionId": a, "agentRunId": agent_ids[a], "launchConfiguration": {ELL: ELL}})
        for tdef in d["mounted"]:
            td = self.defs.teams[tdef]; pre = addr_of_def(tdef)
            for m in td["members"]: self.runs[agent_ids[m]] = (node, "agent_org", run_id)
            members.append({"address": pre, "teamDefinitionId": tdef, "teamRunId": team_run_ids[tdef], "coordinatorAddress": pre + addr_of_def(td["coordinator"]),
                            "members": [{"address": pre + addr_of_def(m), "agentDefinitionId": m, "agentRunId": agent_ids[m], "launchConfiguration": {ELL: ELL}} for m in td["members"]]})
        self.disk[self.run_file(node, "agent_org", run_id)] = {
            "subjectKind": "agent_org", "createdAt": at, "archivedAt": None, "applicationBinding": None,
            "handoffs": [{"from": f, "to": t, "rules": [r]} for f, t, r in d["handoffs"]],
            "rootOrg": {"address": "/", "orgDefinitionId": def_id, "orgDefinitionName": d["name"], "orgRunId": run_id,
                        "defaultLaunchConfiguration": {ELL: ELL}, "members": members}}
        self.add_row(node, "agent_org", {"orgRunId": run_id, "orgDefinitionId": def_id, "orgDefinitionName": d["name"],
                                         "workspaceRootPath": "/Users/me/projects/x", "summary": ELL, "createdAt": at, "archivedAt": None, "terminatedAt": None})
    def create_task(self, node, project, task_id, key, title, status, at):
        t = {"taskId": task_id, "projectId": project, "taskKey": key, "title": title, "description": ELL, "status": status,
             "dependsOnTaskIds": [], "partOfTaskId": None, "createdAt": at, "updatedAt": at, "contextFiles": [], "comments": []}
        self.disk[self.p(node, self.task_dir(node, t) + "/task.json")] = t

    # ---------- the agent's life
    def activate(self, agent_id):
        node, kind, run_id = self.run_of(agent_id)
        team_run = None
        if kind == "agent_org":
            info = self.agent_info(agent_id)
            if info[1]:
                f = self.file_of((node, kind, run_id)); team_run = next(m["teamRunId"] for m in f["rootOrg"]["members"] if m["address"] == info[1])
        self.disk.setdefault(self.member_dir(node, kind, run_id, agent_id, team_run), "created")
        r = self.row(node, kind, run_id)
        if r and r["terminatedAt"] is not None: r["terminatedAt"] = None
    def stop(self, run, at):
        r = self.row(*run)
        if r is not None and r["terminatedAt"] is None: r["terminatedAt"] = at

    # ---------- messages
    def _log(self, run, line): self.disk.setdefault(self.log_path(*run), []).append(line)
    def _deliver(self, sender, receiver, content, message_type, message_id, at, shown_as, wake=True):
        a, b = self.run_of(sender), self.run_of(receiver)
        line = {"messageId": message_id, "senderAgentRunId": sender, "receiverAgentRunId": receiver, "content": content,
                "messageType": message_type, "referenceFiles": [], "createdAt": at}
        self._log(a, dict(line))
        if b != a: self._log(b, dict(line))
        if wake: self.activate(receiver)
        addr = self.reaching_address(receiver, sender)
        if a[0] != b[0]:
            self.receiver_sees = f'You received a message from the agent with sender run id "{sender}" on node "{self.node_names[a[0]]}".'
        else:
            self.receiver_sees = (f'You received a message from the agent with sender address "{addr}" and sender run id "{sender}".' if addr
                                  else f'You received a message from the agent with sender run id "{sender}".')
        if a[0] != b[0]: text = f'Delivered message to {receiver} on node "{self.node_names[b[0]]}".'   # to another node
        elif shown_as is None: text = "Message delivered."                     # by run ID, on this node
        else: text = f"Delivered message to {shown_as}."                       # by address
        self.result = {"accepted": True, "code": "DELIVERED", "message": text, "target_agent_run_id": receiver}
    def _admit(self, sender, receiver):
        a, b = self.run_of(sender), self.run_of(receiver)
        if a == b: return
        if a[0] != b[0]:
            # across nodes: the peer side admits its own delegator; this side admits by its Task entry
            local, peer = (a, b) if self.file_of(a).get("delegatedFrom", {}).get("nodeId") is None else (b, a)
            pf = self.file_of(peer)["delegatedFrom"]
            other = receiver if peer == a else sender
            entry = [e for t, e in self.entries(local[0]) if "nodeId" in e and self.run_key_of_entry(e) == (peer[1], peer[2])]
            if pf["delegatorAgentRunId"] != other:
                # autobyteus-492 (CM-13, DEC-011): any other agent reaches the run by its run ID while it runs (DS-006), except
                # that the node holding its Task entries refuses every sender of its own once they are all closed (row 13,
                # AR-001, AR-007); a sender on the run's own node cannot know the closure (row 14)
                if a[0] == local[0] and entry and all(e["closedAt"] is not None for e in entry):
                    raise Refused("TASK_AGENT_RESOURCE_CLOSED", CLOSED)
                return "unrelated"
            if not entry or entry[-1]["closedAt"] is not None:
                raise Refused("TASK_AGENT_RESOURCE_CLOSED", CLOSED)
            return
        node = a[0]
        if self.can_message(node, a, b): return
        # an assigner's reactivation of its run's last assigned entry (§5.4.2 R-6)
        for t, e in reversed(self.entries_of(node, b)):
            if e["role"] == "assigned" and e["closedAt"] is not None and e["delegatedFrom"]["delegatorAgentRunId"] == sender:
                status = self.tasks(node)[t][1]["status"] if t in self.tasks(node) else None
                if status in ("TODO", "IN_PROGRESS"): e["closedAt"] = None; return
                # the assigner while the Task is DONE or CANCELLED: base's Task-side text (task-assignment-eligibility.ts:41)
                if status is not None:
                    raise Refused("TASK_AGENT_RESOURCE_CLOSED", f"This Task is {status}. The agent that assigned it can set the Task to TODO or "
                                  "IN_PROGRESS and then message this run id again.")
            break
        # R-8 before R-7 (base: the closed target is answered before the Task scope): a receiver whose entries are all
        # closed is refused as closed, whoever sends, except the assigner's continuation above
        if self.entries_of(node, b) and not self.open_tasks(node, b): raise Refused("TASK_AGENT_RESOURCE_CLOSED", CLOSED)
        shared = {t for t, e in self.entries_of(node, a)} & {t for t, e in self.entries_of(node, b)}
        assigned_by = any((a[1], a[2]) in self.assigners(node, t) for t, e in self.entries_of(node, b))
        if shared or assigned_by: raise Refused("TASK_AGENT_RESOURCE_CLOSED", CLOSED)
        # autobyteus-492 (CM-13, the run ID is the address): runs of different Tasks are unrelated, not refused
        return "unrelated"
    def _send(self, sender, receiver, content, message_type, message_id, at, shown_as):
        """Admission, then delivery; an unrelated receiver only while it runs, never woken (autobyteus-492 DEC-003)."""
        if self._admit(sender, receiver) == "unrelated":
            r = self.row(*self.run_of(receiver))
            if r is None or r["terminatedAt"] is not None: raise Refused("TARGET_AGENT_RUN_NOT_ACTIVE", NOT_RUNNING(receiver))
            return self._deliver(sender, receiver, content, message_type, message_id, at, shown_as, wake=False)
        self._deliver(sender, receiver, content, message_type, message_id, at, shown_as)
    def send_by_address(self, sender, address, content, message_id, at, message_type="agent_message"):
        receiver, step = self.resolve(sender, address)
        self._send(sender, receiver, content, message_type, message_id, at, address); return step
    def _node_rule(self, sender, receiver, node):
        """autobyteus-587 RF-14, before admission and before anything is sent. `node` is a node name as the sender's node
        calls it. Across nodes, the sender's node decides first:
        - `node` names another node: NODE_MISMATCH, with the node the run is on (it names a registered peer; an unknown
          name is refused before this rule and is not modelled);
        - no `node`, and the sender's own run links the run: it delegated it (the run's newest Task entry, open or
          closed, names the sender's run as its delegating run) or it is the run that delegated to the sender's run (its peer `delegatedFrom`):
          NODE_REQUIRED (the sender's root answers first, `deliverExact`);
        - no `node`, and only the sender's node holds Task entries for the run: if they are all closed, CLOSED;
          otherwise NODE_REQUIRED (`CrossRunMessageDelivery.peerRunAdmission`);
        - no `node` otherwise: the run is not on this node, so "not running".
        With the right `node`, the admission that follows is unchanged (`_admit`).
        On one node, `node` is not part of the contract (the model has no such call)."""
        a, b = self.run_of(sender), self.run_of(receiver)
        if a[0] == b[0]:
            if node is not None: raise ValueError("the model has no send with node to a run on the sender's own node")
            return
        there = self.node_names[b[0]]
        if node is not None:
            if node != there: raise Refused("NODE_MISMATCH", NODE_MISMATCH(there, node))
            return
        entries = [e for t, e in self.entries(a[0]) if "nodeId" in e and self.run_key_of_entry(e) == (b[1], b[2])]
        # the root's link to a peer run is its newest Task entry, open or closed (`DelegationIndex.peerChildrenOf`)
        links = bool(entries) and entries[-1]["delegatedFrom"]["delegatingRun"]["runId"] == a[2] \
            or self.file_of(a).get("delegatedFrom", {}).get("delegatorAgentRunId") == receiver
        if links: raise Refused("NODE_REQUIRED", NODE_REQUIRED(there))
        if entries and all(e["closedAt"] is not None for e in entries): raise Refused("TASK_AGENT_RESOURCE_CLOSED", CLOSED)
        if entries: raise Refused("NODE_REQUIRED", NODE_REQUIRED(there))
        raise Refused("TARGET_AGENT_RUN_NOT_ACTIVE", NOT_RUNNING(receiver))
    def send_by_run_id(self, sender, receiver, content, message_id, at, message_type="agent_message", node=None):
        """`send_message_to(target_agent_run_id, node?)`."""
        if receiver not in self.runs:
            # a team run's ID is answered with its coordinator's, whether the team runs or not (R-12; base's text)
            node = self.run_of(sender)[0]
            if self.run_file(node, "agent_team", receiver) in self.disk:
                raise Refused("TARGET_IS_TEAM_RUN", TEAM_RUN_ID(receiver, self.entry_agent((node, "agent_team", receiver))))
            raise Refused("TARGET_AGENT_RUN_NOT_ACTIVE", NOT_RUNNING(receiver))  # e.g. a deleted run (R-11)
        self._node_rule(sender, receiver, node)
        self._send(sender, receiver, content, message_type, message_id, at, None)
    def handoff_rules(self, agent_id):
        node, kind, run_id = self.run_of(agent_id); own = self.agent_info(agent_id)[0]; f = self.file_of((node, kind, run_id))
        return {"handoffs": [{"when": h["rules"][0], "recipient_address": h["to"]} for h in f.get("handoffs", []) if h["from"] == own]}

    # ---------- delegation
    def delegate(self, sender, address, at, new_run, task_key=None, description=None, node=None, peer_run_node=None):
        try:
            return self._delegate(sender, address, at, new_run, task_key, description, node, peer_run_node)
        except Refused as r:
            r.tool = "delegate_task"; raise
    def _placement_of(self, run, address):
        """An org's in-run mounted team at `address`: (team definition, its members' addresses, the org's handoffs from them)."""
        node, kind, run_id = run
        if kind != "agent_org": return None
        f = self.file_of(run)
        for m in f["rootOrg"]["members"]:
            if m["address"] == address and "members" in m:
                return m["teamDefinitionId"], m["address"], [h for h in f["handoffs"] if h["from"].startswith(address + "/")]
        return None
    def _delegate(self, sender, address, at, new_run, task_key, description, node, peer_run_node):
        """delegate_task(recipient_address, task_id?, description?, node?). `new_run` names the new run: (kind, run id, {member def: agent id})."""
        snode, skind, srun = srun_key = self.run_of(sender)
        own, prefix, team, _ = self.agent_info(sender)
        if address == own: raise Refused("COLLABORATION_SELF_TARGET_REJECTED", f"{address} is your own address; you can't delegate to yourself. Do the work yourself, or delegate it to another agent or agent team.")
        if (skind == "agent_team" and address in team) or (prefix and (address == prefix or address.startswith(prefix + "/"))):
            raise Refused("COLLABORATION_SELF_TARGET_REJECTED", f"{address} is in your own team; you can't delegate to it. Talk with it using send_message_to.")
        if peer_run_node and task_key:
            raise Refused("SAVED_TASK_TO_PEER", SAVED_TASK_TO_PEER)
        placement = self._placement_of(srun_key, address)
        def_id = placement[0] if placement else next((d for d in list(self.defs.agents) + list(self.defs.teams) if addr_of_def(d) == address), None)
        f = self.file_of(srun_key)
        own_def = f.get("agentDefinitionId") or f.get("rootTeam", {}).get("teamDefinitionId") or f.get("rootOrg", {}).get("orgDefinitionId")
        if def_id is None or def_id == own_def:
            # a run never lists nor delegates to its own definition (base: collaborator-candidate-policy requireEligible;
            # autobyteus-455 AC-006): it would copy itself, and each copy could copy itself again
            raise Refused("COLLABORATION_TARGET_NOT_FOUND", f"'{address}' is not the address of an available agent or agent team. "
                          "If you have list_available_agents, it shows the addresses you can use.")
        # which Task
        if task_key and self.entries_of(snode, srun_key):
            # a run that works on a Task delegates its own work by description only (base: new-copy-work.ts:49)
            raise Refused("TASK_AGENT_RESOURCE_OWNED_SENDER", "You are a task agent, so you can't use task_id. Delegate with a description instead; that work is part of your Task.")
        if task_key:
            task = self.task_by_key(snode, task_key); role = "assigned"
            if task["status"] not in ("TODO", "IN_PROGRESS"): raise Refused("TASK_NOT_ASSIGNABLE", f"The Task is {task['status']}.")
        else:
            mine = self.entries_of(snode, srun_key)
            if mine:
                # sub-work joins the run's current entry: its newest open entry, else its newest entry
                # (by linkedAt; tie: the greater Task ID), which must be open (base: deriveCurrent, linkInherited)
                pool = [te for te in mine if te[1]["closedAt"] is None] or mine
                t, cur = max(pool, key=lambda te: (te[1]["linkedAt"], te[0]))
                if cur["closedAt"] is not None: raise Refused("TASK_AGENT_RESOURCE_CLOSED", "Your Task is DONE or CANCELLED, so you can't start new work.")
                task = self.tasks(snode)[t][1]; role = "subWork"
            else:
                tid = new_run[3]; task = {"taskId": tid, "projectId": None, "title": ELL, "description": description, "status": "IN_PROGRESS",
                                         "createdAt": at, "updatedAt": at}
                self.disk[self.p(snode, self.task_dir(snode, task) + "/task.json")] = task; role = "assigned"
        kind, run_id, members = new_run[0], new_run[1], new_run[2]
        rnode = peer_run_node or snode
        df = {"delegatingRun": {"kind": skind, "runId": srun}, "delegatorAgentRunId": sender}
        own_df = dict(df, nodeId=self.node_ids[snode]) if peer_run_node else df
        if peer_run_node: own_df = {"nodeId": self.node_ids[snode], **df}
        if kind == "agent":
            self.runs[run_id] = (rnode, "agent", run_id)
            self.disk[self.run_file(rnode, "agent", run_id)] = {
                "runId": run_id, "agentDefinitionId": def_id, "address": address, "workspaceRootPath": "/Users/me/projects/x",
                "memoryDir": f"…/memory/agents/{run_id}", "llmModelIdentifier": ELL, "llmConfig": {ELL: ELL}, "autoExecuteTools": True,
                "runtimeKind": ELL, "platformAgentRunId": ELL, "startedAt": at,
                "launchSource": {"origin": "agent_default", "fallbacks": []}, "delegatedFrom": own_df}
            self.add_row(rnode, "agent", {"runId": run_id, "agentDefinitionId": def_id, "agentName": self.defs.agents[def_id],
                                          "workspaceRootPath": "/Users/me/projects/x", "summary": ELL, "createdAt": at, "archivedAt": None, "terminatedAt": None})
            agent_run = {"kind": "agent", "agentRunId": run_id}
        else:
            for i in members.values(): self.runs[i] = (rnode, "agent_team", run_id)
            tf = self._team_file(run_id, def_id, members, at); tf["delegatedFrom"] = own_df
            if placement:
                # a copy of an org's in-run placement carries the org's handoffs from its members, team-local; a `to`
                # outside the team is kept as written, an external target (contract §3.2)
                pre = placement[1]
                loc = lambda x: x[len(pre):] if x.startswith(pre + "/") else x
                tf["handoffs"] = [{"from": loc(h["from"]), "to": loc(h["to"]), "rules": list(h["rules"])} for h in placement[2]]
            self.disk[self.run_file(rnode, "agent_team", run_id)] = tf
            d = self.defs.teams[def_id]
            self.add_row(rnode, "agent_team", {"teamRunId": run_id, "teamDefinitionId": def_id, "teamDefinitionName": d["name"],
                                               "workspaceRootPath": "/Users/me/projects/x", "summary": ELL, "createdAt": at, "archivedAt": None, "terminatedAt": None})
            agent_run = {"kind": "team", "teamRunId": run_id, "coordinatorAgentRunId": members[d["coordinator"]]}
        entry = {"role": role, "delegatedFrom": df, "recipientAddress": address, "agentRun": agent_run}
        if peer_run_node:
            entry["nodeId"] = self.node_ids[peer_run_node]
            if kind != "agent":
                entry["members"] = [{"address": m["address"], "agentRunId": m["agentRunId"]} for m in self.disk[self.run_file(rnode, "agent_team", run_id)]["rootTeam"]["members"]]
        entry.update({"linkedAt": at, "start": "started", "closedAt": None})
        rp = self.resources_path(snode, task)
        self.disk.setdefault(rp, {"taskId": task["taskId"], "agentRunResources": []})["agentRunResources"].append(entry)
        # the delegator's run collaborates: an agent run's own address and its row's hasCollaboration (§3.3, §3.5)
        if skind == "agent":
            f = self.file_of(srun_key)
            if "address" not in f:
                items = list(f.items()); items.insert(2, ("address", own)); self.disk[self.run_file(*srun_key)] = dict(items)
            r = self.row(snode, "agent", srun)
            if not r.get("hasCollaboration"): r["hasCollaboration"] = True
        self.activate(self.entry_agent((rnode, "agent" if kind == "agent" else "agent_team", run_id)))
        res = {"delegated": True, "target_kind": "agent" if kind == "agent" else "team"}
        if peer_run_node: res["node"] = node
        if kind == "agent": res["target_agent_run_id"] = run_id
        else: res.update({"target_team_run_id": run_id, "target_team_coordinator_agent_run_id": agent_run["coordinatorAgentRunId"]})
        if role == "assigned" and not task_key: res["task_id"] = task["taskId"]
        self.result = res; self.receiver_sees = None
        return role
    def delegate_existing(self, sender, target_run, task_key, message_id, at):
        """delegate_task(target_*_run_id, task_id): only the delegator of the run's most recent assignment."""
        snode, skind, srun = self.run_of(sender); run = (snode, target_run[0], target_run[1])
        assigned = [e for t, e in self.entries_of(snode, run) if e["role"] == "assigned"]
        if assigned:
            last = assigned[-1]
        else:
            # every Task of the run was deleted (F-24, base): its own delegatedFrom names who may give it a new Task
            f = self.file_of(run); df = {k: v for k, v in f["delegatedFrom"].items() if k != "nodeId"}
            last = {"role": "assigned", "delegatedFrom": df, "recipientAddress": f.get("address") or addr_of_def(f["agentDefinitionId"]),
                    "agentRun": {"kind": "agent", "agentRunId": run[2]} if run[1] == "agent" else
                                {"kind": "team", "teamRunId": run[2], "coordinatorAgentRunId": self.entry_agent(run)}}
        if last["delegatedFrom"]["delegatorAgentRunId"] != sender:
            raise Refused("TASK_DELEGATION_NOT_ALLOWED", f"{run[2]} is not one of your task agents. Use a run id that delegate_task returned to you, "
                          "or delegate to a new task agent with recipient_address.", tool="delegate_task")
        task = self.task_by_key(snode, task_key)
        entry = {k: copy.deepcopy(last[k]) for k in ("role", "delegatedFrom", "recipientAddress", "agentRun")}
        entry.update({"linkedAt": at, "start": "started", "closedAt": None})
        self.disk.setdefault(self.resources_path(snode, task), {"taskId": task["taskId"], "agentRunResources": []})["agentRunResources"].append(entry)
        receiver = self.entry_agent(run)
        a, b = self.run_of(sender), run
        line = {"messageId": message_id, "senderAgentRunId": sender, "receiverAgentRunId": receiver,
                "content": f"New Task assigned to you: {task['taskKey']}. …", "messageType": "task_assignment", "referenceFiles": [], "createdAt": at}
        self._log(a, dict(line)); self._log(b, dict(line)); self.activate(receiver)
        self.result = {"delegated": True, "target_kind": "team" if target_run[0] == "agent_team" else "agent",
                       **({"target_team_run_id": target_run[1], "target_team_coordinator_agent_run_id": receiver} if target_run[0] == "agent_team" else {"target_agent_run_id": target_run[1]})}

    # ---------- Task changes
    def _stop_runs_without_open_task(self, node, task_id, at):
        for t, e in self.entries(node):
            if t != task_id: continue
            k = self.run_key_of_entry(e)
            if "nodeId" in e:
                # a peer's run is fenced, not stopped: its closed entry refuses its messages, and the run stops on its
                # own node when it goes idle (base: remote-endpoint.ts closureFence; requirements: out of scope)
                continue
            if not self.open_tasks(node, (node, k[0], k[1])): self.stop((node, k[0], k[1]), at)
    def delete_run(self, run, at):
        """The user deletes a run (REQ-007, TC-2, TC-3; T-5, T-8). Refused while a run it delegated to works, on this node
        or a peer (its row there is not stopped). Otherwise the run's own files and row go. Task entries are the Task's
        record and stay; the tree no longer has the run, so the runs it delegated to are the tops of their own trees."""
        node, kind, run_id = run
        # an active run is refused first, as at base: the user stops it, then deletes it (K-15)
        own = self.row(node, kind, run_id)
        if own is not None and own["terminatedAt"] is None:
            raise Refused(None, {"agent": "Run is active. Terminate it before deleting history.",
                                 "agent_team": "Team run is active or stopping. Terminate it before deleting history.",
                                 "agent_org": "AgentOrg run is active or managed. Terminate it before deleting history."}[kind], tool="user")
        node_of = {v: k for k, v in self.node_ids.items()}
        working = []
        for t, e in self.entries(node):
            dr = e["delegatedFrom"]["delegatingRun"]
            if (dr["kind"], dr["runId"]) != (kind, run_id) or e["closedAt"] is not None: continue
            ck = self.run_key_of_entry(e); r = self.row(node_of[e["nodeId"]] if "nodeId" in e else node, ck[0], ck[1])
            if r is not None and r["terminatedAt"] is None: working.append(e["recipientAddress"])
        if working: raise Refused(None, DELEGATED_WORK("deleted", ", ".join(working)), tool="user")
        # its Tasks with no Project go with it (base: task-keys AC-021, a deleted chat's Temp tasks; K-14): a Task with no
        # Project whose assigned entry this run made. A Project Task stays: it belongs to its Project.
        for tid, (k, t) in list(self.tasks(node).items()):
            if t.get("projectId") is not None: continue
            if any(dr == (kind, run_id) for dr in self.assigners(node, tid)):
                for key in [x for x in self.disk if x.startswith(self.p(node, self.task_dir(node, t) + "/"))]: del self.disk[key]
        folder = self.run_file(*run).rsplit("/", 1)[0] + "/"
        for k in [k for k in self.disk if k.startswith(folder)]: del self.disk[k]
        rows = self.disk.get(self.index_path(node, kind), [])
        rows[:] = [r for r in rows if r[self.ROW_KEY[kind]] != run_id]
        for a in [a for a, r in self.runs.items() if r == run]: del self.runs[a]
        self.result = None
    def update_task(self, sender, task_key, status, at):
        node = self.run_of(sender)[0]; task = self.task_by_key(node, task_key)
        task["status"] = status; task["updatedAt"] = at
        if status in ("DONE", "CANCELLED"):
            rp = self.resources_path(node, task)
            for e in self.disk.get(rp, {"agentRunResources": []})["agentRunResources"]:
                if e["closedAt"] is None: e["closedAt"] = at
            self._stop_runs_without_open_task(node, task["taskId"], at)
        self.result = {"taskId": task.get("taskKey") or task["taskId"], "status": status}  # abbreviated: the Task's identity and status
    def delete_task(self, node, task_key, at):
        task = self.task_by_key(node, task_key); rp = self.resources_path(node, task)
        for e in self.disk.get(rp, {"agentRunResources": []})["agentRunResources"]:
            if e["closedAt"] is None: e["closedAt"] = at
        self._stop_runs_without_open_task(node, task["taskId"], at)
        for k in [k for k in self.disk if k.startswith(self.p(node, self.task_dir(node, task) + "/"))]: del self.disk[k]
        self.result = None
