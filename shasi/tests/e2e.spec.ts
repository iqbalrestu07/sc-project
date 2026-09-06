import { test, expect } from '@playwright/test';

test.describe('SC Project E2E Tests', () => {
  const dummyPatientName = 'Test E2E Patient ' + Date.now();

  test('Login, Create Patient, and Clean Up', async ({ page }) => {
    // 1. Go to Login Page
    await page.goto('/admin/login');
    
    // Fill credentials
    await page.fill('#signin-email', 'iqbal.restu07@gmail.com');
    await page.fill('#signin-password', 'adminshasi');
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard or at least ensure we are logged in
    await page.waitForURL('**/dashboard*', { timeout: 15000 });
    
    // 2. Go to Patients Page
    // Either by clicking sidebar or going directly to URL
    await page.goto('/patients');
    await page.waitForLoadState('networkidle');

    // 3. Add Patient
    await page.getByRole('button', { name: /Add Patient/i }).first().click();
    
    // Fill Patient Form
    // Using placeholder to find the input
    await page.getByPlaceholder("Enter patient's full name").fill(dummyPatientName);
    
    // Fill other required fields if any (assume only name is required for now, or just fill a random one)
    await page.getByPlaceholder("Phone number").first().fill('081234567890');
    
    // Submit form
    // The button inside the dialog usually has text "Save" or "Add" or "Submit"
    // In shadcn, it's typically a button with type="submit"
    await page.locator('form').getByRole('button', { name: /Save|Submit|Add/i }).click();

    // 4. Wait for it to appear in the list
    // Search for the patient to make it easy to find
    await page.getByPlaceholder(/Search patients/i).fill(dummyPatientName);
    await page.waitForTimeout(1000); // Wait for debounce

    const patientRow = page.locator('tr').filter({ hasText: dummyPatientName }).first();
    await expect(patientRow).toBeVisible({ timeout: 10000 });

    // 5. Clean up (Delete the patient)
    // Click the dropdown menu in that row
    // The button might have an aria-label or just be a MoreHorizontal icon inside a button
    // Often it's `getByRole('button', { name: 'Open menu' })` or similar, but let's just find the generic button in that row
    await patientRow.locator('button').last().click();
    
    // Click Delete in the dropdown
    await page.getByRole('menuitem', { name: /Delete/i }).click();

    // Confirm Delete in Alert Dialog
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: /^Delete$/i }).click();

    // Ensure it's deleted
    await expect(patientRow).not.toBeVisible({ timeout: 10000 });
  });
});
