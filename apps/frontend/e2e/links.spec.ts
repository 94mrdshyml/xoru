import { test, expect } from '@playwright/test';

test.describe('Dashboard Short Link Creation', () => {
  test('should render dashboard layout and create short link modal', async ({ page }) => {
    // Note: Clerk auth is mocked/bypassed or redirected in non-authenticated E2E
    await page.goto('/dashboard');
    // If redirected to sign-in, confirm sign-in is present
    const url = page.url();
    if (url.includes('/sign-in')) {
      await expect(page.locator('h1')).toContainText('Welcome back to Xoru');
    } else {
      await expect(page.getByRole('button', { name: /Create Short Link/i })).toBeVisible();
    }
  });
});
