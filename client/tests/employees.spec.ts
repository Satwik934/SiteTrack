import { test, expect, type Page } from '@playwright/test'

const owner = { _id: 'owner-id', firstName: 'Alex', lastName: 'Owner', email: 'alex@example.com', role: 'owner', isActive: true }
const manager = { _id: 'manager-id', firstName: 'Morgan', lastName: 'Manager', email: 'morgan@example.com', role: 'manager', isActive: true }
const worker = { _id: 'worker-id', firstName: 'Sam', lastName: 'Worker', email: 'sam@example.com', role: 'worker', isActive: true }

async function setup(page: Page, role = 'owner') {
  let employees = [{ ...owner }, { ...manager }, { ...worker }]
  const current = role === 'manager' ? manager : role === 'worker' ? worker : owner
  // Catch all API requests before specific handlers; no request reaches Atlas.
  await page.route('**/api/**', route => route.fulfill({ json: { status: 'ok' } }))
  await page.route('**/api/auth/login', route => route.fulfill({ json: { token: 'test-placeholder', user: { ...current, company: 'company-id' } } }))
  await page.route('**/api/company', route => {
    expect(Boolean(route.request().headers().authorization)).toBe(true)
    return route.fulfill({ json: { company: { _id: 'company-id', name: 'Example Construction', email: 'office@example.com', address: { city: 'Toronto' } } } })
  })
  await page.route('**/api/employees**', async route => {
    expect(Boolean(route.request().headers().authorization)).toBe(true)
    if (route.request().method() === 'POST') {
      const { firstName, lastName, email, role: employeeRole } = route.request().postDataJSON()
      const employee = { _id: 'new-id', firstName, lastName, email, role: employeeRole, isActive: true }
      employees.push(employee)
      await route.fulfill({ status: 201, json: { employee } })
    } else if (route.request().method() === 'PATCH') {
      const id = route.request().url().split('/').at(-1)
      employees = employees.map(employee => employee._id === id ? { ...employee, ...route.request().postDataJSON() } : employee)
      await route.fulfill({ json: { employee: employees.find(employee => employee._id === id) } })
    } else await route.fulfill({ json: { employees } })
  })
  await page.goto('/login')
  await page.getByLabel('Email address', { exact: true }).fill(current.email)
  await page.getByLabel('Password', { exact: true }).fill('example-password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL('/dashboard')
}
async function openEmployees(page: Page) {
  await page.getByRole('link', { name: 'Employees' }).click()
  await expect(page.getByRole('heading', { name: 'Employees', exact: true })).toBeVisible()
}
async function fillNew(page: Page) {
  await page.getByRole('button', { name: 'Add employee' }).click()
  await page.getByLabel('First name', { exact: true }).fill('Pat')
  await page.getByLabel('Last name', { exact: true }).fill('Builder')
  await page.getByLabel('Employee email').fill('PAT@example.com')
  await page.getByLabel('Initial password', { exact: true }).fill('example-password')
}

test('owner directory renders employees and preserves responsive layout', async ({ page }, testInfo) => {
  await setup(page)
  await openEmployees(page)
  await expect(page.getByRole('cell', { name: 'sam@example.com' })).toBeVisible()
  await expect(page.getByRole('row')).toHaveCount(4)
  await page.screenshot({ path: testInfo.outputPath('employees-desktop.png'), fullPage: true })
  await page.getByLabel('Find an employee').fill('sam')
  await expect(page.getByRole('row')).toHaveCount(2)
  await page.setViewportSize({ width: 375, height: 812 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('employees-mobile.png'), fullPage: true })
})

test('owner creates a manager using the exact contract and list updates', async ({ page }) => {
  await setup(page)
  await openEmployees(page)
  await fillNew(page)
  await page.getByLabel('Role', { exact: true }).selectOption('manager')
  const sent = page.waitForRequest(request => request.url().endsWith('/api/employees') && request.method() === 'POST')
  await page.getByRole('button', { name: 'Create employee', exact: true }).click()
  expect((await sent).postDataJSON()).toEqual({ firstName: 'Pat', lastName: 'Builder', email: 'pat@example.com', password: 'example-password', role: 'manager' })
  await expect(page.getByText('Employee added successfully.')).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: 'pat@example.com' })).toContainText('manager')
  await expect(page.getByLabel('Initial password', { exact: true })).toHaveCount(0)
})

