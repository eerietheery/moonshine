export class VirtualList {
  constructor({ container, rowHeight = 56, total = 0, renderRow }) {
    this.container = container;
    this.rowHeight = rowHeight;
    this.total = total;
    this.renderRow = renderRow;
    this.viewport = document.createElement('div');
    this.viewport.style.position = 'relative';
    this.spacer = document.createElement('div');
    this.spacer.style.height = `${this.total * this.rowHeight}px`;
    this.container.innerHTML = '';
    this.container.appendChild(this.viewport);
    this.container.appendChild(this.spacer);
    this.lastRange = { start: 0, end: -1 };
    this.onScroll = this.onScroll.bind(this);
    this.container.addEventListener('scroll', this.onScroll, { passive: true });
    this.onScroll();
  }

  setTotal(total) {
    this.total = total;
    this.spacer.style.height = `${this.total * this.rowHeight}px`;
    this.onScroll();
  }

  destroy() {
    this.container.removeEventListener('scroll', this.onScroll);
    this.container.innerHTML = '';
  }

  onScroll() {
    const scrollTop = this.container.scrollTop;
    const height = this.container.clientHeight;
    const start = Math.max(0, Math.floor(scrollTop / this.rowHeight) - 5);
    const end = Math.min(this.total, Math.ceil((scrollTop + height) / this.rowHeight) + 5);
    if (start === this.lastRange.start && end === this.lastRange.end) return;
    this.lastRange = { start, end };

    this.viewport.innerHTML = '';
    for (let i = start; i < end; i++) {
      const y = i * this.rowHeight;
      const row = this.renderRow(i);
      row.style.position = 'absolute';
      row.style.top = `${y}px`;
      row.style.left = '0';
      row.style.right = '0';
      row.style.height = `${this.rowHeight}px`;
      this.viewport.appendChild(row);
    }
  }
}
