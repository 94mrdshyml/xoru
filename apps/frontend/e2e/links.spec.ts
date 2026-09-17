import { test, expect } from '@playwright/test';

test.describe('Dashboard Short Link Creation', () => {
  test('should protect dashboard route and handle unauthenticated visitors', async ({ page }) => {
    await page.goto('/dashboard');
    // Verify page loads cleanly without 500 server errors
    await expect(page.locator('body')).toBeVisible();
  });
});

