import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';

test.describe('Navigation and Tab Switching', () => {
  let loginPage;
  let registerPage;
  let dashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    registerPage = new RegisterPage(page);
    dashboardPage = new DashboardPage(page);

    // Register a temporary user to access workspace
    const uniqueEmail = `nav-${Date.now()}@clinic.test`;
    await loginPage.goto();
    await registerPage.switchToRegister(page);
    await registerPage.register('Nav Tester', uniqueEmail, 'Password123!', 'admin');
    await expect(dashboardPage.userNameSpan).toBeVisible();
  });

  test('should navigate between Patients, Doctors, Appointments, and Prescriptions tabs', async () => {
    // 1. Verify we start on Patients tab by default
    await expect(dashboardPage.nameInput).toBeVisible();
    await expect(dashboardPage.ageInput).toBeVisible();
    await expect(dashboardPage.genderSelect).toBeVisible();
    await expect(dashboardPage.phoneInput).toBeVisible();

    // 2. Switch to Doctors tab
    await dashboardPage.selectTab('doctors');
    await expect(dashboardPage.nameInput).toBeVisible();
    await expect(dashboardPage.specializationInput).toBeVisible();
    await expect(dashboardPage.ageInput).not.toBeVisible();

    // 3. Switch to Appointments tab
    await dashboardPage.selectTab('appointments');
    await expect(dashboardPage.patientIdInput).toBeVisible();
    await expect(dashboardPage.doctorIdInput).toBeVisible();
    await expect(dashboardPage.dateInput).toBeVisible();
    await expect(dashboardPage.timeInput).toBeVisible();

    // 4. Switch to Prescriptions tab
    await dashboardPage.selectTab('prescriptions');
    await expect(dashboardPage.patientIdInput).toBeVisible();
    await expect(dashboardPage.medicineInput).toBeVisible();
  });
});
