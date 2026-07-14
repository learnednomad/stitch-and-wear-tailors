import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CommerceImage } from "./CommerceImage";

describe("CommerceImage", () => {
  it("renders an accessible tonal fallback when photography is absent", () => {
    render(<CommerceImage alt="Royal Heritage Agbada" sizes="100vw" />);
    expect(screen.getByRole("img", { name: "Royal Heritage Agbada" })).toBeVisible();
    expect(screen.getByText("S&W")).toBeVisible();
  });
});
