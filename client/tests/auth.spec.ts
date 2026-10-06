import { test, expect, type Page } from '@playwright/test'

const safeUser = {
  _id: 'test-user', company: 'test-company', firstName: 'Alex', lastName: 'Builder',
  email: 'alex@example.com', role: 'owner', isActive: true,
}
const session = { token: 'not-a-real-token', user: safeUser }

test.beforeEach(async ({ page }) => {
  // Every API request is intercepted; tests cannot reach the development database.
  await page.route('**/api/**', route => route.fulfill({ json: { status: 'ok' } }))
})

async function fillLogin(page: Page) {
  await page.getByLabel('Email address', { exact: true }).fill('alex@example.com')
  await page.getByLabel('Password', { exact: true }).fill('example-password')
}

async function fillRegistration(page: Page) {
  await page.getByLabel('Company name').fill('Example Construction')
  await page.getByLabel('Company email').fill('office@example.com')
  await page.getByLabel('First name').fill('Alex')
  await page.getByLabel('Last name').fill('Builder')
  await page.getByLabel('Your email address').fill('alex@example.com')
  await page.getByLabel('Password', { exact: true }).fill('example-password')
}

test('dashboard requires authentication and public routes link correctly', async ({ page }, testInfo) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL('/login')
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('login-desktop.png'), fullPage: true })
  await page.getByRole('link', { name: 'Create a workspace' }).click()
  await expect(page).toHaveURL('/register')
  await page.screenshot({ path: testInfo.outputPath('register-desktop.png'), fullPage: true })
  await page.getByRole('link', { name: 'Sign in' }).click()
  await expect(page).toHaveURL('/login')
})

test('login consumes the contract, protects secrets and clears session on logout', async ({ page }) => {
  await page.route('**/api/auth/login', async route => {
    expect(route.request().method()).toBe('POST')
    expect(route.request().postDataJSON()).toEqual({ email: 'alex@example.com', password: 'example-password' })
    await route.fulfill({ json: session })
  })
  await page.goto('/login')
  await fillLogin(page)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL('/dashboard')
  await expect(page.getByRole('heading', { name: 'Welcome, Alex.' })).toBeVisible()
  await expect(page.getByText('owner', { exact: true })).toBeVisible()
  expect(await page.locator('body').innerText()).not.toContain(session.token)
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0)
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL('/login')
  await page.goto('/dashboard')
  await expect(page).toHaveURL('/login')
})

test('registration sends exactly the six backend fields and opens the dashboard', async ({ page }) => {
  await page.route('**/api/auth/register', async route => {
    expect(route.request().postDataJSON()).toEqual({
      companyName: 'Example Construction', companyEmail: 'office@example.com',
      firstName: 'Alex', lastName: 'Builder', email: 'alex@example.com', password: 'example-password',
    })
    await route.fulfill({ status: 201, json: { ...session, company: { _id: 'test-company', name: 'Example Construction', email: 'office@example.com' } } })
  })
  await page.goto('/register')
  await fillRegistration(page)
  await page.getByRole('button', { name: 'Create workspace' }).click()
  await expect(page).toHaveURL('/dashboard')
  await page.reload()
  await expect(page).toHaveURL('/login')
})

test('failed login uses safe errors and blocks repeated pending submissions', async ({ page }) => {
  let release: () => void = () => {}
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/auth/login', async route => {
    await gate
    await route.fulfill({ status: 401, json: { message: 'sensitive upstream diagnostic' } })
  })
  await page.goto('/login')
  await fillLogin(page)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Signing in' })).toBeDisabled()
  await expect(page.getByLabel('Email address', { exact: true })).toBeDisabled()
  release()
  await expect(page.getByRole('alert')).toContainText('Email or password is incorrect')
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeEnabled()
  await expect(page.locator('body')).not.toContainText('sensitive upstream diagnostic')
  await expect(page).toHaveURL('/login')
})

test('duplicate registration displays an actionable error', async ({ page }) => {
  await page.route('**/api/auth/register', route => route.fulfill({ status: 409, json: {} }))
  await page.goto('/register')
  await fillRegistration(page)
  await page.getByRole('button', { name: 'Create workspace' }).click()
  await expect(page.getByRole('alert')).toContainText('already exists')
  await expect(page).toHaveURL('/register')
})

test('registration rejects blank names and passwords beyond bcrypt byte limit', async ({ page }) => {
  let requests = 0
  await page.route('**/api/auth/register', route => { requests++; return route.fulfill({ json: session }) })
  await page.goto('/register')
  await fillRegistration(page)
  await page.getByLabel('First name').fill('   ')
  await page.getByRole('button', { name: 'Create workspace' }).click()
  await expect(page.getByRole('alert')).toContainText('Blank spaces')
  await page.getByLabel('First name').fill('Alex')
  await page.getByLabel('Password', { exact: true }).fill('é'.repeat(37))
  await page.getByRole('button', { name: 'Create workspace' }).click()
  await expect(page.getByRole('alert')).toContainText('72 bytes')
  expect(requests).toBe(0)
})

test('malformed successful response does not establish a session', async ({ page }) => {
  await page.route('**/api/auth/login', route => route.fulfill({ json: { token: 'not-a-real-token', user: { role: 'owner' } } }))
  await page.goto('/login')
  await fillLogin(page)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page).toHaveURL('/login')
})

test('mobile login, registration and dashboard fit without horizontal overflow', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 })
  for (const route of ['/login', '/register']) {
    await page.goto(route)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath(`${route.slice(1)}-mobile.png`), fullPage: true })
  }
  await page.route('**/api/auth/login', route => route.fulfill({ json: session }))
  await page.goto('/login')
  await fillLogin(page)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL('/dashboard')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('dashboard-mobile.png'), fullPage: true })
})
