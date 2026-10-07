const { test, before, after, beforeEach, afterEach, mock } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const User = require("../dist/models/User").default;
const Company = require("../dist/models/Company").default;
const app = require("../dist/app").default;

const companyA = "507f1f77bcf86cd799439011";
const companyB = "507f1f77bcf86cd799439012";
const actorId = "507f1f77bcf86cd799439013";
const workerId = "507f1f77bcf86cd799439014";
const managerId = "507f1f77bcf86cd799439015";
const otherId = "507f1f77bcf86cd799439016";
const otherOwnerId = "507f1f77bcf86cd799439017";
const originalEnvironment = process.env;
let server, baseUrl, actor, records, inserted;
const input = { firstName: " Sam ", lastName: " Builder ", email: " SAM@EXAMPLE.COM ", password: "example-password", role: "worker" };

function employee(id, role, company = companyA) {
  return new User({ _id: id, company, firstName: "Alex", lastName: "Builder", email: `${id}@example.com`,
    role, isActive: true, password: "excluded-value", createdAt: new Date(0), updatedAt: new Date(0) });
}

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { if (server?.listening) await new Promise(resolve => server.close(resolve)); });
beforeEach(() => {
  process.env = { JWT_SECRET: "unused-test-placeholder" };
  actor = employee(actorId, "owner");
  records = [actor, employee(workerId, "worker"), employee(managerId, "manager"), employee(otherId, "worker", companyB), employee(otherOwnerId, "owner")];
  inserted = undefined;
  mock.method(jwt, "verify", () => ({ userId: actorId }));
  mock.method(User, "findById", () => ({ select: async () => actor }));
  mock.method(User, "find", filter => ({ select: () => ({ sort: async order => {
    assert.deepEqual(filter, { company: companyA });
    assert.deepEqual(order, { firstName: 1, lastName: 1, _id: 1 });
    return records.filter(record => String(record.company) === filter.company);
  } }) }));
  mock.method(User, "exists", async () => null);
  // Keep actual Mongoose validation and bcrypt pre-save behavior; mock only persistence.
  mock.method(User.collection, "insertOne", async doc => { inserted = doc; return { acknowledged: true, insertedId: doc._id }; });
  mock.method(User, "findOne", filter => ({ select: async () => {
    assert.deepEqual(filter, { _id: filter._id, company: companyA });
    return records.find(record => String(record._id) === filter._id && String(record.company) === filter.company) ?? null;
  } }));
  mock.method(User, "findOneAndUpdate", (filter, update, options) => ({ select: async () => {
    assert.equal(filter.company, companyA);
    assert.deepEqual(options, { new: true, runValidators: true });
    const record = records.find(record => String(record._id) === filter._id && String(record.company) === filter.company && record.role === filter.role);
    if (!record) return null;
    Object.assign(record, update.$set);
    return record;
  } }));
  mock.method(Company, "findById", id => ({ select: async () => {
    assert.equal(id, companyA);
    return new Company({ _id: companyA, name: "Example Construction", email: "office@example.com", phone: "555-0100", address: { city: "Toronto" } });
  } }));
});
afterEach(() => { mock.restoreAll(); process.env = originalEnvironment; });

