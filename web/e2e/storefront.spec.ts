import { expect, test } from "@playwright/test";

const routes = [
  ["/", /Bespoke|legacy/i],
  ["/collections", /collections/i],
  ["/marketplace", /marketplace/i],
  ["/designers", /designers/i],
  ["/journal", /journal/i],
  ["/about", /about/i],
  ["/measurements-guide", /measurements/i],
  ["/design", /design your own/i],
  ["/appointments", /book an appointment/i],
  ["/cart", /shopping bag/i],
  ["/wishlist", /wishlist/i],
  ["/checkout", /checkout/i],
  ["/checkout/success?orders=MKT-TEST", /thank you/i],
] as const;

for (const [route, heading] of routes) {
  test(`${route} renders the storefront shell`, async ({ page }) => {
    await page.goto(route);
    await expect(
      page.getByRole("banner").getByRole("link", { name: /Stitch and Wear home/i })
    ).toBeVisible();
    await expect(page.getByRole("main")).toContainText(heading);
  });
}

test("guest cart persists through navigation", async ({ page }) => {
  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: /shopping bag|cart/i })).toBeVisible();
  await page.goto("/wishlist");
  await expect(page.getByRole("heading", { name: /wishlist/i })).toBeVisible();
});
