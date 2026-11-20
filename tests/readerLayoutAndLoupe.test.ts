import { test } from 'node:test';
import assert from 'node:assert/strict';

/* Viewport stage calculation helper mirroring CSS rules */
function calculateBookDimensions(viewportWidth: number, viewportHeight: number) {
  const topToolbar = 48;
  const bottomBar = 48;
  const stageWidth = viewportWidth;
  const stageHeight = viewportHeight - topToolbar - bottomBar;

  const isMobile = viewportWidth < 768;
  const isSmallMobile = viewportWidth <= 480;

  let widthMargin = 110;
  let heightMargin = 84;
  let maxW = 1280;

  if (isSmallMobile) {
    widthMargin = 20;
    heightMargin = 56;
    maxW = viewportWidth - 20;
  } else if (isMobile) {
    widthMargin = 48;
    heightMargin = 68;
    maxW = viewportWidth - 48;
  }

  const aspectRatio = 1760 / 1240; // 1.41935...

  // CSS: width: min(860px, calc(100vw - widthMargin), calc((100vh - heightMargin) * (1760 / 1240)))
  const maxWidthFromWidth = stageWidth - widthMargin;
  const maxWidthFromHeight = (stageHeight - heightMargin) * aspectRatio;

  const bookWidth = Math.min(maxWidthFromWidth, maxWidthFromHeight, maxW);
  const bookHeight = bookWidth / aspectRatio;

  return {
    stageWidth,
    stageHeight,
    bookWidth,
    bookHeight,
    aspectRatio,
  };
}

/* Loupe coordinate clamping logic mirroring livre-book-renderer.html */
function calculateLoupeClamping(
  bookWidth: number,
  bookHeight: number,
  x: number,
  y: number,
  stageW: number = 1440,
  stageH: number = 804
) {
  const R = Math.round(Math.max(120, Math.min(165, bookWidth * 0.18))) / 2;
  // Stage box relative to centered book
  const minStageX = -(stageW - bookWidth) / 2;
  const maxStageX = bookWidth + (stageW - bookWidth) / 2;
  const minStageY = -(stageH - bookHeight) / 2;
  const maxStageY = bookHeight + (stageH - bookHeight) / 2;

  const minX = minStageX + R;
  const maxX = maxStageX - R * 1.25;
  const minY = minStageY + R;
  const maxY = maxStageY - R * 1.25;

  const clampedX = Math.max(minX, Math.min(maxX, x));
  const clampedY = Math.max(minY, Math.min(maxY, y));

  // Handle tip extension at 45deg: length is R * 0.65, offset is R * 0.36
  const handleReach = R * (0.36 + 0.65) * Math.cos((45 * Math.PI) / 180); // ~0.71 * R
  const handleTipX = clampedX + handleReach;
  const handleTipY = clampedY + handleReach;

  return {
    R,
    clampedX,
    clampedY,
    handleTipX,
    handleTipY,
    lensLeft: clampedX - R,
    lensTop: clampedY - R,
    isOutsideBookLeft: clampedX < 0,
    isOutsideBookRight: clampedX > bookWidth,
    isOutsideBookBottom: clampedY > bookHeight,
    isLensInsideStage: clampedX - R >= minStageX - 10 && clampedY - R >= minStageY - 10,
    isHandleInsideStage: handleTipX <= maxStageX + 10 && handleTipY <= maxStageY + 10,
  };
}

