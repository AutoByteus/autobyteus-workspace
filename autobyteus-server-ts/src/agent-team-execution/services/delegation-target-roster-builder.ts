import type { MemberTeamContext } from "../domain/member-team-context.js";

export type DelegationTargetRosterRow =
  | {
      kind: "member";
      targetName: string;
      memberRouteKey: string;
      memberPath: string[];
      role: string | null;
      description: string | null;
      accountableOwnerName: string;
    }
  | {
      kind: "team";
      targetName: string;
      teamRouteKey: string;
      teamPath: string[];
      teamDefinitionId: string;
      ingressCoordinatorName: string | null;
      ingressCoordinatorRouteKey: string | null;
      accountableOwnerName: string;
      role: string | null;
      description: string | null;
    };

export type DelegationTargetRosterManifest = {
  currentMemberName: string;
  rows: DelegationTargetRosterRow[];
};

export class DelegationTargetRosterBuilder {
  build(context: MemberTeamContext): DelegationTargetRosterManifest {
    const currentRouteKey = context.memberRouteKey.trim();
    const currentRunId = context.memberRunId.trim();
    const rows: DelegationTargetRosterRow[] = [];
    for (const member of context.members) {
      if (member.memberKind === "agent") {
        if (member.memberRouteKey === currentRouteKey || member.memberRunId === currentRunId) continue;
        rows.push({
          kind: "member",
          targetName: member.memberName,
          memberRouteKey: member.memberRouteKey,
          memberPath: [...member.memberPath],
          role: member.role ?? null,
          description: member.description ?? null,
          accountableOwnerName: member.memberName,
        });
      } else {
        rows.push({
          kind: "team",
          targetName: member.memberName,
          teamRouteKey: member.memberRouteKey,
          teamPath: [...member.memberPath],
          teamDefinitionId: member.teamDefinitionId,
          ingressCoordinatorName: member.representative?.memberName ?? null,
          ingressCoordinatorRouteKey: member.representative?.memberRouteKey ?? member.coordinatorMemberRouteKey ?? null,
          accountableOwnerName: member.memberName,
          role: member.role ?? null,
          description: member.description ?? null,
        });
      }
    }
    return { currentMemberName: context.memberName, rows };
  }
}

export const buildDelegationTargetRosterManifest = (
  context: MemberTeamContext,
): DelegationTargetRosterManifest => new DelegationTargetRosterBuilder().build(context);

export const renderDelegationTargetRosterManifest = (
  manifest: DelegationTargetRosterManifest,
): string => {
  const lines = ["You can delegate tasks with delegate_task:"];
  if (manifest.rows.length === 0) {
    lines.push("- No delegate_task targets are currently available from this run.");
    return lines.join("\n");
  }
  for (const row of manifest.rows) {
    if (row.kind === "member") {
      lines.push(`- ${row.targetName} — member target; accountable owner: ${row.accountableOwnerName}`);
    } else {
      const ingress = row.ingressCoordinatorName ?? "unresolved";
      lines.push(`- ${row.targetName} — team target; ingress coordinator: ${ingress}; accountable owner: ${row.accountableOwnerName}`);
    }
  }
  return lines.join("\n");
};
