const { test, mock } = require("node:test");
const assert = require("node:assert/strict");
const { authorize } = require("../dist/middleware/authorizeMiddleware");

// Direct middleware tests require no database, environment setup, or network.
function invoke(allowedRoles, role, untrustedInput = {}) {
  const user = role === undefined ? undefined : {
    _id: "507f1f77bcf86cd799439011",
    company: "507f1f77bcf86cd799439012",
    role,
  };
  const req = { ...untrustedInput, user };
  const res = {
    statusCode: undefined,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  const next = mock.fn();
  authorize(...allowedRoles)(req, res, next);
  assert.equal(req.user, user);
  return { res, next };
}

function assertAllowed(result) {
  assert.equal(result.next.mock.callCount(), 1);
  assert.deepEqual(result.next.mock.calls[0].arguments, []);
  assert.equal(result.res.statusCode, undefined);
  assert.equal(result.res.body, undefined);
}

function assertDenied(result, status = 403) {
  assert.equal(result.next.mock.callCount(), 0);
  assert.equal(result.res.statusCode, status);
  assert.deepEqual(result.res.body, {
    message: status === 401 ? "Unauthorized." : "Forbidden.",
  });
}

test("owner is allowed on owner-only route", () => {
  assertAllowed(invoke(["owner"], "owner"));
});

test("manager is rejected from owner-only route", () => {
  assertDenied(invoke(["owner"], "manager"));
});

test("worker is rejected from owner-only route", () => {
  assertDenied(invoke(["owner"], "worker"));
});

test("owner is allowed when owner and manager are configured", () => {
  assertAllowed(invoke(["owner", "manager"], "owner"));
});

test("manager is allowed when owner and manager are configured", () => {
  assertAllowed(invoke(["owner", "manager"], "manager"));
});

test("worker is rejected when only owner and manager are configured", () => {
  assertDenied(invoke(["owner", "manager"], "worker"));
});

test("worker is allowed when explicitly permitted", () => {
  assertAllowed(invoke(["worker"], "worker"));
});

test("missing authenticated user returns 401", () => {
  assertDenied(invoke(["owner"], undefined), 401);
});

test("body, headers, query and URL params cannot override the authenticated role", () => {
  for (const input of [
    { body: { role: "owner", user: { role: "owner" } } },
    { headers: { role: "owner", "x-role": "owner" } },
    { query: { role: "owner" } },
    { params: { role: "owner" } },
  ]) {
    assertDenied(invoke(["owner"], "worker", input));
    assertDenied(invoke(["owner"], undefined, input), 401);
  }
});

test("client role cannot prevent authorization of a permitted identity", () => {
  assertAllowed(invoke(["owner"], "owner", {
    body: { role: "worker" }, headers: { role: "worker" },
    query: { role: "worker" }, params: { role: "worker" },
  }));
});

test("empty allowed-role list denies all authenticated roles", () => {
  for (const role of ["owner", "manager", "worker"]) {
    assertDenied(invoke([], role));
  }
});