test('Reader Layout — viewport responsive sizing across all key breakpoints', () => {
  const viewports = [
    { name: '1920x1080 (Large Desktop Monitor)', w: 1920, h: 1080 },
    { name: '1532x728 (Large Laptop/Desktop wide)', w: 1532, h: 728 },
    { name: '1440x900 (Desktop Standard)', w: 1440, h: 900 },
    { name: '1366x768 (Standard HD Laptop)', w: 1366, h: 768 },
    { name: '1024x768 (Tablet Landscape / Small Laptop)', w: 1024, h: 768 },
    { name: '768x1024 (iPad / Tablet Portrait)', w: 768, h: 1024 },
    { name: '430x932 (iPhone 14/15 Pro Max)', w: 430, h: 932 },
    { name: '390x844 (iPhone 12/13/14 / Modern Phone)', w: 390, h: 844 },
    { name: '375x812 (iPhone X/XS/11 Pro)', w: 375, h: 812 },
    { name: '360x800 (Compact Mobile / Android)', w: 360, h: 800 },
    { name: '320x740 (Small Android / Compact Mobile)', w: 320, h: 740 },
  ];

  for (const vp of viewports) {
    const dim = calculateBookDimensions(vp.w, vp.h);

    // 1. Book must strictly fit within the stage height (leaving breathing room for shadows)
    assert.ok(
      dim.bookHeight < dim.stageHeight,
      `Book height (${dim.bookHeight}px) exceeds stage height (${dim.stageHeight}px) on ${vp.name}`
    );

    // 2. Book must strictly fit within the stage width (leaving room for navigation arrows)
    assert.ok(
      dim.bookWidth < dim.stageWidth,
      `Book width (${dim.bookWidth}px) exceeds stage width (${dim.stageWidth}px) on ${vp.name}`
    );

    // 3. Aspect ratio must strictly be 1760/1240
    const ratio = dim.bookWidth / dim.bookHeight;
    assert.ok(
      Math.abs(ratio - 1760 / 1240) < 0.001,
      `Aspect ratio distorted (${ratio}) on ${vp.name}`
    );

    // 4. On desktop (>=1024), book should be prominent (at least 55% of width or vertically maximized)
    if (vp.w >= 1024) {
      const widthPct = dim.bookWidth / dim.stageWidth;
      const heightPct = dim.bookHeight / dim.stageHeight;
      assert.ok(
        widthPct >= 0.55 || heightPct >= 0.85,
        `Book is not sufficiently prominent on ${vp.name}: widthPct=${widthPct}, heightPct=${heightPct}`
      );
    }
  }
});

test('Loupe Magnifier — resting position and boundary clamping allow movement outside book while staying within stage', () => {
  const dim = calculateBookDimensions(1440, 900);
  const bw = dim.bookWidth;
  const bh = dim.bookHeight;

  // Test resting position: rests at bottom right of the right page
  const R = Math.round(Math.max(130, Math.min(180, bw * 0.16))) / 2;
  const restingLoupe = calculateLoupeClamping(bw, bh, bw - R * 1.25, bh - R * 1.25);

  assert.ok(
    restingLoupe.isLensInsideStage,
    'Resting loupe lens must stay inside stage margins'
  );
  assert.ok(
    restingLoupe.isHandleInsideStage,
    'Resting loupe handle must stay inside stage margins'
  );
  assert.ok(
    restingLoupe.clampedX > bw * 0.7 && restingLoupe.clampedY > bh * 0.7,
    'Resting loupe should be placed in the bottom right corner of the spread'
  );

  // Test dragging outside the book to the right/bottom onto desk/stage surface (1920x1080 desk)
  const dragOutsideRight = calculateLoupeClamping(bw, bh, bw + 150, bh + 150, 1920, 1080);
  assert.ok(
    dragOutsideRight.isOutsideBookRight,
    'Loupe must be allowed to drag beyond the right book edge onto the desk'
  );
  assert.ok(
    dragOutsideRight.isOutsideBookBottom,
    'Loupe must be allowed to drag beyond the bottom book edge onto the desk'
  );
  assert.ok(
    dragOutsideRight.isHandleInsideStage,
    'Loupe handle must remain within the stage viewport even when dragged outside book'
  );

  // Test dragging outside the book to the left onto desk/stage surface
  const dragOutsideLeft = calculateLoupeClamping(bw, bh, -120, bh / 2);
  assert.ok(
    dragOutsideLeft.isOutsideBookLeft,
    'Loupe must be allowed to drag beyond the left book edge onto the desk'
  );
  assert.ok(
    dragOutsideLeft.isLensInsideStage,
    'Loupe lens must remain within the stage viewport'
  );

  // Test extreme drag limits to stage boundaries
  const clampedFar = calculateLoupeClamping(bw, bh, 5000, 5000);
  assert.ok(
    clampedFar.isHandleInsideStage,
    'Extreme drag must stay clamped within stage boundary'
  );

  const clampedLeft = calculateLoupeClamping(bw, bh, -5000, -5000);
  assert.ok(
    clampedLeft.isLensInsideStage,
    'Extreme left drag must stay clamped within stage boundary'
  );
});
