// tests/e2e/pages/LoginPage.js
export class LoginPage {
  constructor(page) {
    this.page = page;
    this.emailInput    = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.loginButton   = page.getByRole('button', { name: /^login$/i });
    this.registerLink  = page.getByRole('button', { name: /need an account/i });
  }

  async goto() {
    await this.page.goto('/');
    await this.ensureLoginMode();
  }

  async ensureLoginMode() {
    const loginSubmitButton = this.page.getByRole('button', { name: /^login$/i });
    if (!await loginSubmitButton.isVisible()) {
      const toLoginButton = this.page.getByRole('button', { name: /already registered/i });
      if (await toLoginButton.isVisible()) {
        await toLoginButton.click();
      }
    }
  }

  async login(email, password) {
    await this.ensureLoginMode();
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }
}
