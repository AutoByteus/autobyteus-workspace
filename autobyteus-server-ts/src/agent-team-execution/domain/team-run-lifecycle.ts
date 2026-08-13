export type TeamRunLifecycleSnapshot = {
  teamRunId: string;
  isActive: boolean;
};

export type TeamRunLifecycleListener = (
  snapshot: TeamRunLifecycleSnapshot,
) => void;

export type TeamRunLifecycleUnsubscribe = () => void;