test('manager can create only workers and cannot modify privileged rows', async ({ page }) => {
  await setup(page, 'manager')
  await openEmployees(page)
  await expect(page.getByRole('button', { name: 'Edit Alex Owner' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Edit Morgan Manager' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Edit Sam Worker' })).toBeVisible()
  await fillNew(page)
  await expect(page.getByRole('combobox')).toHaveCount(0)
  const sent = page.waitForRequest(request => request.method() === 'POST' && request.url().endsWith('/api/employees'))
  await page.getByRole('button', { name: 'Create employee', exact: true }).click()
  expect((await sent).postDataJSON().role).toBe('worker')
  await expect(page.getByText('Employee added successfully.')).toBeVisible()
})

test('owner self role and active status controls are unavailable', async ({ page }) => {
  await setup(page)
  await openEmployees(page)
  const self = page.getByRole('row').filter({ hasText: 'alex@example.com' })
  await expect(self.getByRole('button', { name: /Deactivate|Reactivate/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Edit Alex Owner' }).click()
  await expect(page.getByRole('combobox')).toHaveCount(0)
  await page.getByLabel('First name', { exact: true }).fill('Alexandra')
  const sent = page.waitForRequest(request => request.method() === 'PATCH')
  await page.getByRole('button', { name: 'Save changes' }).click()
  expect((await sent).postDataJSON()).toEqual({ firstName: 'Alexandra', lastName: 'Owner' })
  await expect(page.getByRole('complementary').getByText('Alexandra Owner', { exact: true })).toBeVisible()
})

test('owner can update names and promote a worker to manager', async ({ page }) => {
  await setup(page)
  await openEmployees(page)
  await page.getByRole('button', { name: 'Edit Sam Worker' }).click()
  await page.getByLabel('First name', { exact: true }).fill('Samuel')
  await page.getByLabel('Role', { exact: true }).selectOption('manager')
  const sent = page.waitForRequest(request => request.method() === 'PATCH')
  await page.getByRole('button', { name: 'Save changes' }).click()
  expect((await sent).postDataJSON()).toEqual({ firstName: 'Samuel', lastName: 'Worker', role: 'manager' })
  await expect(page.getByRole('row').filter({ hasText: 'sam@example.com' })).toContainText('manager')
})

test('manager worker edits omit privileged fields', async ({ page }) => {
  await setup(page, 'manager')
  await openEmployees(page)
  await page.getByRole('button', { name: 'Edit Sam Worker' }).click()
  await expect(page.getByRole('combobox')).toHaveCount(0)
  await page.getByLabel('Last name', { exact: true }).fill('Carpenter')
  const sent = page.waitForRequest(request => request.method() === 'PATCH')
  await page.getByRole('button', { name: 'Save changes' }).click()
  expect((await sent).postDataJSON()).toEqual({ firstName: 'Sam', lastName: 'Carpenter' })
  await expect(page.getByText('Employee updated successfully.')).toBeVisible()
})

test('deactivation requires confirmation and reactivation restores active state', async ({ page }) => {
  await setup(page)
  await openEmployees(page)
  await page.getByRole('button', { name: 'Deactivate Sam Worker' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.getByRole('row').filter({ hasText: 'sam@example.com' }).getByText('Active', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Deactivate Sam Worker' }).click()
  await page.getByRole('button', { name: 'Confirm deactivation' }).click()
  await expect(page.getByRole('row').filter({ hasText: 'sam@example.com' }).getByText('Inactive', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Reactivate Sam Worker' }).click()
  await page.getByRole('button', { name: 'Confirm reactivation' }).click()
  await expect(page.getByRole('row').filter({ hasText: 'sam@example.com' }).getByText('Active', { exact: true })).toBeVisible()
})

test('worker has company access but cannot open employee administration', async ({ page }) => {
  await setup(page, 'worker')
  await expect(page.getByRole('link', { name: 'Employees' })).toHaveCount(0)
  await page.getByRole('link', { name: 'Company', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Example Construction' })).toBeVisible()
  await expect(page.getByText('Toronto', { exact: true })).toBeVisible()
  await page.evaluate(() => { history.pushState({}, '', '/employees'); dispatchEvent(new PopStateEvent('popstate')) })
  await expect(page).toHaveURL('/dashboard')
})

test('unauthenticated employee and company routes redirect to login', async ({ page }) => {
  await page.route('**/api/**', route => route.abort())
  for (const path of ['/employees', '/company']) {
    await page.goto(path)
    await expect(page).toHaveURL('/login')
  }
})

test('empty employee list has a useful empty state', async ({ page }) => {
  await setup(page)
  await page.route('**/api/employees', route => route.fulfill({ json: { employees: [] } }))
  await openEmployees(page)
  await expect(page.getByText('No employees yet.', { exact: false })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add employee' })).toBeEnabled()
})

test('network failure is safe and list can be retried', async ({ page }) => {
  await setup(page)
  let failed = true
  await page.route('**/api/employees', route => failed ? route.abort() : route.fulfill({ json: { employees: [worker] } }))
  await openEmployees(page)
  await expect(page.getByRole('alert')).toContainText('check your connection')
  failed = false
  await page.getByRole('button', { name: 'Retry' }).click()
  await expect(page.getByRole('row').filter({ hasText: 'sam@example.com' })).toBeVisible()
})

test('duplicate creation shows a safe error and allows correction', async ({ page }) => {
  await setup(page)
  await openEmployees(page)
  await page.route('**/api/employees', route => route.fulfill({ status: 409, json: { message: 'private database diagnostic' } }))
  await fillNew(page)
  await page.getByRole('button', { name: 'Create employee', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText('An account with this email already exists.')
  await expect(page.locator('body')).not.toContainText('private database diagnostic')
  await expect(page.getByRole('button', { name: 'Create employee', exact: true })).toBeEnabled()
})

test('server denied update is shown safely without changing the row', async ({ page }) => {
  await setup(page)
  await openEmployees(page)
  await page.route('**/api/employees/worker-id', route => route.fulfill({ status: 403, json: { message: 'private diagnostic' } }))
  await page.getByRole('button', { name: 'Edit Sam Worker' }).click()
  await page.getByLabel('First name', { exact: true }).fill('New')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('alert')).toContainText('permission')
  await expect(page.getByRole('row').filter({ hasText: 'sam@example.com' })).toContainText('Sam Worker')
})

test('loading state and disabled create controls are visible during requests', async ({ page }) => {
  await setup(page)
  let release: () => void = () => {}
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/employees', async route => {
    await gate
    await route.fulfill({ json: { employees: [worker] } })
  })
  await openEmployees(page)
  await expect(page.getByText('Loading employees…')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add employee' })).toBeDisabled()
  release()
  await expect(page.getByRole('row').filter({ hasText: 'sam@example.com' })).toBeVisible()
  let finish: () => void = () => {}
  const pending = new Promise<void>(resolve => { finish = resolve })
  await page.route('**/api/employees', async route => {
    await pending
    await route.fulfill({ status: 201, json: { employee: { ...worker, _id: 'new-id', firstName: 'Pat' } } })
  })
  await fillNew(page)
  await page.getByRole('button', { name: 'Create employee', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Saving…' })).toBeDisabled()
  await expect(page.getByLabel('First name', { exact: true })).toBeDisabled()
  finish()
  await expect(page.getByText('Employee added successfully.')).toBeVisible()
})
