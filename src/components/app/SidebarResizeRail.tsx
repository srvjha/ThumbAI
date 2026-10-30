'use client';

import { useRef, type PointerEvent, type RefObject } from 'react';
import { SidebarRail, useSidebar } from '@/components/ui/sidebar';
import {
  SIDEBAR_ICON_WIDTH,
  SIDEBAR_SNAP_WIDTH,
  clampSidebarWidth,
} from './sidebar-config';

// Pointer travel before a press counts as a drag instead of a click.
const DRAG_THRESHOLD = 3;

type Drag = {
  pointerId: number;
  startX: number;
  startWidth: number;
  lastX: number;
  moved: boolean;
  frame: number;
  width: number;
};

/**
 * shadcn's SidebarRail with drag-to-resize. A click still toggles; a drag
 * writes --sidebar-width straight onto the provider wrapper (no React
 * render per frame) and commits the final width on release.
 */
export const SidebarResizeRail = ({
  wrapperRef,
  width,
  onResizeEnd,
}: {
  wrapperRef: RefObject<HTMLDivElement | null>;
  width: number;
  onResizeEnd: (width: number) => void;
}) => {
  const { open, setOpen, toggleSidebar, isMobile } = useSidebar();
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  // Latest open state for the rAF callback, without re-binding handlers.
  const openRef = useRef(open);
  openRef.current = open;

  if (isMobile) return null;

  const apply = (d: Drag) => {
    const wrapper = wrapperRef.current;
    d.frame = 0;
    if (!wrapper) return;
    const raw = d.startWidth + (d.lastX - d.startX);
    const shouldOpen = raw >= SIDEBAR_SNAP_WIDTH;
    if (shouldOpen !== openRef.current) {
      openRef.current = shouldOpen;
      setOpen(shouldOpen);
    }
    // Below the snap point keep the last expanded width for next open.
    if (shouldOpen) {
      d.width = clampSidebarWidth(raw);
      wrapper.style.setProperty('--sidebar-width', `${d.width}px`);
    }
    // Track the pointer 1:1 while open; let the snap itself animate.
    wrapper.dataset.resizing = String(shouldOpen);
  };

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startWidth: open ? width : SIDEBAR_ICON_WIDTH,
      lastX: e.clientX,
      moved: false,
      frame: 0,
      width,
    };
  };

  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    d.lastX = e.clientX;
    if (!d.moved) {
      if (Math.abs(d.lastX - d.startX) < DRAG_THRESHOLD) return;
      d.moved = true;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }
    if (!d.frame) d.frame = requestAnimationFrame(() => apply(d));
  };

  const endDrag = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (!d.moved) return; // a plain click; onClick toggles
    if (d.frame) cancelAnimationFrame(d.frame);
    apply(d);
    // Only a pointerup is followed by a click; a cancel is not.
    suppressClick.current = e.type === 'pointerup';
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    const wrapper = wrapperRef.current;
    if (wrapper) delete wrapper.dataset.resizing;
    onResizeEnd(d.width);
  };

  return (
    <SidebarRail
      title='Drag to resize, click to collapse'
      aria-label='Resize or toggle sidebar'
      className='in-data-[side=left]:cursor-col-resize in-data-[resizing=true]:after:bg-sidebar-ring'
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClick={() => {
        // The click that ends a drag must not also toggle.
        if (suppressClick.current) {
          suppressClick.current = false;
          return;
        }
        toggleSidebar();
      }}
    />
  );
};
