export class VirtualList {
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
    this.spacer = document.createElement('div');

    this.container.innerHTML = '';
    this.container.appendChild(this.viewport);
    this.container.appendChild(this.spacer);

    this.lastRange = { start: 0, end: -1 };
    this.onScroll = this.onScroll.bind(this);

    // compute initial spacer/scale
    this._recomputeSpacer();

    this.container.addEventListener('scroll', this.onScroll, { passive: true });
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
    this.onScroll();
  }

  destroy() {
    this.container.removeEventListener('scroll', this.onScroll);
    this.container.innerHTML = '';
  }

  onScroll() {
    const visualScrollTop = this.container.scrollTop;
    const height = this.container.clientHeight;

    // Map visual scroll top back to logical scroll top using the scale factor
    const logicalScrollTop = this._scale > 0 ? visualScrollTop / this._scale : visualScrollTop;
    const logicalViewportBottom = (visualScrollTop + height) / (this._scale > 0 ? this._scale : 1);

    const start = Math.max(0, Math.floor(logicalScrollTop / this.rowHeight) - 5);
    const end = Math.min(this.total, Math.ceil(logicalViewportBottom / this.rowHeight) + 5);
    if (start === this.lastRange.start && end === this.lastRange.end) return;
    this.lastRange = { start, end };

    // Render rows for logical indices [start, end)
    this.viewport.innerHTML = '';
    for (let i = start; i < end; i++) {
      const logicalY = i * this.rowHeight;
      const visualY = logicalY * this._scale;
      const row = this.renderRow(i);
      row.style.position = 'absolute';
      row.style.top = `${visualY}px`;
      row.style.left = '0';
      row.style.right = '0';
      row.style.height = `${this.rowHeight}px`;
      this.viewport.appendChild(row);
    }
  }
}
