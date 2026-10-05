from pathlib import Path
W=Path.cwd(); rows=[]
def edit(path,pairs):
 p=W/path;s=p.read_text()
 for a,b in pairs:
  assert a in s,(path,a[:100]);s=s.replace(a,b)
 p.write_text(s);rows.append(path)
base='autobyteus-server-ts/src/'
for root,cls,collaborator in [
 ('standalone-agent-run-root/domain/standalone-agent-run-root.ts','StandaloneRootRecipientResolver','StandaloneRoot'),
 ('agent-org-execution/domain/agent-org-run.ts','AgentOrgRecipientResolver','Org')]:
 pairs=[('    this.delivery = new ',f'''    const recipients = new {cls}({{ getIndex: () => this.index, collaborators: this.collaborators,
      taskScope: sender => taskScopedMessageRecipient({{ sender, lifecycle: this.taskExecutions,
        resolvePlacement: address => recipients.resolveDelegationPlacement(sender, address),
        getAgent: id => this.index.requireAgent(id),
      }}),
    }});
    this.delivery = new '''),
 (f'      recipients: new {cls}({{ getIndex: () => this.index, collaborators: this.collaborators }}),','      recipients,'),
 ('return this.operationGate.run(() => this.delivery.deliverToAddress(sender, input));','return this.operationGate.run(() => this.taskExecutions.withLiveLease(sender.agentRunId, () => this.delivery.deliverToAddress(sender, input)));'),
 ('return this.operationGate.run(() => this.delivery.deliverToRunId(input));','return this.operationGate.run(() => this.taskExecutions.withLiveLease(input.sender.identity.agentRunId, () => this.delivery.deliverToRunId(input)));')]
 if collaborator=='StandaloneRoot':pairs += [('}), options.taskExecutionIdleShutdown ?? {});','}), { ...options.taskExecutionIdleShutdown, lifetimePort: options.lifetimePort });')]
 edit(base+root,pairs)
for f in ['standalone-agent-run-root/services/standalone-root-message-delivery.ts','agent-org-execution/services/agent-org-run-message-delivery.ts']:
 p=W/(base+f);s=p.read_text()
 start=s.index('  async withLiveLease(');end=s.index('\n  }',start)+4
 s=s[:start]+'''  withLiveLease(agentRunId: string, operation: () => Promise<AgentOperationResult>): Promise<AgentOperationResult> {
    return this.options.taskExecutions.withLiveLease(agentRunId, operation);
  }'''+s[end:]
 s=s.replace('RootTaskExecutionLifecycle, TaskExecutionLiveLease','RootTaskExecutionLifecycle')
 s=s.replace('? execute()','? this.options.taskExecutions.withLiveLease(agentRunId, execute, false)')
 s=s.replace('? await execute()','? await this.options.taskExecutions.withLiveLease(agentRunId, execute, false)')
 if f.startswith('agent-org'):
  a='''    return this.options.getCommunication().deliver({''';b='''    return this.withLiveLease(receiver.agentRunId, () => this.options.getCommunication().deliver({'''
  assert s.count(a)==1;s=s.replace(a,b)
  a='''      referenceFiles: input.referenceFiles,
    });
  }

  /** `send_message_to(run ID)''';b='''      referenceFiles: input.referenceFiles,
    }));
  }

  /** `send_message_to(run ID)''';assert a in s;s=s.replace(a,b)
 p.write_text(s);rows.append(str(p.relative_to(W)))
print('\n'.join(rows))
