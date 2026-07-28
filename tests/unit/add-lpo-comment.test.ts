import { describe, expect, it } from "vitest";

import { addLpoCommentSchema } from "@/modules/lpo/schemas/add-lpo-comment";

describe("addLpoCommentSchema", () => {
  it("accepts a trimmed non-empty comment", () => {
    expect(addLpoCommentSchema.parse({ body: "  Looks good  " })).toEqual({
      body: "Looks good",
    });
  });

  it("rejects empty comments", () => {
    expect(() => addLpoCommentSchema.parse({ body: "   " })).toThrow();
  });
});
