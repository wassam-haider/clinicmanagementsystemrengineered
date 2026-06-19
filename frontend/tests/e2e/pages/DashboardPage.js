// tests/e2e/pages/DashboardPage.js
export class DashboardPage {
  constructor(page) {
    this.page = page;
    this.logoutButton = page.getByRole('button', { name: /logout/i });
    this.userNameSpan = page.locator('.session span');
    this.userRoleStrong = page.locator('.session strong');
    
    // Tab selectors
    this.patientsTab = page.getByRole('button', { name: /^patients$/i });
    this.doctorsTab = page.getByRole('button', { name: /^doctors$/i });
    this.appointmentsTab = page.getByRole('button', { name: /^appointments$/i });
    this.prescriptionsTab = page.getByRole('button', { name: /^prescriptions$/i });
    
    // Common Form Inputs
    this.nameInput = page.getByLabel('Name');
    this.ageInput = page.getByLabel('Age');
    this.genderSelect = page.getByLabel('Gender');
    this.phoneInput = page.getByLabel('Phone');
    
    // Doctor Specific Inputs
    this.specializationInput = page.getByLabel('Specialization');
    
    // Appointment / Prescription Inputs
    this.patientIdInput = page.getByLabel('Patient ID');
    this.doctorIdInput = page.getByLabel('Doctor ID');
    this.dateInput = page.getByLabel('Date');
    this.timeInput = page.getByLabel('Time');
    this.medicineInput = page.getByLabel('Medicine');
    
    // Form Actions
    this.submitButton = page.getByRole('button', { name: /^(create|update)$/i });
    this.cancelButton = page.getByRole('button', { name: /^cancel$/i });
    
    // Search
    this.searchInput = page.locator('.search input');
    this.searchButton = page.getByRole('button', { name: /^search$/i });
    
    // Toast Messages
    this.toast = page.locator('.toast');
  }

  async logout() {
    await this.logoutButton.click();
  }

  async selectTab(tabName) {
    switch (tabName.toLowerCase()) {
      case 'patients':
        await this.patientsTab.click();
        break;
      case 'doctors':
        await this.doctorsTab.click();
        break;
      case 'appointments':
        await this.appointmentsTab.click();
        break;
      case 'prescriptions':
        await this.prescriptionsTab.click();
        break;
      default:
        throw new Error(`Unknown tab: ${tabName}`);
    }
  }

  async createPatient(name, age, gender, phone) {
    await this.selectTab('patients');
    await this.nameInput.fill(name);
    await this.ageInput.fill(age.toString());
    await this.genderSelect.selectOption(gender);
    await this.phoneInput.fill(phone);
    await this.submitButton.click();
  }

  async createDoctor(name, specialization) {
    await this.selectTab('doctors');
    await this.nameInput.fill(name);
    await this.specializationInput.fill(specialization);
    await this.submitButton.click();
  }

  async createAppointment(patientId, doctorId, date, time) {
    await this.selectTab('appointments');
    await this.patientIdInput.fill(patientId);
    await this.doctorIdInput.fill(doctorId);
    await this.dateInput.fill(date);
    await this.timeInput.fill(time);
    await this.submitButton.click();
  }

  async createPrescription(patientId, medicine) {
    await this.selectTab('prescriptions');
    await this.patientIdInput.fill(patientId);
    await this.medicineInput.fill(medicine);
    await this.submitButton.click();
  }

  async getTableRow(text) {
    return this.page.locator('tr').filter({ hasText: text });
  }

  async editRow(text, newFields = {}) {
    const row = await this.getTableRow(text);
    await row.getByRole('button', { name: /^edit$/i }).click();

    // Fill only provided fields
    for (const [key, val] of Object.entries(newFields)) {
      const input = this.page.getByLabel(key);
      if (await input.count() > 0) {
        const tagName = await input.evaluate(el => el.tagName.toLowerCase());
        if (tagName === 'select') {
          await input.selectOption(val);
        } else {
          await input.fill(val);
        }
      }
    }
    await this.submitButton.click();
  }

  async deleteRow(text) {
    const row = await this.getTableRow(text);
    await row.getByRole('button', { name: /^delete$/i }).click();
  }

  async searchRecords(query) {
    await this.searchInput.fill(query);
    await this.searchButton.click();
  }
}
