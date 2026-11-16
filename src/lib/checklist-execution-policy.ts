type ExistingExecution = {
  id: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  outcome: "success" | "failure" | null;
};

export function findExecutionStartBlock(executions: ExistingExecution[]) {
  const successful = executions.find((execution) => execution.status === "completed" && execution.outcome === "success");
  if (successful) return { reason: "successful" as const, executionId: successful.id };

  const active = executions.find((execution) => execution.status === "pending" || execution.status === "in_progress");
  if (active) return { reason: "active" as const, executionId: active.id };

  return null;
}
