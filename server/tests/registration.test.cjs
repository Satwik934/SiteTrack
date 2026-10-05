const { test, after, before, beforeEach, mock } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Company = require("../dist/models/Company").default;
const User = require("../dist/models/User").default;
const tokenUtility = require("../dist/utils/generateToken");
const app = require("../dist/app").default;

// Exercise the HTTP route without loading .env or writing to Atlas.
let server;
let baseUrl;
let savedCompany;
let savedUser;
const session = {};
const validInput = {
  companyName: " Example Construction ",
  companyEmail: " OFFICE@EXAMPLE.COM ",
  firstName: " Alex ",
  lastName: " Builder ",
  email: " ALEX@EXAMPLE.COM ",
  password: "example-password",
};

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
  savedCompany = undefined;
  savedUser = undefined;
  mock.method(User, "exists", async () => null);
  mock.method(mongoose.connection, "transaction", async (callback) => callback(session));
  mock.method(Company.prototype, "save", async function (options) {
    assert.equal(options.session, session);
    savedCompany = this;
    return this;
  });
  mock.method(User.prototype, "save", async function (options) {
    assert.equal(options.session, session);
    savedUser = this;
    return this;
  });
  mock.method(tokenUtility, "default", (id) => {
    assert.equal(id, String(savedUser._id));
    return "test-token";
  });
});

async function register(body) {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

test("registration normalizes fields, creates the owner, and returns only safe fields", async () => {
  const result = await register({ ...validInput, role: "worker", company: new mongoose.Types.ObjectId() });
  assert.equal(result.status, 201);
  assert.equal(result.body.token, "test-token");
  assert.equal(savedCompany.name, "Example Construction");
  assert.equal(savedCompany.email, "office@example.com");
  assert.equal(savedUser.email, "alex@example.com");
  assert.equal(savedUser.role, "owner");
  assert.equal(String(savedUser.company), String(savedCompany._id));
  assert.equal(result.body.user.company, result.body.company._id);
  assert.deepEqual(Object.keys(result.body.user).sort(), [
    "_id", "company", "email", "firstName", "isActive", "lastName", "role",
  ]);
  assert.equal(JSON.stringify(result.body).includes(validInput.password), false);
});

test("invalid input is rejected before database access", async () => {
  for (const input of [null, [], {}, { ...validInput, firstName: " " },
    { ...validInput, email: { $ne: null } }, { ...validInput, companyEmail: "invalid" },
    { ...validInput, password: "short" }, { ...validInput, password: "é".repeat(37) }]) {
    assert.equal((await register(input)).status, 400);
  }
  assert.equal(User.exists.mock.callCount(), 0);
  assert.equal(mongoose.connection.transaction.mock.callCount(), 0);
});

test("existing normalized email returns 409 without creating a company", async () => {
  User.exists.mock.mockImplementation(async (filter) => {
    assert.deepEqual(filter, { email: "alex@example.com" });
    return { _id: new mongoose.Types.ObjectId() };
  });
  assert.equal((await register(validInput)).status, 409);
  assert.equal(savedCompany, undefined);
});

test("duplicate email race returns 409 and propagates failure out of transaction", async () => {
  User.prototype.save.mock.mockImplementation(async () => {
    throw new mongoose.mongo.MongoServerError({ code: 11000, message: "duplicate" });
  });
  assert.equal((await register(validInput)).status, 409);
  assert.equal(tokenUtility.default.mock.callCount(), 0);
});

test("database and token failures return safe errors", async () => {
  tokenUtility.default.mock.mockImplementation(() => { throw new Error("private diagnostic"); });
  const tokenFailure = await register(validInput);
  assert.equal(tokenFailure.status, 500);
  assert.deepEqual(tokenFailure.body, { message: "Unable to register. Please try again later." });
  User.exists.mock.mockImplementation(async () => { throw new Error("private database diagnostic"); });
  assert.deepEqual(await register(validInput), tokenFailure);
});

test("health endpoint remains available", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).status, "ok");
});
