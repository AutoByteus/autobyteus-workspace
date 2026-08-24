import json
import pathlib
import urllib.request

EVIDENCE = pathlib.Path(__file__).resolve().parent
GRAPHQL_URL = "http://127.0.0.1:62318/graphql"


def graphql(query, variables):
    request = urllib.request.Request(
        GRAPHQL_URL,
        data=json.dumps({"query": query, "variables": variables}).encode(),
        headers={"content-type": "application/json"},
    )
    with urllib.request.urlopen(request) as response:
        payload = json.load(response)
    if payload.get("errors"):
        raise RuntimeError(json.dumps(payload["errors"], indent=2))
    return payload["data"]


RESUME = """
query($teamRunId:String!){
  getTeamRunResumeConfig(teamRunId:$teamRunId){teamRunId isActive executionTree}
}
"""
PROJECTION = """
query($teamRunId:String!,$agentRunId:String!){
  getTeamMemberRunProjection(teamRunId:$teamRunId,agentRunId:$agentRunId){
    agentRunId summary lastActivityAt conversation activities hasEarlierActiveTraceEvents
  }
}
"""
EVENTS = """
query($teamRunId:String!,$agentRunId:String!){
  getTeamMemberEventMonitorActiveTracePage(teamRunId:$teamRunId,agentRunId:$agentRunId){
    beforeCursor hasEarlier loadedEarlierCount activeGeneration cursorStatus
    events {
      eventId turnGroupId occurredAtMs
      visuals {
        ... on EventMonitorUserVisual {kind visualId eventId kindOrdinal text}
        ... on EventMonitorAssistantTextVisual {kind visualId eventId kindOrdinal content}
        ... on EventMonitorThinkingVisual {kind visualId eventId kindOrdinal content}
        ... on EventMonitorToolCardVisual {kind visualId eventId kindOrdinal invocationId cardKind toolName statusKey errorMessage summaryArgs {message text}}
        ... on EventMonitorCompactionVisual {kind visualId eventId kindOrdinal activityId phase message}
      }
    }
  }
}
"""
COMMUNICATION = """
query($teamRunId:String!){
  getTeamCommunicationMessages(teamRunId:$teamRunId){
    messageId senderAgentRunId receiverAgentRunId content messageType createdAt
    referenceFiles {referenceId path type createdAt updatedAt}
  }
}
"""
TASKS = """
query($teamRunId:String!){
  getTaskDelegationRecords(teamRunId:$teamRunId){
    taskId delegatorAgentRunId recipientAddress targetAgentRunId targetTeamRunId status description createdAt
    referenceFiles {referenceId path type createdAt updatedAt}
    updates {kind submissionId reviewId interruptionId reviewedSubmissionId decision content createdAt referenceFiles {referenceId path type createdAt updatedAt}}
  }
}
"""


def load(name):
    return json.loads((EVIDENCE / name).read_text())


def text(value):
    return json.dumps(value, sort_keys=True)


def flatten_execution(node):
    entries = []

    def walk_team(team, configured):
        for member in team.get("members", []):
            kind = member["kind"]
            if kind in ("configured_agent", "task_team_agent"):
                entries.append({
                    "kind": kind,
                    "configured": configured and kind == "configured_agent",
                    "address": member["address"],
                    "agentRunId": member["agent_run_id"],
                })
            elif kind == "configured_team":
                walk_team(member, configured=True)
        for task in team.get("task_executions", []):
            entries.append({
                "kind": task["kind"],
                "configured": False,
                "address": task["address"],
                "teamRunId": task.get("team_run_id"),
                "startedAt": task.get("started_at"),
                "settledAt": task.get("settled_at"),
            })
            if task["kind"] == "task_team":
                walk_team(task, configured=False)

    walk_team(node["root_team"], configured=True)
    return entries


a_pre = load("nth-live-002a-pre-result.json")
a_post = load("nth-live-002a-post-result.json")
b_pre = load("nth-live-002b-pre-result.json")
b_post = load("nth-live-002b-post-result.json")
c_pre = load("nth-live-002c-pre-result.json")
c_post = load("nth-live-002c-post-result.json")

