import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';

test.describe('Patients CRUD Operations', () => {
  let loginPage;
  let registerPage;
  let dashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    registerPage = new RegisterPage(page);
    dashboardPage = new DashboardPage(page);

    // Register a temporary user to access workspace
    const uniqueEmail = `patient-crud-${Date.now()}@clinic.test`;
    await loginPage.goto();
    await registerPage.switchToRegister(page);
    await registerPage.register('Crud Tester', uniqueEmail, 'Password123!', 'admin');
    await expect(dashboardPage.userNameSpan).toBeVisible();
  });

  test('should create, search, edit, and delete a patient record', async () => {
    const patientName = `John Doe ${Date.now()}`;
    const patientAge = 35;
    const patientGender = 'Male';
    const patientPhone = '03001234567';

    // 1. Create Patient
    await dashboardPage.createPatient(patientName, patientAge, patientGender, patientPhone);
    await expect(dashboardPage.toast).toContainText(/Patient created successfully/i);

    // 2. Search for the patient to ensure they show in the table (due to pagination/limit)
    await dashboardPage.searchRecords(patientName);

    // 3. Verify patient appears in table
    let row = await dashboardPage.getTableRow(patientName);
    await expect(row).toBeVisible();
    await expect(row.locator('td').nth(1)).toHaveText(patientName);
    await expect(row.locator('td').nth(2)).toHaveText(patientAge.toString());
    await expect(row.locator('td').nth(3)).toHaveText(patientGender);
    await expect(row.locator('td').nth(4)).toHaveText(patientPhone);

    // 4. Edit Patient
    const updatedName = `${patientName} Updated`;
    const updatedPhone = '03009876543';
    await dashboardPage.editRow(patientName, {
      'Name': updatedName,
      'Phone': updatedPhone
    });
    await expect(dashboardPage.toast).toContainText(/Patient updated successfully/i);

    // Verify updated details in table
    row = await dashboardPage.getTableRow(updatedName);
    await expect(row).toBeVisible();
    await expect(row.locator('td').nth(1)).toHaveText(updatedName);
    await expect(row.locator('td').nth(4)).toHaveText(updatedPhone);

    // 5. Delete Patient
    await dashboardPage.deleteRow(updatedName);
    await expect(dashboardPage.toast).toContainText(/Patient deleted successfully/i);
    row = await dashboardPage.getTableRow(updatedName);
    await expect(row).not.toBeVisible();
  });
});
