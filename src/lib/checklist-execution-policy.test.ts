import { describe, expect, it } from "vitest";
import { findExecutionStartBlock } from "./checklist-execution-policy";

describe("checklist execution start policy", () => {
  it("allows a new attempt after a failed completion", () => {
    expect(findExecutionStartBlock([{ id: "failed", status: "completed", outcome: "failure" }])).toBeNull();
  });

  it("blocks a new attempt after a successful completion", () => {
    expect(findExecutionStartBlock([{ id: "successful", status: "completed", outcome: "success" }])).toEqual({ reason: "successful", executionId: "successful" });
  });

  it("blocks a new attempt while another execution is active", () => {
    expect(findExecutionStartBlock([{ id: "active", status: "in_progress", outcome: null }])).toEqual({ reason: "active", executionId: "active" });
  });

  it("prioritizes the successful completion if inconsistent active data also exists", () => {
    expect(findExecutionStartBlock([
      { id: "active", status: "pending", outcome: null },
      { id: "successful", status: "completed", outcome: "success" },
    ])).toEqual({ reason: "successful", executionId: "successful" });
  });
});
