import { describe, expect, it } from "vitest";
import {
  filterOptionalProcessorNames,
  mergeMandatoryAndOptional,
} from "../../../src/agent-definition/utils/processor-defaults.js";

type FakeOption = { name: string; isMandatory: boolean };

class FakeRegistry {
  private options: FakeOption[];

  constructor(options: FakeOption[]) {
    this.options = options;
  }

  getOrderedProcessorOptions(): FakeOption[] {
    return this.options;
  }
}

describe("processor-defaults", () => {
  it("filters mandatory processor names", () => {
    const registry = new FakeRegistry([
      { name: "A", isMandatory: true },
      { name: "B", isMandatory: true },
      { name: "C", isMandatory: false },
    ]);
    const names = ["A", "C", "B", "D"];

    expect(filterOptionalProcessorNames(names, registry)).toEqual(["C", "D"]);
  });

  it("handles null and empty inputs", () => {
    const registry = new FakeRegistry([{ name: "A", isMandatory: true }]);

    expect(filterOptionalProcessorNames(null, registry)).toEqual([]);
    expect(filterOptionalProcessorNames([], registry)).toEqual([]);
  });

  it("merges mandatory + optional without duplicates", () => {
    const registry = new FakeRegistry([
      { name: "B", isMandatory: true },
      { name: "A", isMandatory: true },
    ]);
    const optional = ["A", "C", "B", "D"];

    expect(mergeMandatoryAndOptional(optional, registry)).toEqual(["B", "A", "C", "D"]);
  });
});
