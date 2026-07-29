import { describe, expect, it } from "vitest";

import {
  getSimulatedReply,
  initialLoungeState,
  loungeReducer,
} from "./lounge-model";

describe("lounge model", () => {
  it("returns bounded simulated answers without exposing source paths", () => {
    const reply = getSimulatedReply(
      "你如何判断一个机构合作是否值得推进？",
    );

    expect(reply.answer.length).toBeGreaterThan(40);
    expect(reply.answer).not.toMatch(/00-工作台|\/Users\/|\.md/);
  });

  it("pulses the ring only for the first submitted question", () => {
    const first = loungeReducer(initialLoungeState, {
      type: "submit",
      question: "问题一",
    });
    const firstResolved = loungeReducer(first, { type: "resolve" });
    const second = loungeReducer(firstResolved, {
      type: "submit",
      question: "问题二",
    });

    expect(first.pulseKey).toBe(1);
    expect(second.pulseKey).toBe(1);
  });
});
