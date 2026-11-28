import fs from 'fs';
import path from 'path';

import { expect, galata, test } from '@jupyterlab/galata';

const FILENAME = 'story_map_long_text.jGIS';

test.use({
  viewport: { width: 1290, height: 800 },
});

test.describe('Vertical scroll story map card', () => {
  test.beforeEach(async ({ page, request, tmpPath }) => {
    // The example story, as a vertical scroll story whose first map segment
    // has more text than fits on the stage.
    const doc = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, '../../examples/story_map.jGIS'),
        'utf-8',
      ),
    );
    const story: any = Object.values(doc.stories)[0];
    story.storyType = 'Vertical Scroll';
    const content = doc.layers[story.storySegments[0]].parameters.content;
    content.markdown = Array(20).fill(content.markdown).join('\n\n');

    await galata
      .newContentsHelper(request)
      .uploadContent(JSON.stringify(doc), 'text', `/${tmpPath}/${FILENAME}`);

    await page.filebrowser.open(`/${tmpPath}/${FILENAME}`);
    await page.waitForCondition(async () =>
      page.activity.isTabActive(FILENAME),
    );
    await page.locator('div.jGIS-Spinner').waitFor({ state: 'hidden' });
    const okButton = page.getByRole('button', { name: 'Ok' });
    if (await okButton.isVisible()) {
      await okButton.click();
    }
    await page.getByTestId('open-story-editor-button').click();
    await page.getByRole('button', { name: 'Preview story' }).click();
  });

  test.afterEach(async ({ page }) => {
    await page.activity.closeAll();
  });

  test('grows with its text and the story scroller moves', async ({ page }) => {
    const card = page.locator('.jgis-story-map-overlay-content').first();
    const scrollHost = page.getByTestId('jgis-story-stage-scroll-host');
    await expect(card).toBeVisible();

    const stage = await page.locator('.jgis-story-stage').boundingBox();
    const box = await card.boundingBox();
    expect(box!.height).toBeGreaterThan(stage!.height);
    expect(
      await card.evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
    ).toBeTruthy();

    await page.mouse.move(box!.x + 24, box!.y + 24);
    await page.mouse.wheel(0, 200);
    await expect
      .poll(() => scrollHost.evaluate((el) => el.scrollTop))
      .toBeGreaterThan(0);
    expect(await card.evaluate((el) => el.scrollTop)).toBe(0);
  });
});
