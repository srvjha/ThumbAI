import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** YouTube's Test & Compare takes up to three thumbnails per video. */
export const SHORTLIST_LIMIT = 3;

export interface PinnedImage {
  url: string;
  aspectRatio: string;
}

interface StudioState {
  /** Images pinned for side-by-side comparison, oldest first. */
  shortlist: PinnedImage[];
  togglePin: (image: PinnedImage) => 'pinned' | 'unpinned' | 'full';
  clearShortlist: () => void;
  previewOpen: boolean;
  setPreviewOpen: (open: boolean) => void;
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  historyOpen: boolean;
  setHistoryOpen: (open: boolean) => void;
}

/**
 * Workspace state that outlives a single workflow: the shortlist survives
 * switching between Text, Image and Blog so a compare set can mix them.
 * Kept in sessionStorage; it is a scratch set, not saved work.
 */
export const useStudioStore = create<StudioState>()(
  persist(
    (set, get) => ({
      shortlist: [],
      togglePin: (image) => {
        const { shortlist } = get();
        if (shortlist.some((p) => p.url === image.url)) {
          set({ shortlist: shortlist.filter((p) => p.url !== image.url) });
          return 'unpinned';
        }
        if (shortlist.length >= SHORTLIST_LIMIT) return 'full';
        set({
          shortlist: [
            ...shortlist,
            { url: image.url, aspectRatio: image.aspectRatio },
          ],
        });
        return 'pinned';
      },
      clearShortlist: () => set({ shortlist: [] }),
      previewOpen: false,
      setPreviewOpen: (previewOpen) => set({ previewOpen }),
      paletteOpen: false,
      setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
      historyOpen: false,
      setHistoryOpen: (historyOpen) => set({ historyOpen }),
    }),
    {
      name: 'thumbai-studio',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ shortlist: state.shortlist }),
      // Rehydrated after mount (see StudioWorkspace) so the server render and
      // the first client render agree.
      skipHydration: true,
    },
  ),
);
