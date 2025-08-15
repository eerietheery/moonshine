# Queue and Skip Analysis

## 1. How Songs Are Queued
- The queue is managed in `state.queue` (array of track objects).
- Tracks are added via `addToQueue(track)` (prevents duplicates).
- Tracks can be removed (`removeFromQueue(index)`), reordered (`moveQueueItem(from, to)`), or cleared (`clearQueue()`).
- UI buttons (`.queue-add-btn`) add tracks or albums to the queue.
- The queue panel (`renderQueuePanel`) displays, removes, and reorders queued tracks.

## 2. How the Playlist (Queue) Button Works
- Present in each track row and album card.
- Clicking adds track(s) to the queue and updates the panel.
- The panel lists all queued tracks, supports removal and drag-and-drop reordering.

## 3. How the Skip (Next/Previous) Buttons Work
- Handled in `playerCore.js` via `playNext` and `playPrevious`.
- If the queue has tracks:
  - Plays the next/previous track in the queue.
  - If the end of the queue is reached, removes the current track and continues with the main filtered list.
- If the queue is empty, playback uses the filtered track list, respecting shuffle and loop modes.
- When a queued track finishes, it is removed from the queue (unless loop mode is 'one').
- The queue panel is updated to reflect changes.

## Summary of Flow
- Add to Queue: User clicks queue button → `addToQueue(track)` → track added to `state.queue` → queue panel updated.
- Play Next/Previous: User clicks skip button or track ends → `playNext`/`playPrevious` called. If queue has tracks, play from queue; otherwise, play from filtered list. If queue track finishes, remove from queue and update panel.
- Queue Panel: Always reflects current queue state, supports removal and reordering.

---

## Next Steps: Fixing Skip Behavior
- **Goal:** When songs are queued, the next song played should always be from the queue until the queue is empty. After a queued song is played, it should be removed from the queue immediately.
- **Current Issue:** The queue is not always strictly prioritized, and removal may not be immediate or consistent.
- **Plan:**
  1. Refactor `playNext` and `playPrevious` in `playerCore.js` to always play from the queue if it has tracks.
  2. Ensure that after a queued track is played, it is removed from the queue before advancing.
  3. Only fall back to the main filtered list when the queue is empty.
  4. Update the queue panel after every change.
  5. Add tests and edge case handling for loop/shuffle interactions with the queue.

---

Further details and code changes will be documented as the fix is implemented.
