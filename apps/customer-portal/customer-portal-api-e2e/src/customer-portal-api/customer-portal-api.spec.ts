import axios from "axios";

describe("customer-portal-api secure bootstrap", () => {
  it("should return a message", async () => {
    const res = await axios.get(`/api`);

    expect(res.status).toBe(200);
    expect(res.data).toEqual({ message: "Hello API" });
  });

  it("rejects unknown properties", async () => {
    await expect(axios.post(`/api/echo`, { name: "A", age: 20, extra: true })).rejects.toMatchObject({
      response: { status: 400, data: { message: expect.arrayContaining([expect.stringContaining("extra")]) } },
    });
  });

  it("transforms valid payload values and rejects invalid types", async () => {
    const transformed = await axios.post(`/api/echo`, { name: "A", age: "21" });
    expect(transformed.status).toBe(201);
    expect(transformed.data).toEqual({ name: "A", age: 21 });

    await expect(axios.post(`/api/echo`, { name: "A", age: "invalid" })).rejects.toMatchObject({
      response: { status: 400 },
    });
  });

  it("returns security headers", async () => {
    const res = await axios.get(`/api`);
    expect(res.headers["x-dns-prefetch-control"]).toBe("off");
    expect(res.headers["x-frame-options"]).toBe("SAMEORIGIN");
  });

  it("enforces explicit CORS policy", async () => {
    const allowed = await axios.options(`/api`, {
      headers: {
        Origin: "http://localhost:3000",
        "Access-Control-Request-Method": "POST",
      },
    });
    expect(allowed.headers["access-control-allow-origin"]).toBe("http://localhost:3000");

    const blocked = await axios.options(`/api`, {
      headers: {
        Origin: "https://blocked.example",
        "Access-Control-Request-Method": "POST",
      },
      validateStatus: () => true,
    });
    expect(blocked.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
