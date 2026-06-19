// tests/e2e/pages/RegisterPage.js
export class RegisterPage {
  constructor(page) {
    this.page = page;
    this.nameInput     = page.getByLabel('Name');
    this.roleSelect    = page.getByLabel('Role');
    this.emailInput    = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.registerButton = page.getByRole('button', { name: /^register$/i });
    this.loginLink     = page.getByRole('button', { name: /already registered/i });
  }

  async ensureRegisterMode() {
    const registerSubmitButton = this.page.getByRole('button', { name: /^register$/i });
    if (!await registerSubmitButton.isVisible()) {
      const toRegisterButton = this.page.getByRole('button', { name: /need an account/i });
      if (await toRegisterButton.isVisible()) {
        await toRegisterButton.click();
      }
    }
  }

  async switchToRegister(page) {
    await this.ensureRegisterMode();
  }

  async register(name, email, password, role = 'admin') {
    await this.ensureRegisterMode();
    await this.nameInput.fill(name);
    await this.roleSelect.selectOption(role);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.registerButton.click();
  }
}
