import { test, expect } from '@playwright/test';

test.describe('Homepage & Public Routes', () => {
  test('should display the homepage branding and headline', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Xoru/i);
    await expect(page.locator('h1')).toContainText('Short Links Powered by');
    await expect(page.getByRole('link', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Get Started' })).toBeVisible();
  });

  test('should navigate to sign-in page', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(page.locator('h1')).toContainText('Welcome back to Xoru');
  });

  test('should navigate to sign-up page', async ({ page }) => {
    await page.goto('/sign-up');
    await expect(page.locator('h1')).toContainText('Create your Xoru account');
  });
});

