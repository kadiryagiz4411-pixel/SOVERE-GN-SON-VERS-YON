/**
 * Restores page scrolling after a modal, overlay, or crash leaves
 * Radix / body overflow locks behind.
 */
export function unlockBodyScroll(): void {
  if (typeof document === 'undefined') return;

  const openOverlay = document.querySelector(
    '[role="dialog"][data-state="open"], [data-radix-dialog-content][data-state="open"], [data-radix-alert-dialog-content][data-state="open"], [data-radix-sheet-content][data-state="open"]',
  );
  if (openOverlay) return;

  const { body, documentElement } = document;
  body.style.removeProperty('overflow');
  body.style.removeProperty('pointer-events');
  body.style.removeProperty('padding-right');
  documentElement.style.removeProperty('overflow');
  documentElement.style.removeProperty('pointer-events');
  body.removeAttribute('data-scroll-locked');
  documentElement.removeAttribute('data-scroll-locked');
  if (body.style.overflow === 'hidden') body.style.overflow = '';
  if (documentElement.style.overflow === 'hidden') documentElement.style.overflow = '';
}
