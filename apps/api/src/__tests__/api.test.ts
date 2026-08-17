import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import request from "supertest";

// Mock the auth middleware before importing the app
vi.mock("../middleware/auth.js", () => ({
  verifyJwt: async (req: any, _reply: any) => {
    // If the test sends an invalid token header, mock a failure
    if (req.headers.authorization === "Bearer invalid-token") {
      throw new Error("Invalid token");
    }
    // Otherwise attach a mock payload
    req.jwtPayload = {
      sub: "test-user-id",
      email: "test@example.com",
    };
  }
}));

import { app } from "../index.js";

describe("API Routes", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /health", () => {
    it("should return 200 OK with status", async () => {
      const response = await request(app.server).get("/health");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("status", "ok");
      expect(response.body).toHaveProperty("service", "caw-api");
    });
  });

  describe("GET /me", () => {
    it("should return the mocked user from JWT", async () => {
      const response = await request(app.server)
        .get("/me")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        userId: "test-user-id",
        email: "test@example.com",
      });
    });

    it("should fail if the middleware throws (simulating invalid token)", async () => {
      const response = await request(app.server)
        .get("/me")
        .set("Authorization", "Bearer invalid-token");

      expect(response.status).toBe(500); // Fastify returns 500 for unhandled throws by default unless mapped
    });
  });
});
