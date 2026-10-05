const { test, before, after, beforeEach, mock } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const User = require("../dist/models/User").default;
const tokenUtility = require("../dist/utils/generateToken");
const app = require("../dist/app").default;

// Only local HTTP is used: database queries and token generation are mocked.
let server;
let baseUrl;
let user;
let select;
const validInput = { email: " ALEX@EXAMPLE.COM ", password: " example-password " };
const invalidCredentials = { message: "Invalid email or password." };

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  mock.restoreAll();
  if (server?.listening) await new Promise((resolve) => server.close(resolve));
});

beforeEach(() => {
  mock.restoreAll();
  user = new User({
    company: new mongoose.Types.ObjectId(),
    firstName: "Alex",
    lastName: "Builder",
    email: "alex@example.com",
    password: "stored-hash-placeholder",
    role: "worker",
    isActive: true,
  });
  mock.method(user, "comparePassword", async () => true);
  select = mock.fn(async () => user);
  mock.method(User, "findOne", () => ({ select }));
  mock.method(tokenUtility, "default", () => "test-token");
});

async function login(body) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

test("successful login normalizes email and uses existing password and token utilities", async () => {
  const result = await login(validInput);
  assert.equal(result.status, 200);
  assert.equal(result.body.token, "test-token");
  assert.deepEqual(User.findOne.mock.calls[0].arguments, [{ email: "alex@example.com" }]);
  assert.deepEqual(select.mock.calls[0].arguments, ["+password"]);
  assert.deepEqual(user.comparePassword.mock.calls[0].arguments, [validInput.password]);
  assert.deepEqual(tokenUtility.default.mock.calls[0].arguments, [String(user._id)]);
});

test("incorrect password returns generic 401 without a token", async () => {
  user.comparePassword.mock.mockImplementation(async () => false);
  assert.deepEqual(await login(validInput), { status: 401, body: invalidCredentials });
  assert.equal(tokenUtility.default.mock.callCount(), 0);
});

test("unknown email returns the same generic 401 without a token", async () => {
  select.mock.mockImplementation(async () => null);
  assert.deepEqual(await login(validInput), { status: 401, body: invalidCredentials });
  assert.equal(tokenUtility.default.mock.callCount(), 0);
});

test("missing email returns 400 before database access", async () => {
  assert.equal((await login({ password: validInput.password })).status, 400);
  assert.equal(User.findOne.mock.callCount(), 0);
});

test("missing password returns 400 before database access", async () => {
  assert.equal((await login({ email: validInput.email })).status, 400);
  assert.equal(User.findOne.mock.callCount(), 0);
});

test("invalid bodies, blank values, and non-string credentials return 400", async () => {
  for (const body of [null, [], {}, "invalid", { ...validInput, email: " " },
    { ...validInput, password: " " }, { ...validInput, email: "invalid" },
    { ...validInput, email: { $ne: null } }, { ...validInput, password: 123 },
    { ...validInput, password: [] }]) {
    assert.equal((await login(body)).status, 400);
  }
  assert.equal(User.findOne.mock.callCount(), 0);
});

test("inactive users cannot log in or obtain a token", async () => {
  user.isActive = false;
  assert.deepEqual(await login(validInput), { status: 401, body: invalidCredentials });
  assert.equal(tokenUtility.default.mock.callCount(), 0);
});

test("response excludes passwords and preserves stored role and company", async () => {
  const originalCompany = String(user.company);
  const result = await login({ ...validInput, role: "owner", company: new mongoose.Types.ObjectId(), isActive: false });
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.user, {
    _id: String(user._id), company: originalCompany, firstName: "Alex",
    lastName: "Builder", email: "alex@example.com", role: "worker", isActive: true,
  });
  assert.equal(user.role, "worker");
  assert.equal(String(user.company), originalCompany);
  assert.equal(JSON.stringify(result.body).includes(user.password), false);
  assert.equal(JSON.stringify(result.body).includes(validInput.password), false);
});

test("database failures return a safe 500 response", async () => {
  select.mock.mockImplementation(async () => { throw new Error("private database details"); });
  assert.deepEqual(await login(validInput), {
    status: 500, body: { message: "Unable to log in. Please try again later." },
  });
  assert.equal(tokenUtility.default.mock.callCount(), 0);
});

test("password comparison failures return a safe 500 response", async () => {
  user.comparePassword.mock.mockImplementation(async () => { throw new Error("private comparison details"); });
  assert.equal((await login(validInput)).status, 500);
  assert.equal(tokenUtility.default.mock.callCount(), 0);
});

test("token failures return a safe 500 response without user information", async () => {
  tokenUtility.default.mock.mockImplementation(() => { throw new Error("private token details"); });
  assert.deepEqual(await login(validInput), {
    status: 500, body: { message: "Unable to log in. Please try again later." },
  });
});
