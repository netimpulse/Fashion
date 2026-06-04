(function () {
  'use strict';

  class FeaturedCarousel extends HTMLElement {
    constructor() {
      super();
      this._onPrev = this._onPrev.bind(this);
      this._onNext = this._onNext.bind(this);
      this._onScroll = this._onScroll.bind(this);
    }

    connectedCallback() {
      this.track = this.querySelector('[data-track]');
      this.prevBtn = this.querySelector('[data-carousel-prev]');
      this.nextBtn = this.querySelector('[data-carousel-next]');

      if (this.prevBtn) this.prevBtn.addEventListener('click', this._onPrev);
      if (this.nextBtn) this.nextBtn.addEventListener('click', this._onNext);
      if (this.track) {
        this.track.addEventListener('scroll', this._onScroll, { passive: true });
        this._updateButtons();
      }
    }

    disconnectedCallback() {
      if (this.prevBtn) this.prevBtn.removeEventListener('click', this._onPrev);
      if (this.nextBtn) this.nextBtn.removeEventListener('click', this._onNext);
      if (this.track) this.track.removeEventListener('scroll', this._onScroll);
    }

    _slotWidth() {
      const slot = this.querySelector('.featured-collection__slot');
      if (!slot) return 280;
      const gap = parseFloat(getComputedStyle(this.track).columnGap || '0') || 0;
      return slot.getBoundingClientRect().width + gap;
    }

    _onPrev() {
      if (!this.track) return;
      this.track.scrollBy({ left: -this._slotWidth(), behavior: 'smooth' });
    }

    _onNext() {
      if (!this.track) return;
      this.track.scrollBy({ left: this._slotWidth(), behavior: 'smooth' });
    }

    _onScroll() {
      this._updateButtons();
    }

    _updateButtons() {
      if (!this.track || !this.prevBtn || !this.nextBtn) return;
      const max = this.track.scrollWidth - this.track.clientWidth;
      this.prevBtn.disabled = this.track.scrollLeft <= 2;
      this.nextBtn.disabled = this.track.scrollLeft >= max - 2;
    }
  }

  if (!customElements.get('featured-carousel')) {
    customElements.define('featured-carousel', FeaturedCarousel);
  }
})();
