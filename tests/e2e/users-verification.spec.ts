
import { test, expect } from '@playwright/test';

test.describe('Users Module Verification', () => {
  test('Should open "New User" and "Permissions" modals correctly', async ({ page }) => {
    // 1. Login
    await page.goto('/');
    await page.getByPlaceholder('tucorreo@empresa.com').fill('admin@superair.com.mx');
    await page.getByPlaceholder('••••••••').fill('admin123');
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
    await expect(page.getByText('Panel de Control')).toBeVisible({ timeout: 10000 });

    // 2. Navigate to Users Module
    // Looking for the link in the sidebar
    await page.click('text=Usuarios');

    // Verify we are on the Users page
    await expect(page.getByRole('heading', { name: 'Usuarios y Seguridad' })).toBeVisible();

    // 3. Test "New User" Modal
    // Click the button
    const newUserBtn = page.getByRole('button', { name: 'Nuevo Usuario' });
    await expect(newUserBtn).toBeVisible();
    await newUserBtn.click();

    // Verify Modal Content
    const userModal = page.locator('text=Nuevo Usuario').first(); // The title inside the modal
    await expect(userModal).toBeVisible();

    // Verify inputs exist
    await expect(page.locator('label:has-text("Nombre Completo")')).toBeVisible();
    await expect(page.locator('label:has-text("Email Corporativo")')).toBeVisible();
    await expect(page.locator('label:has-text("Rol de Acceso")')).toBeVisible();
    await expect(page.locator('label:has-text("Contraseña")')).toBeVisible();

    // Close Modal
    await page.locator('button').filter({ has: page.locator('svg.lucide-x') }).click();
    await expect(userModal).not.toBeVisible();

    // 4. Test "Permissions" (Matriz RBAC) Modal
    const rbacBtn = page.getByRole('button', { name: 'Matriz RBAC' });
    await expect(rbacBtn).toBeVisible();
    await rbacBtn.click();

    // Verify Modal Content
    const rbacModal = page.locator('text=Matriz de Acceso RBAC');
    await expect(rbacModal).toBeVisible();

    // Verify table content
    await expect(page.getByText('Ventas')).toBeVisible();
    await expect(page.getByText('Inventario')).toBeVisible();

    // Close Modal
    await page.locator('button').filter({ has: page.locator('svg.lucide-x') }).click();
    await expect(rbacModal).not.toBeVisible();
  });
});
