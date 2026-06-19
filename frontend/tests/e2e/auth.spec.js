import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';

test.describe('Authentication and Session Management', () => {
  test('should register a new admin, log out, and log back in', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const registerPage = new RegisterPage(page);
    const dashboardPage = new DashboardPage(page);

    const uniqueEmail = `admin-${Date.now()}@clinic.test`;
    const password = 'Password123!';
    const name = 'Dr. Test Admin';

    // 1. Navigate to home (LoginPage)
    await loginPage.goto();
    await expect(page).toHaveTitle(/Clinic Management/i);

    // 2. Switch to register page
    await registerPage.switchToRegister(page);
    await expect(registerPage.nameInput).toBeVisible();

    // 3. Register user
    await registerPage.register(name, uniqueEmail, password, 'admin');

    // 4. Verify logged in (Toast message and session header)
    await expect(dashboardPage.toast).toContainText(/Registered as/i);
    await expect(dashboardPage.userNameSpan).toHaveText(name);
    await expect(dashboardPage.userRoleStrong).toHaveText('admin');

    // 5. Log out
    await dashboardPage.logout();
    await expect(loginPage.emailInput).toBeVisible();
    await expect(dashboardPage.toast).toContainText(/Logged out/i);

    // 6. Log back in
    await loginPage.login(uniqueEmail, password);
    await expect(dashboardPage.toast).toContainText(/Logged in as/i);
    await expect(dashboardPage.userNameSpan).toHaveText(name);
  });

  test('should reject invalid credentials during login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.goto();
    await loginPage.login('nonexistent@clinic.test', 'WrongPass123!');
    
    // Toast should show error
    await expect(dashboardPage.toast).toHaveClass(/error/);
    await expect(dashboardPage.toast).not.toBeEmpty();
  });
});
