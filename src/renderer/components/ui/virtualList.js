export class VirtualList {
  /**
   * Contract (tiny):
   * - constructor({container, rowHeight, total, renderRow})
   * - renderRow(index) -> HTMLElement (can be expensive; VirtualList will reuse created elements)
   */
  constructor({ container, rowHeight = 56, total = 0, renderRow }) {
    this.container = container;
    this.rowHeight = rowHeight;
    this.total = total;
    this.renderRow = renderRow;

    // Maximum visual spacer height to avoid huge DOM heights on very large lists.
    // The logical height is total * rowHeight; we map it to this capped visual height
    // using a scale factor so scroll position can be remapped to logical indices.
    this.MAX_SPACER_HEIGHT = 1_500_000; // 1.5M px cap (tunable)

    this.viewport = document.createElement('div');
    this.viewport.style.position = 'relative';
    // Use transform for positioning (GPU friendly)
    this.viewport.style.willChange = 'transform';
    this.spacer = document.createElement('div');

    this.container.innerHTML = '';
    this.container.appendChild(this.viewport);
    this.container.appendChild(this.spacer);

    // Pool of DOM nodes keyed by logical index (keeps recent nodes to avoid reallocation)
    this._pool = new Map();

    this.lastRange = { start: 0, end: -1 };
    this._pendingFrame = null;
    this._lastScrollTop = 0;

    this.onScroll = this.onScroll.bind(this);
    this._updateFrame = this._updateFrame.bind(this);

    // compute initial spacer/scale
    this._recomputeSpacer();

    this.container.addEventListener('scroll', this.onScroll, { passive: true });
    // initial render
    this.onScroll();
  }

  _recomputeSpacer() {
    const logicalHeight = Math.max(0, this.total * this.rowHeight);
    const visualHeight = Math.min(logicalHeight, this.MAX_SPACER_HEIGHT);
    this.spacer.style.height = `${visualHeight}px`;
    // scale maps logical -> visual
    this._scale = logicalHeight > 0 ? visualHeight / logicalHeight : 1;
    if (this._scale < 1) {
      // warn once in dev when capping occurs
      if (!this._warnedAboutCap) {
        console.warn(`VirtualList: spacer capped (logical=${logicalHeight}px, visual=${visualHeight}px). Using scale=${this._scale.toFixed(6)} to map scroll positions.`);
        this._warnedAboutCap = true;
      }
    }
  }

  setTotal(total) {
    this.total = total;
    this._recomputeSpacer();
    // Drop pooled elements that are out of bounds
    for (const key of Array.from(this._pool.keys())) {
      if (key >= total) {
        const el = this._pool.get(key);
        if (el && el.parentNode) el.parentNode.removeChild(el);
        this._pool.delete(key);
      }
    }
    this.requestUpdate();
  }

  destroy() {
    this.container.removeEventListener('scroll', this.onScroll);
    if (this._pendingFrame) cancelAnimationFrame(this._pendingFrame);
    this._pool.clear();
    this.container.innerHTML = '';
  }

  // schedule an update on the next animation frame
  requestUpdate() {
    if (this._pendingFrame) return;
    this._pendingFrame = requestAnimationFrame(this._updateFrame);
  }

  onScroll() {
    // store last scrollTop and schedule a rAF-render; this prevents layout thrashing
    this._lastScrollTop = this.container.scrollTop;
    this.requestUpdate();
  }

  _updateFrame() {
    this._pendingFrame = null;
    const visualScrollTop = this._lastScrollTop;
    const height = this.container.clientHeight;

    // Map visual scroll top back to logical scroll top using the scale factor
    const logicalScrollTop = this._scale > 0 ? visualScrollTop / this._scale : visualScrollTop;
    const logicalViewportBottom = (visualScrollTop + height) / (this._scale > 0 ? this._scale : 1);

    const paddingRows = 5; // render a small buffer above and below
    const start = Math.max(0, Math.floor(logicalScrollTop / this.rowHeight) - paddingRows);
    const end = Math.min(this.total, Math.ceil(logicalViewportBottom / this.rowHeight) + paddingRows);
    if (start === this.lastRange.start && end === this.lastRange.end) return;

    // Reconcile pool: keep elements for [start, end)
    const fragment = document.createDocumentFragment();
    const newPool = new Map();

    for (let i = start; i < end; i++) {
      let row = this._pool.get(i);
      if (!row) {
        // create once via renderRow
        row = this.renderRow(i);
        // ensure sizing/positioning is efficient: use transform translateY for layout
        row.style.position = 'absolute';
        row.style.left = '0';
        row.style.right = '0';
        row.style.height = `${this.rowHeight}px`;
      }
      const logicalY = i * this.rowHeight;
      const visualY = logicalY * this._scale;
      // use transform for better performance
      row.style.transform = `translateY(${visualY}px)`;
      fragment.appendChild(row);
      newPool.set(i, row);
    }

    // Surgical reconciliation: append/move desired nodes in order (appendChild moves if already in DOM)
    // This avoids full detach/reattach which innerHTML = '' causes.
    const desiredNodes = [];
    for (let i = start; i < end; i++) desiredNodes.push(newPool.get(i));

    // Append/move nodes in order. appendChild will move an existing child instead of cloning.
    for (const node of desiredNodes) {
      if (!node) continue;
      this.viewport.appendChild(node);
    }

    // Remove any leftover nodes that are not in desiredNodes
    const keep = new Set(desiredNodes.filter(Boolean));
    for (const child of Array.from(this.viewport.children)) {
      if (!keep.has(child)) child.remove();
    }

    // swap pool
    // keep a few old nodes in the pool to avoid GC churn (cap to 100 entries)
    const keepCap = 100;
    const mergedPool = new Map(newPool);
    for (const [k, v] of this._pool) {
      if (mergedPool.size >= keepCap) break;
      if (!mergedPool.has(k)) mergedPool.set(k, v);
    }
    this._pool = mergedPool;

    this.lastRange = { start, end };
  }
}
