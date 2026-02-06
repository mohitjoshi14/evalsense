import { describe as vitestDescribe, it, expect, beforeEach } from "vitest";
import {
  describe,
  beforeAll,
  afterAll,
  beforeEach as evalBeforeEach,
  afterEach,
} from "../../../src/core/describe.js";
import { evalTest } from "../../../src/core/eval-test.js";
import { resetContext, getSuites } from "../../../src/core/context.js";

beforeEach(() => {
  resetContext();
});

vitestDescribe("describe", () => {
  it("creates a suite with the given name", () => {
    describe("My Suite", () => {
      // Empty suite
    });

    const suites = getSuites();
    expect(suites).toHaveLength(1);
    expect(suites[0]?.name).toBe("My Suite");
  });

  it("collects evalTest calls within the suite", () => {
    describe("Test Suite", () => {
      evalTest("test 1", () => {});
      evalTest("test 2", () => {});
    });

    const suites = getSuites();
    expect(suites[0]?.tests).toHaveLength(2);
    expect(suites[0]?.tests[0]?.name).toBe("test 1");
    expect(suites[0]?.tests[1]?.name).toBe("test 2");
  });

  it("supports multiple suites", () => {
    describe("Suite A", () => {
      evalTest("test A", () => {});
    });

    describe("Suite B", () => {
      evalTest("test B", () => {});
    });

    const suites = getSuites();
    expect(suites).toHaveLength(2);
  });

  it("supports nested describes (registers as separate suites)", () => {
    describe("Outer", () => {
      evalTest("outer test", () => {});

      describe("Inner", () => {
        evalTest("inner test", () => {});
      });
    });

    const suites = getSuites();
    // Both outer and inner are registered as separate suites
    expect(suites).toHaveLength(2);
  });
});

vitestDescribe("lifecycle hooks", () => {
  it("registers beforeAll hook", () => {
    const fn = () => {};
    describe("Suite", () => {
      beforeAll(fn);
    });

    const suites = getSuites();
    expect(suites[0]?.beforeAll).toHaveLength(1);
  });

  it("registers afterAll hook", () => {
    const fn = () => {};
    describe("Suite", () => {
      afterAll(fn);
    });

    const suites = getSuites();
    expect(suites[0]?.afterAll).toHaveLength(1);
  });

  it("registers beforeEach hook", () => {
    const fn = () => {};
    describe("Suite", () => {
      evalBeforeEach(fn);
    });

    const suites = getSuites();
    expect(suites[0]?.beforeEach).toHaveLength(1);
  });

  it("registers afterEach hook", () => {
    const fn = () => {};
    describe("Suite", () => {
      afterEach(fn);
    });

    const suites = getSuites();
    expect(suites[0]?.afterEach).toHaveLength(1);
  });

  it("throws if beforeAll called outside describe", () => {
    expect(() => beforeAll(() => {})).toThrow("inside a describe()");
  });

  it("throws if afterAll called outside describe", () => {
    expect(() => afterAll(() => {})).toThrow("inside a describe()");
  });
});
