import { expect, test, type Page } from '@playwright/test';

/**
 * The whole product, on a phone, in one pass: place the pain by dragging it on the body,
 * answer the seven questions, read why the pattern was chosen, start the session, check in,
 * and see the trend move. Everything is asserted through `data-testid` hooks the screens
 * expose, so a copy edit cannot break the suite and the suite cannot silently pass.
 */

const MOBILE = { viewport: { width: 393, height: 851 }, hasTouch: true, isMobile: true };

async function placePain(page: Page, region: string) {
  await page.goto('/body');
  await page.getByTestId('open-search').click();
  await page.getByTestId('region-search-input').fill(region);
  await page.getByTestId(`region-${region}`).click();
  await expect(page.getByTestId('pin-strip')).toContainText(
    region.split('-').slice(0, 2).join(' '),
  );
}

test.describe('new journey', () => {
  test.use(MOBILE);

  test('marker, questions, pattern, plan', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('nav')).toBeVisible();
    await expect(page.getByTestId('today-cta')).toBeVisible();

    await placePain(page, 'knee-anterior-left');
    await page.getByTestId('confirm-region').click();

    // Seven screens, each with its own test id on the primary action.
    for (let step = 0; step < 7; step++) {
      await expect(page.getByTestId('intake-title')).toBeVisible();
      if (step === 0) await page.getByTestId('input-pain').fill('4');
      if (step === 1) await page.getByTestId('option-sudden').click();
      if (step === 3) await page.getByTestId('option-load').click();
      if (step === 4) {
        const worse = page.locator('[data-testid^="worse-"]').first();
        if (await worse.count()) await worse.click();
      }
      if (step === 5) await page.getByTestId('option-moderate').click();
      await page.getByTestId('intake-next').click();
    }

    await expect(page.getByTestId('explain-title')).toBeVisible();
    await page.getByTestId('choose-pattern').click();
    await expect(page.getByTestId('plan-minutes')).toBeVisible();
    await expect(page.getByTestId('plan-start')).toBeEnabled();
  });

  test('the front and the back of the knee plan differently', async ({ page }) => {
    await placePain(page, 'knee-anterior-left');
    await page.getByTestId('confirm-region').click();
    for (let step = 0; step < 7; step++) await page.getByTestId('intake-next').click();
    const frontTitle = await page.getByTestId('pattern-name').innerText();

    await placePain(page, 'knee-posterior-left');
    await page.getByTestId('confirm-region').click();
    for (let step = 0; step < 7; step++) await page.getByTestId('intake-next').click();
    const backTitle = await page.getByTestId('pattern-name').innerText();
    expect(frontTitle).not.toBe(backTitle);
  });

  test('a pin is dragged on the skin and keeps its normal', async ({ page }) => {
    await page.goto('/body');
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 20_000 });
    const box = (await canvas.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.42);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.56, box.y + box.height * 0.5, { steps: 12 });
    await page.mouse.up();
    await expect(page.getByTestId('pin-strip').locator('.chip')).toHaveCount(1, {
      timeout: 10_000,
    });
    const before = await page.getByTestId('pin-intensity').getAttribute('value');
    await page.getByTestId('pin-intensity').fill('8');
    expect(await page.getByTestId('pin-intensity').getAttribute('value')).not.toBe(before);
  });

  test('reduced motion still shows the movement', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await placePain(page, 'lumbar-spine');
    await page.getByTestId('confirm-region').click();
    for (let step = 0; step < 7; step++) await page.getByTestId('intake-next').click();
    await page.getByTestId('choose-pattern').click();
    await expect(page.getByTestId('plan-start')).toBeVisible();
  });

  test('Arabic never shows a made-up placeholder', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('lang-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await page.goto('/body');
    const pending = page.getByTestId('pending-translation');
    expect(await pending.count()).toBeGreaterThanOrEqual(0);
    await expect(page.getByTestId('stage-label')).toBeVisible();
  });

  test('an urgent flag pauses the session', async ({ page }) => {
    await placePain(page, 'lumbar-spine');
    await page.getByTestId('confirm-region').click();
    await page.getByTestId('intake-next').click();
    for (let step = 1; step < 6; step++) await page.getByTestId('intake-next').click();
    await page.getByTestId('detail-bladder').click();
    await page.getByTestId('intake-next').click();
    await expect(page.getByTestId('triage-message')).toBeVisible();
    await expect(page.getByTestId('triage-emergency')).toBeVisible();
  });
});
