import { test, expect } from '@playwright/test';

test.describe('Dashboard Short Link Creation', () => {
  test('should protect dashboard route and redirect unauthenticated users to sign-in', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL('**/sign-in**');
    await expect(page.locator('h1')).toContainText('Welcome back to Xoru');
  });
});