raw = {"scenarios": {}}
for key, pre in (("002A", a_pre), ("002B", b_pre), ("002C", c_pre)):
    root = pre["rootTeamRunId"]
    resume = graphql(RESUME, {"teamRunId": root})["getTeamRunResumeConfig"]
    raw["scenarios"][key] = {
        "resume": resume,
        "flattenedExecution": flatten_execution(resume["executionTree"]),
        "teacherProjection": graphql(PROJECTION, {"teamRunId": root, "agentRunId": pre["teacherId"]})["getTeamMemberRunProjection"],
        "teacherEvents": graphql(EVENTS, {"teamRunId": root, "agentRunId": pre["teacherId"]})["getTeamMemberEventMonitorActiveTracePage"],
    }

for key, pre in (("002A", a_pre), ("002B", b_pre)):
    root = pre["rootTeamRunId"]
    raw["scenarios"][key].update({
        "configuredStudentProjection": graphql(PROJECTION, {"teamRunId": root, "agentRunId": pre["studentId"]})["getTeamMemberRunProjection"],
        "configuredStudentEvents": graphql(EVENTS, {"teamRunId": root, "agentRunId": pre["studentId"]})["getTeamMemberEventMonitorActiveTracePage"],
        "communication": graphql(COMMUNICATION, {"teamRunId": root})["getTeamCommunicationMessages"],
    })

c_root = c_pre["rootTeamRunId"]
c_entries = raw["scenarios"]["002C"]["flattenedExecution"]
c_students = [
    entry for entry in c_entries
    if entry.get("kind") == "task_team_agent" and entry.get("address") == "/StudentStudyGroup/student_one"
]
assert len(c_students) == 2, c_students
raw["scenarios"]["002C"].update({
    "taskStudentProjections": [
        graphql(PROJECTION, {"teamRunId": c_root, "agentRunId": entry["agentRunId"]})["getTeamMemberRunProjection"]
        for entry in c_students
    ],
    "taskStudentEvents": [
        graphql(EVENTS, {"teamRunId": c_root, "agentRunId": entry["agentRunId"]})["getTeamMemberEventMonitorActiveTracePage"]
        for entry in c_students
    ],
    "taskRecords": graphql(TASKS, {"teamRunId": c_root})["getTaskDelegationRecords"],
    "communication": graphql(COMMUNICATION, {"teamRunId": c_root})["getTeamCommunicationMessages"],
})


def projection_summary(projection, markers):
    serialized = text(projection)
    return {
        "agentRunId": projection["agentRunId"],
        "conversationCount": len(projection["conversation"]),
        "activityCount": len(projection["activities"]),
        "lastActivityAt": projection["lastActivityAt"],
        "markersPresent": {marker: marker in serialized for marker in markers},
    }


def event_summary(page, markers):
    serialized = text(page)
    return {
        "eventCount": len(page["events"]),
        "markersPresent": {marker: marker in serialized for marker in markers},
    }


