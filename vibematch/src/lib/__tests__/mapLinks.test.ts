import { describe, it, expect } from "vitest";
import { placeUrl, nearbySearchUrl, routeUrl } from "../mapLinks";

const spot = { name: "Blue Bottle Coffee", lat: 40.7128, lng: -74.006 };
const user = { lat: 40.7, lng: -74.0 };

describe("placeUrl", () => {
  it("pins coordinates per platform", () => {
    expect(placeUrl(spot, "ios")).toBe(
      "https://maps.apple.com/?ll=40.7128,-74.006&q=Blue%20Bottle%20Coffee"
    );
    expect(placeUrl(spot, "android")).toBe(
      "geo:40.7128,-74.006?q=40.7128,-74.006(Blue%20Bottle%20Coffee)"
    );
    expect(placeUrl(spot, "web")).toBe(
      "https://www.google.com/maps/search/?api=1&query=40.7128%2C-74.006"
    );
  });

  it("falls back to a name search only when coords are missing", () => {
    expect(placeUrl({ name: "Central Park" }, "web")).toBe(
      "https://www.google.com/maps/search/?api=1&query=Central%20Park"
    );
    expect(placeUrl({ name: "Central Park" }, "ios")).toBe(
      "https://maps.apple.com/?q=Central%20Park"
    );
    expect(placeUrl({ name: "Central Park" }, "android")).toBe("geo:0,0?q=Central%20Park");
  });

  it("encodes special characters in names", () => {
    expect(placeUrl({ name: "Café & Bar", lat: 1, lng: 2 }, "ios")).toContain(
      "q=Caf%C3%A9%20%26%20Bar"
    );
  });
});

describe("nearbySearchUrl", () => {
  it("anchors the search at the user location", () => {
    expect(nearbySearchUrl("sushi restaurant", user, "ios")).toBe(
      "https://maps.apple.com/?q=sushi%20restaurant&sll=40.7,-74&z=14"
    );
    expect(nearbySearchUrl("sushi restaurant", user, "android")).toBe(
      "geo:40.7,-74?q=sushi%20restaurant"
    );
    expect(nearbySearchUrl("sushi restaurant", user, "web")).toBe(
      "https://www.google.com/maps/search/sushi%20restaurant/@40.7,-74,14z"
    );
  });

  it("degrades to a plain search without geo", () => {
    expect(nearbySearchUrl("sushi", null, "web")).toBe(
      "https://www.google.com/maps/search/?api=1&query=sushi"
    );
  });
});

describe("routeUrl", () => {
  it("builds directions per platform", () => {
    const to = { lat: 40.72, lng: -74.01 };
    expect(routeUrl(user, to, "ios")).toBe(
      "https://maps.apple.com/?saddr=40.7,-74&daddr=40.72,-74.01"
    );
    expect(routeUrl(user, to, "android")).toBe("google.navigation:q=40.72,-74.01");
    expect(routeUrl(user, to, "web")).toBe(
      "https://www.google.com/maps/dir/?api=1&origin=40.7%2C-74&destination=40.72%2C-74.01"
    );
  });
});
