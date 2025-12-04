import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

import { getMiscCategory, parseApplicationData } from "@/lib/applicationParser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const loadFixture = (name: string) => {
  const fixturePath = path.resolve(__dirname, "fixtures", name);
  return fs.readFileSync(fixturePath, "utf8");
};

describe("parseApplicationData (Phase 3 regression)", () => {
  const fixture = loadFixture("phase3_mock_application.txt");

  it("extracts core academic/testing metrics without relying on AI fallback", async () => {
    const result = await parseApplicationData(fixture, false);

    expect(result.updates).toMatchObject({
      gpa_weighted: "4.23",
      gpa_unweighted: "3.92",
      sat: "1510",
      act: "34",
      class_rank_percentile: "5",
      class_size: "320",
    });

    expect(Number(result.updates.ap_count)).toBeGreaterThanOrEqual(5);
    expect(Number(result.updates.honors_count)).toBeGreaterThanOrEqual(4);

    // Ensure we captured meaningful misc data
    expect(result.misc.length).toBeGreaterThan(8);
  });

  it("deduplicates MISC entries and keeps category grouping logical", async () => {
    const result = await parseApplicationData(fixture, false);

    const decaEntries = result.misc.filter((entry) => /deca/i.test(entry));
    expect(decaEntries.length).toBe(1);

    const meritEntries = result.misc.filter((entry) => /national merit finalist/i.test(entry));
    expect(meritEntries.length).toBe(1);

    // Verify grouped ordering prioritizes testing/academics near the top
    const categories = result.misc.map((entry) => getMiscCategory(entry));
    expect(categories).toContain("testing");
    expect(categories).toContain("academics");
    const firstCategories = result.misc.slice(0, 5).map((entry) => getMiscCategory(entry));
    expect(firstCategories).toContain("testing");

    // Ensure no clearly truncated junk remains
    const obviouslyTruncated = result.misc.filter((entry) => /stu$/i.test(entry.trim()));
    expect(obviouslyTruncated.length).toBe(0);
  });
});

