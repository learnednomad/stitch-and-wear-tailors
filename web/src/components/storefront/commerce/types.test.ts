import { describe, expect, it } from "vitest";
import { cartLineKey } from "./types";

describe("cartLineKey", () => {
  it("keeps product variants as independent cart lines", () => {
    expect(
      cartLineKey({
        productId: "agbada",
        variantId: "navy-xl",
        size: "XL",
        color: "Navy",
      })
    ).toBe("agbada:navy-xl:XL:Navy");
  });

  it("uses a stable product-only key when no option is selected", () => {
    expect(cartLineKey({ productId: "cap" })).toBe("cap");
  });
});