summary = {"scenario": "round-2-real-cold-boundary", "graphqlUrl": GRAPHQL_URL, "results": {}}
for key, pre, post in (("002A", a_pre, a_post), ("002B", b_pre, b_post)):
    observed = raw["scenarios"][key]
    markers = [pre["request"], pre["ack"], post["request"], post["ack"]]
    messages = observed["communication"]
    expected_pairs = [
        (pre["teacherId"], pre["studentId"]),
        (pre["studentId"], pre["teacherId"]),
        (pre["teacherId"], pre["studentId"]),
        (pre["studentId"], pre["teacherId"]),
    ]
    timestamps = [message["createdAt"] for message in messages]
    communication = {
        "messageCount": len(messages),
        "senderReceiverOrderExact": [
            (message["senderAgentRunId"], message["receiverAgentRunId"])
            for message in messages
        ] == expected_pairs,
        "markersInExactOrder": all(marker in messages[index]["content"] for index, marker in enumerate(markers)),
        "timestampsStrictlyOrdered": timestamps == sorted(timestamps) and len(set(timestamps)) == len(timestamps),
        "preReferenceExact": [reference["path"] for reference in messages[0]["referenceFiles"]] == [pre["refPath"]],
        "otherReferenceListsEmpty": all(not message["referenceFiles"] for message in messages[1:]),
        "messageIds": [message["messageId"] for message in messages],
        "createdAt": timestamps,
    }
    result = {
        "rootTeamRunId": pre["rootTeamRunId"],
        "coldInactive": observed["resume"]["isActive"] is False,
        "configuredStudentInCanonicalTree": any(
            entry.get("configured") and entry.get("agentRunId") == pre["studentId"]
            for entry in observed["flattenedExecution"]
        ),
        "configuredStudentProjection": projection_summary(observed["configuredStudentProjection"], markers),
        "configuredStudentEventMonitor": event_summary(observed["configuredStudentEvents"], markers),
        "directRootTeacherProjection": projection_summary(observed["teacherProjection"], markers),
        "communication": communication,
    }
    summary["results"][key] = result
    assert result["coldInactive"] and result["configuredStudentInCanonicalTree"]
    assert result["configuredStudentProjection"]["conversationCount"] > 0
    assert result["configuredStudentProjection"]["activityCount"] > 0
    assert result["configuredStudentProjection"]["lastActivityAt"]
    assert all(result["configuredStudentProjection"]["markersPresent"].values())
    assert result["configuredStudentEventMonitor"]["eventCount"] > 0
    assert all(result["configuredStudentEventMonitor"]["markersPresent"].values())
    assert result["directRootTeacherProjection"]["conversationCount"] > 0
    assert result["directRootTeacherProjection"]["activityCount"] > 0
    assert result["directRootTeacherProjection"]["lastActivityAt"]
    assert all(communication[key] for key in (
        "senderReceiverOrderExact", "markersInExactOrder", "timestampsStrictlyOrdered",
        "preReferenceExact", "otherReferenceListsEmpty",
    ))

c_observed = raw["scenarios"]["002C"]
c_markers = [c_pre["request"], c_pre["token"], c_post["request"], c_post["token"]]
c_projection_summaries = [
    projection_summary(projection, c_markers[index * 2:index * 2 + 2])
    for index, projection in enumerate(c_observed["taskStudentProjections"])
]
c_event_summaries = [
    event_summary(page, c_markers[index * 2:index * 2 + 2])
    for index, page in enumerate(c_observed["taskStudentEvents"])
]
c_records = c_observed["taskRecords"]
c_result = {
    "rootTeamRunId": c_root,
    "coldInactive": c_observed["resume"]["isActive"] is False,
    "settledTaskTeamCount": len([entry for entry in c_entries if entry.get("kind") == "task_team" and entry.get("settledAt")]),
    "taskStudentProjections": c_projection_summaries,
    "taskStudentEventMonitors": c_event_summaries,
    "directRootTeacherProjection": projection_summary(c_observed["teacherProjection"], c_markers),
    "taskRecords": [{
        "taskId": record["taskId"],
        "recipientAddress": record["recipientAddress"],
        "targetTeamRunId": record["targetTeamRunId"],
        "status": record["status"],
        "descriptionMarkers": {marker: marker in record["description"] for marker in (c_pre["request"], c_post["request"])},
        "updates": [{"kind": update["kind"], "decision": update["decision"], "content": update["content"]} for update in record["updates"]],
    } for record in c_records],
}
summary["results"]["002C"] = c_result
assert c_result["coldInactive"] and c_result["settledTaskTeamCount"] == 2
assert len(c_records) == 2
assert all(record["recipientAddress"] == "/StudentStudyGroup" and record["status"] == "accepted" for record in c_records)
assert all([update["kind"] for update in record["updates"]] == ["submission", "review"] for record in c_records)
assert all(record["updates"][1]["decision"] == "accept" for record in c_records)
for result in c_projection_summaries:
    assert result["conversationCount"] > 0 and result["activityCount"] > 0 and result["lastActivityAt"]
    assert all(result["markersPresent"].values())
for result in c_event_summaries:
    assert result["eventCount"] > 0 and all(result["markersPresent"].values())
assert c_result["directRootTeacherProjection"]["conversationCount"] > 0
assert c_result["directRootTeacherProjection"]["activityCount"] > 0
assert c_result["directRootTeacherProjection"]["lastActivityAt"]

(EVIDENCE / "real-boundary-graphql.json").write_text(json.dumps(raw, indent=2) + "\n")
(EVIDENCE / "real-boundary-graphql-summary.json").write_text(json.dumps(summary, indent=2) + "\n")
print(json.dumps(summary, indent=2))
