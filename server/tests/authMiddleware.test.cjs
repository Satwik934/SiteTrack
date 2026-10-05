const { test, beforeEach, afterEach, mock } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const User = require("../dist/models/User").default;
const { authenticate } = require("../dist/middleware/authMiddleware");

// Isolated middleware tests: no dotenv, database connection, or network listener.
const originalEnvironment = process.env;
const userId = "507f1f77bcf86cd799439011";
const companyId = "507f1f77bcf86cd799439012";
let select;
let user;

beforeEach(() => {
  process.env = { JWT_SECRET: "unused-test-placeholder" };
  user = { _id: userId, company: companyId, role: "worker", isActive: true, password: "excluded-placeholder" };
  select = mock.fn(async () => user);
  mock.method(User, "findById", () => ({ select }));
  mock.method(jwt, "verify", () => ({ userId }));
});

afterEach(() => {
  mock.restoreAll();
  process.env = originalEnvironment;
});

async function invoke(header = "Bearer test-placeholder") {
  const req = { get: () => header };
  const res = {
    statusCode: undefined,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  const next = mock.fn();
  await authenticate(req, res, next);
  return { req, res, next };
}

function assertRejected(result, status = 401) {
  assert.equal(result.res.statusCode, status);
  assert.deepEqual(result.res.body, {
    message: status === 401 ? "Unauthorized." : "Unable to authenticate. Please try again later.",
  });
  assert.equal(result.req.user, undefined);
  assert.equal(result.next.mock.callCount(), 0);
}

test("valid Bearer token attaches only database identity and calls next once", async () => {
  const result = await invoke();
  assert.deepEqual(result.req.user, { _id: userId, company: companyId, role: "worker" });
  assert.equal(result.res.statusCode, undefined);
  assert.equal(result.next.mock.callCount(), 1);
  assert.deepEqual(result.next.mock.calls[0].arguments, []);
  assert.deepEqual(User.findById.mock.calls[0].arguments, [userId]);
  assert.deepEqual(select.mock.calls[0].arguments, ["_id company role isActive"]);
  const args = jwt.verify.mock.calls[0].arguments;
  assert.equal(args[0], "test-placeholder");
  assert.equal(args[1] === process.env.JWT_SECRET, true);
  assert.deepEqual(args[2], { algorithms: ["HS256"] });
});

test("missing Authorization header is rejected before JWT or database access", async () => {
  assertRejected(await invoke(null));
  assert.equal(jwt.verify.mock.callCount(), 0);
  assert.equal(User.findById.mock.callCount(), 0);
});

test("malformed Authorization headers are rejected", async () => {
  for (const header of ["", "Basic placeholder", "Bearer", "Bearer ", "Bearer  placeholder",
    "Bearer placeholder extra", "Bearer\tplaceholder", "Bearer one,Bearer two"]) {
    assertRejected(await invoke(header));
  }
  assert.equal(jwt.verify.mock.callCount(), 0);
  assert.equal(User.findById.mock.callCount(), 0);
});

test("Bearer scheme is case insensitive", async () => {
  assert.equal((await invoke("bearer test-placeholder")).next.mock.callCount(), 1);
});

test("invalid token returns generic 401", async () => {
  jwt.verify.mock.mockImplementation(() => { throw new jwt.JsonWebTokenError("private verification details"); });
  assertRejected(await invoke());
  assert.equal(User.findById.mock.callCount(), 0);
});

test("expired token returns generic 401", async () => {
  jwt.verify.mock.mockImplementation(() => { throw new jwt.TokenExpiredError("expired", new Date(0)); });
  assertRejected(await invoke());
  assert.equal(User.findById.mock.callCount(), 0);
});

test("not-yet-valid token returns generic 401", async () => {
  jwt.verify.mock.mockImplementation(() => { throw new jwt.NotBeforeError("not active", new Date()); });
  assertRejected(await invoke());
  assert.equal(User.findById.mock.callCount(), 0);
});

test("malformed payloads and user IDs are rejected before database access", async () => {
  for (const payload of ["text", null, {}, { userId: 123 }, { userId: { $ne: null } }, { userId: "bad-id" }]) {
    jwt.verify.mock.mockImplementation(() => payload);
    assertRejected(await invoke());
  }
  assert.equal(User.findById.mock.callCount(), 0);
});

test("deleted user returns generic 401", async () => {
  select.mock.mockImplementation(async () => null);
  assertRejected(await invoke());
});

test("inactive user returns generic 401", async () => {
  user.isActive = false;
  assertRejected(await invoke());
});

test("company and role come from current database record, not JWT claims", async () => {
  jwt.verify.mock.mockImplementation(() => ({ userId, role: "owner", company: "untrusted-company" }));
  const result = await invoke();
  assert.deepEqual(result.req.user, { _id: userId, company: companyId, role: "worker" });
  assert.equal(result.next.mock.callCount(), 1);
});

test("missing configuration fails safely without verification or database access", async () => {
  process.env = {};
  assertRejected(await invoke(), 500);
  assert.equal(jwt.verify.mock.callCount(), 0);
  assert.equal(User.findById.mock.callCount(), 0);
});

test("database failure returns safe 500 and does not call next", async () => {
  select.mock.mockImplementation(async () => { throw new Error("private database details"); });
  assertRejected(await invoke(), 500);
});