async function request(method, path, body, authenticated = true) {
  const response = await fetch(`${baseUrl}/api${path}`, { method,
    headers: { "Content-Type": "application/json", ...(authenticated ? { Authorization: "Bearer test-placeholder" } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}
function assertSafe(value) {
  assert.equal(JSON.stringify(value).includes("password"), false);
  assert.equal(JSON.stringify(value).includes("excluded-value"), false);
  assert.equal(JSON.stringify(value).includes("__v"), false);
}

for (const [method, path, body] of [["GET", "/employees"], ["POST", "/employees", input], ["PATCH", `/employees/${workerId}`, { firstName: "New" }], ["GET", "/company"]]) {
  test(`${method} ${path}: unauthenticated is rejected`, async () => {
    assert.equal((await request(method, path, body, false)).status, 401);
  });
}
for (const [method, path, body] of [["GET", "/employees"], ["POST", "/employees", input], ["PATCH", `/employees/${workerId}`, { firstName: "New" }]]) {
  test(`${method}: worker cannot administer employees`, async () => {
    actor.role = "worker";
    assert.equal((await request(method, path, body)).status, 403);
    assert.equal(User.find.mock.callCount(), 0);
    assert.equal(User.collection.insertOne.mock.callCount(), 0);
    assert.equal(User.findOneAndUpdate.mock.callCount(), 0);
  });
}
for (const role of ["owner", "manager"]) {
  test(`${role}: list uses authenticated company and safe fields`, async () => {
    actor.role = role;
    const result = await request("GET", `/employees?company=${companyB}`);
    assert.equal(result.status, 200);
    assert.equal(result.body.employees.length, 4);
    assert.equal(result.body.employees.some(user => user._id === otherId), false);
    assertSafe(result.body);
    assert.deepEqual(Object.keys(result.body.employees[0]).sort(), ["_id", "createdAt", "email", "firstName", "isActive", "lastName", "role", "updatedAt"]);
  });
}
test("empty company employee list returns an empty array", async () => {
  records = [];
  assert.deepEqual((await request("GET", "/employees")).body, { employees: [] });
});
for (const [creator, role] of [["owner", "worker"], ["owner", "manager"], ["manager", "worker"]]) {
  test(`${creator} creates ${role} with trusted company and existing bcrypt hook`, async () => {
    actor.role = creator;
    const result = await request("POST", `/employees?company=${companyB}`, { ...input, role });
    assert.equal(result.status, 201);
    assert.equal(String(inserted.company), companyA);
    assert.equal(inserted.firstName, "Sam");
    assert.equal(inserted.email, "sam@example.com");
    assert.notEqual(inserted.password, input.password);
    assert.equal(await new User(inserted).comparePassword(input.password), true);
    assert.equal(result.body.employee.role, role);
    assertSafe(result.body);
  });
}
test("manager cannot create a manager", async () => {
  actor.role = "manager";
  assert.equal((await request("POST", "/employees", { ...input, role: "manager" })).status, 403);
  assert.equal(User.collection.insertOne.mock.callCount(), 0);
});
for (const role of ["owner", "manager"]) {
  test(`${role} cannot create an owner`, async () => {
    actor.role = role;
    assert.equal((await request("POST", "/employees", { ...input, role: "owner" })).status, 400);
    assert.equal(User.collection.insertOne.mock.callCount(), 0);
  });
}
for (const [label, body] of [
  ["invalid role", { ...input, role: "admin" }], ["invalid email", { ...input, email: "bad" }],
  ["email object", { ...input, email: { $ne: null } }], ["blank name", { ...input, firstName: " " }],
  ["short password", { ...input, password: "short" }], ["overlong password", { ...input, password: "é".repeat(37) }],
  ["body company injection", { ...input, company: companyB }], ["extra field", { ...input, isActive: false }],
  ["missing name", { ...input, lastName: undefined }], ["array body", []],
]) {
  test(`create rejects ${label}`, async () => {
    assert.equal((await request("POST", "/employees", body)).status, 400);
    assert.equal(User.collection.insertOne.mock.callCount(), 0);
  });
}
test("duplicate email precheck returns safe conflict", async () => {
  User.exists.mock.mockImplementation(async filter => { assert.deepEqual(filter, { email: "sam@example.com" }); return { _id: otherId }; });
  const result = await request("POST", "/employees", input);
  assert.equal(result.status, 409);
  assert.deepEqual(result.body, { message: "A user with this email already exists." });
});
test("duplicate email race returns safe conflict", async () => {
  User.collection.insertOne.mock.mockImplementation(async () => { throw new mongoose.mongo.MongoServerError({ code: 11000, message: "private diagnostic" }); });
  assert.equal((await request("POST", "/employees", input)).status, 409);
});
test("owner can edit worker names, role and active state", async () => {
  const result = await request("PATCH", `/employees/${workerId}`, { firstName: " Sam ", lastName: " New ", role: "manager", isActive: false });
  assert.equal(result.status, 200);
  assert.equal(result.body.employee.firstName, "Sam");
  assert.equal(result.body.employee.role, "manager");
  assert.equal(result.body.employee.isActive, false);
  assertSafe(result.body);
});
test("owner can demote manager to worker", async () => {
  assert.equal((await request("PATCH", `/employees/${managerId}`, { role: "worker" })).status, 200);
});
test("manager can edit, deactivate and reactivate a worker", async () => {
  actor.role = "manager";
  assert.equal((await request("PATCH", `/employees/${workerId}`, { firstName: "Sam", isActive: false })).status, 200);
  const result = await request("PATCH", `/employees/${workerId}`, { isActive: true });
  assert.equal(result.status, 200);
  assert.equal(result.body.employee.isActive, true);
  assertSafe(result.body);
});
for (const id of [actorId, managerId]) {
  test(`manager cannot edit privileged account ${id}`, async () => {
    actor.role = "manager";
    const result = await request("PATCH", `/employees/${id}`, { firstName: "Changed" });
    assert.equal(result.status, 403);
    assert.equal(User.findOneAndUpdate.mock.callCount(), 0);
  });
}
for (const role of ["worker", "manager", "owner"]) {
  test(`manager cannot set worker role to ${role}`, async () => {
    actor.role = "manager";
    assert.equal((await request("PATCH", `/employees/${workerId}`, { role })).status, role === "owner" ? 400 : 403);
    assert.equal(User.findOneAndUpdate.mock.callCount(), 0);
  });
}
test("manager cannot modify another owner", async () => {
  actor.role = "manager";
  assert.equal((await request("PATCH", `/employees/${otherOwnerId}`, { isActive: false })).status, 403);
});
for (const role of ["owner", "manager"]) {
  test(`${role}: cross-company employee is indistinguishable from missing employee`, async () => {
    actor.role = role;
    const cross = await request("PATCH", `/employees/${otherId}`, { firstName: "Changed" });
    const missing = await request("PATCH", "/employees/507f1f77bcf86cd799439099", { firstName: "Changed" });
    assert.equal(cross.status, 404);
    assert.deepEqual(cross, missing);
    assert.equal(User.findOneAndUpdate.mock.callCount(), 0);
  });
}
for (const id of [actorId, otherOwnerId]) {
  for (const change of [{ isActive: false }, { role: "worker" }]) {
    test(`owner account ${id} is protected from ${Object.keys(change)[0]} changes`, async () => {
      assert.equal((await request("PATCH", `/employees/${id}`, change)).status, 403);
      assert.equal(User.findOneAndUpdate.mock.callCount(), 0);
    });
  }
}
test("owner may update their own name", async () => {
  assert.equal((await request("PATCH", `/employees/${actorId}`, { firstName: "New" })).status, 200);
});
for (const [label, body] of [
  ["password", { password: "replacement" }], ["company", { company: companyB }], ["email", { email: "new@example.com" }],
  ["operator", { $set: { role: "owner" } }], ["unknown field", { foo: "bar" }], ["blank name", { firstName: " " }],
  ["invalid active value", { isActive: "false" }], ["empty object", {}], ["array", []],
]) {
  test(`update rejects ${label}`, async () => {
    assert.equal((await request("PATCH", `/employees/${workerId}`, body)).status, 400);
    assert.equal(User.findOneAndUpdate.mock.callCount(), 0);
  });
}
test("invalid employee ID returns 400", async () => {
  assert.equal((await request("PATCH", "/employees/not-an-id", { firstName: "New" })).status, 400);
});
test("concurrent promotion makes manager update fail closed", async () => {
  actor.role = "manager";
  User.findOneAndUpdate.mock.mockImplementation((filter) => ({ select: async () => {
    assert.deepEqual(filter, { _id: workerId, company: companyA, role: "worker" });
    return null;
  } }));
  assert.equal((await request("PATCH", `/employees/${workerId}`, { isActive: false })).status, 409);
});
for (const role of ["owner", "manager", "worker"]) {
  test(`${role}: company information uses only authenticated company`, async () => {
    actor.role = role;
    const result = await request("GET", `/company?company=${companyB}`);
    assert.equal(result.status, 200);
    assert.equal(result.body.company._id, companyA);
    assert.equal(result.body.company.address.city, "Toronto");
    assertSafe(result.body);
  });
}
test("missing company returns 404", async () => {
  Company.findById.mock.mockImplementation(() => ({ select: async () => null }));
  assert.equal((await request("GET", "/company")).status, 404);
});
test("company database error is safe", async () => {
  Company.findById.mock.mockImplementation(() => { throw new Error("private diagnostic"); });
  const result = await request("GET", "/company");
  assert.equal(result.status, 500);
  assert.equal(JSON.stringify(result.body).includes("private diagnostic"), false);
});
test("employee database error is safe", async () => {
  User.find.mock.mockImplementation(() => { throw new Error("private diagnostic"); });
  const result = await request("GET", "/employees");
  assert.equal(result.status, 500);
  assert.equal(JSON.stringify(result.body).includes("private diagnostic"), false);
});
test("inactive caller is rejected by existing authentication", async () => {
  actor.isActive = false;
  assert.equal((await request("GET", "/employees")).status, 401);
  assert.equal(User.find.mock.callCount(), 0);
});
