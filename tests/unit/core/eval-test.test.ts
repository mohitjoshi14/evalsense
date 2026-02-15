import { describe, it, expect, beforeEach } from "vitest";
import { evalTest, test as testAlias, it as itAlias } from "../../../src/core/eval-test.js";
import { evalTestSkip, evalTestOnly } from "../../../src/core/eval-test.js";
import { describe as evalDescribe } from "../../../src/core/describe.js";
import { resetContext, getContext } from "../../../src/core/context.js";

beforeEach(() => {
  resetContext();
});

describe("evalTest", () => {
  it("adds a test to the current suite", () => {
    evalDescribe("suite", () => {
      evalTest("my test", async () => {});
    });
    const ctx = getContext();
    expect(ctx.suites).toHaveLength(1);
    expect(ctx.suites[0].tests).toHaveLength(1);
    expect(ctx.suites[0].tests[0].name).toBe("my test");
  });

  it("throws when called outside describe", () => {
    expect(() => evalTest("orphan", async () => {})).toThrow("inside a describe()");
  });

  it("stores the test function", () => {
    const fn = async () => {};
    evalDescribe("suite", () => {
      evalTest("my test", fn);
    });
    const ctx = getContext();
    expect(ctx.suites[0].tests[0].fn).toBe(fn);
  });

  it("supports multiple tests in one suite", () => {
    evalDescribe("suite", () => {
      evalTest("test1", async () => {});
      evalTest("test2", async () => {});
      evalTest("test3", async () => {});
    });
    const ctx = getContext();
    expect(ctx.suites[0].tests).toHaveLength(3);
  });
});

describe("test alias", () => {
  it("is the same function as evalTest", () => {
    expect(testAlias).toBe(evalTest);
  });
});

describe("it alias", () => {
  it("is the same function as evalTest", () => {
    expect(itAlias).toBe(evalTest);
  });
});

describe("evalTestSkip", () => {
  it("adds a skipped test with [SKIPPED] prefix", () => {
    evalDescribe("suite", () => {
      evalTestSkip("skipped test", async () => {
        throw new Error("should not run");
      });
    });
    const ctx = getContext();
    expect(ctx.suites[0].tests[0].name).toBe("[SKIPPED] skipped test");
  });

  it("the skipped test fn is a no-op", async () => {
    evalDescribe("suite", () => {
      evalTestSkip("skipped", async () => {
        throw new Error("should not run");
      });
    });
    const ctx = getContext();
    // Running the fn should not throw (it's replaced with a no-op)
    await expect(ctx.suites[0].tests[0].fn()).resolves.toBeUndefined();
  });

  it("throws when called outside describe", () => {
    expect(() => evalTestSkip("orphan", async () => {})).toThrow("inside a describe()");
  });
});

describe("evalTestOnly", () => {
  it("adds a test with [ONLY] prefix", () => {
    evalDescribe("suite", () => {
      evalTestOnly("focused test", async () => {});
    });
    const ctx = getContext();
    expect(ctx.suites[0].tests[0].name).toBe("[ONLY] focused test");
  });

  it("preserves the original test function", async () => {
    let ran = false;
    evalDescribe("suite", () => {
      evalTestOnly("focused", async () => {
        ran = true;
      });
    });
    const ctx = getContext();
    await ctx.suites[0].tests[0].fn();
    expect(ran).toBe(true);
  });

  it("throws when called outside describe", () => {
    expect(() => evalTestOnly("orphan", async () => {})).toThrow("inside a describe()");
  });
});

describe("evalTest.skip and evalTest.only", () => {
  it("skip is attached as a property", () => {
    expect(evalTest.skip).toBe(evalTestSkip);
  });

  it("only is attached as a property", () => {
    expect(evalTest.only).toBe(evalTestOnly);
  });
});
