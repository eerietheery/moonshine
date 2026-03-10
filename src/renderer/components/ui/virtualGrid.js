/**
 * VirtualGrid — virtual-scrolling multi-column card grid
 *
 * Exactly mirrors VirtualList.js but each "row" spans N cards.
 *
 * Contract:
 *   new VirtualGrid({ container, cardMinWidth, rowHeight, gap, total, renderCard })
 *   renderCard(index) -> HTMLElement
 *   setTotal(n)   - update card count without full rebuild
 *   destroy()     - clean up listeners and DOM
 *
 * DOM structure (identical to VirtualList):
 *   container  (scrollable element with a defined height)
 *     viewport (position: relative, height: 0 — children are absolute)
 *     spacer   (position: relative, provides scroll height, capped at 1.5M px)
 *
 * Each visible row:  position: absolute; transform: translateY(visualY)
 *                    display: grid; grid-template-columns: repeat(cols, 1fr)
 */
export class VirtualGrid {
  constructor({ container, cardMinWidth = 160, rowHeight = 220, gap = 12, total = 0, renderCard, squareCards = false }) {
    this.container   = container;
    this.cardMinWidth = cardMinWidth;
    this._baseRowHeight = rowHeight;
    this.rowHeight   = rowHeight;
    this.gap         = gap;
    this.total       = total;
    this.renderCard  = renderCard;
    this.squareCards = squareCards;

    this.MAX_SPACER = 1_500_000;

    this._pool        = new Map();   // rowIndex -> HTMLElement
    this._cols        = 1;
    this._scale       = 1;
    this._scrollTop   = 0;
    this._rafId       = null;
    this.lastRange    = { start: 0, end: -1 };

    // Viewport: position:relative so absolute children are relative to it
    this.viewport = document.createElement('div');
    this.viewport.style.position = 'relative';
    this.viewport.style.willChange = 'transform';

    // Spacer: determines total scroll height
    this.spacer = document.createElement('div');

    container.innerHTML = '';
    container.appendChild(this.viewport);
    container.appendChild(this.spacer);

    this._onScroll = this._onScroll.bind(this);
    this._frame    = this._frame.bind(this);
    container.addEventListener('scroll', this._onScroll, { passive: true });

    this._ro = new ResizeObserver(() => {
      const prev = this._cols;
      this._computeCols();
      if (this._cols !== prev) {
        // Re-render all rows when column count changes
        for (const el of this._pool.values()) el.remove();
        this._pool.clear();
        this.lastRange = { start: 0, end: -1 };
        // Update column template on existing rendered rows (handled by full re-render above)
      }
      this._recomputeSpacer();
      this._scheduleFrame();
    });
    this._ro.observe(container);

    this._computeCols();
    this._recomputeSpacer();
    this._scheduleFrame();
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  _rowCount() {
    return this._cols > 0 ? Math.ceil(this.total / this._cols) : 0;
  }

  _rowPx() {          // height of one logical row (card + gap)
    return this.rowHeight + this.gap;
  }

  _computeCols() {
    const w = this.container.clientWidth || 400;
    this._cols = Math.max(1, Math.floor((w + this.gap) / (this.cardMinWidth + this.gap)));
    if (this.squareCards) {
      // Column width = (containerWidth - (cols-1)*gap) / cols
      const colWidth = (w - (this._cols - 1) * this.gap) / this._cols;
      this.rowHeight = Math.round(colWidth);
    } else {
      this.rowHeight = this._baseRowHeight;
    }
  }

  _recomputeSpacer() {
    const logical = Math.max(0, this._rowCount() * this._rowPx());
    const visual  = Math.min(logical, this.MAX_SPACER);
    this.spacer.style.height = `${visual}px`;
    this._scale = logical > 0 ? visual / logical : 1;
  }

  // ── public API ────────────────────────────────────────────────────────────

  setTotal(total) {
    this.total = total;
    const maxRow = this._rowCount();
    for (const [k, el] of this._pool) {
      if (k >= maxRow) { el.remove(); this._pool.delete(k); }
    }
    this._recomputeSpacer();
    this.lastRange = { start: 0, end: -1 };
    this._scheduleFrame();
  }

  destroy() {
    this.container.removeEventListener('scroll', this._onScroll);
    this._ro.disconnect();
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._pool.clear();
    this.viewport.remove();
    this.spacer.remove();
  }

  // ── internal scroll / render ──────────────────────────────────────────────

  _onScroll() {
    this._scrollTop = this.container.scrollTop;
    this._scheduleFrame();
  }

  _scheduleFrame() {
    if (this._rafId) return;
    this._rafId = requestAnimationFrame(this._frame);
  }

  _frame() {
    this._rafId = null;

    const scrollTop  = this._scrollTop;
    const viewH      = this.container.clientHeight;
    const rowPx      = this._rowPx();
    const totalRows  = this._rowCount();
    const scale      = this._scale;

    // Map visual scroll position -> logical row index
    const logTop    = scale > 0 ? scrollTop / scale : scrollTop;
    const logBottom = scale > 0 ? (scrollTop + viewH) / scale : scrollTop + viewH;

    const PAD = 2;
    const start = Math.max(0, Math.floor(logTop / rowPx) - PAD);
    const end   = Math.min(totalRows, Math.ceil(logBottom / rowPx) + PAD);

    if (start === this.lastRange.start && end === this.lastRange.end) return;

    const nextPool = new Map();

    for (let r = start; r < end; r++) {
      let rowEl = this._pool.get(r);

      if (!rowEl) {
        rowEl = this._makeRow(r);
      }

      // Position: absolute translateY (exactly like VirtualList rows)
      const logY    = r * rowPx;
      const visualY = logY * scale;
      rowEl.style.transform = `translateY(${visualY}px)`;
      rowEl.style.gridTemplateColumns = `repeat(${this._cols}, 1fr)`;

      this.viewport.appendChild(rowEl);
      nextPool.set(r, rowEl);
    }

    // Remove rows that went out of range
    const keep = new Set(nextPool.values());
    for (const child of Array.from(this.viewport.children)) {
      if (!keep.has(child)) child.remove();
    }

    // Keep a bounded off-screen pool (recycle up to 80 extra rows)
    const CAP = 80;
    const merged = new Map(nextPool);
    for (const [k, v] of this._pool) {
      if (merged.size >= CAP) break;
      if (!merged.has(k)) merged.set(k, v);
    }
    this._pool = merged;
    this.lastRange = { start, end };
  }

  _makeRow(rowIndex) {
    const el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.left     = '0';
    el.style.right    = '0';
    el.style.height   = `${this.rowHeight}px`;
    el.style.display  = 'grid';
    el.style.gap      = `${this.gap}px`;
    el.style.gridTemplateColumns = `repeat(${this._cols}, 1fr)`;

    const first = rowIndex * this._cols;
    const last  = Math.min(this.total - 1, first + this._cols - 1);
    for (let i = first; i <= last; i++) {
      const card = this.renderCard(i);
      if (card) el.appendChild(card);
    }
    return el;
  }
}
