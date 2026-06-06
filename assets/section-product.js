/**
 * Product Detail Page coordinator.
 * Coordinates variant selection across color swatches, size picker, gallery,
 * price block, and buy button.
 *
 * Custom events dispatched on the <product-page>:
 *   - variant:change   (detail: { variant, options })
 *   - media:change     (detail: { mediaId })
 */
(function () {
  if (customElements.get('product-page')) return;

  class ProductPage extends HTMLElement {
    constructor() {
      super();
      this.variants = [];
      this.options = [];
      this.selectedOptions = [];
      this.currentVariant = null;
      this.shouldUpdateUrl = this.dataset.updateUrl !== 'false';
    }

    connectedCallback() {
      this._parseData();
      this._initFromUrl();
      this._initGallery();
      this._bindOptionListeners();
      this._bindGalleryListeners();
      this._bindAccordion();
      this._broadcastVariant();
    }

    _parseData() {
      const variantNode = this.querySelector('script[data-variant-json]');
      const optionsNode = this.querySelector('script[data-options-json]');
      try {
        this.variants = variantNode ? JSON.parse(variantNode.textContent) : [];
        this.options = optionsNode ? JSON.parse(optionsNode.textContent) : [];
      } catch (e) {
        this.variants = [];
        this.options = [];
      }
    }

    _initFromUrl() {
      const url = new URL(window.location.href);
      const variantParam = url.searchParams.get('variant');
      let initial = null;
      if (variantParam) {
        initial = this.variants.find(v => String(v.id) === variantParam);
      }
      if (!initial) {
        initial = this.variants.find(v => v.available) || this.variants[0];
      }
      if (!initial) return;
      this.selectedOptions = [initial.option1, initial.option2, initial.option3]
        .filter(o => o !== null && o !== undefined);
      this.currentVariant = initial;
    }

    _bindOptionListeners() {
      this.addEventListener('option:change', (e) => {
        const { position, value } = e.detail;
        if (position == null) return;
        this.selectedOptions[position - 1] = value;
        const match = this.variants.find(v => {
          return (
            (v.option1 == null || v.option1 === this.selectedOptions[0]) &&
            (v.option2 == null || v.option2 === this.selectedOptions[1]) &&
            (v.option3 == null || v.option3 === this.selectedOptions[2])
          );
        });
        if (match) {
          this.currentVariant = match;
          this._broadcastVariant();
          if (this.shouldUpdateUrl) this._updateUrl();
        }
      });
    }

    _broadcastVariant() {
      if (!this.currentVariant) return;
      this.dispatchEvent(new CustomEvent('variant:change', {
        bubbles: false,
        detail: {
          variant: this.currentVariant,
          options: this.options,
          selectedOptions: this.selectedOptions
        }
      }));
      if (this.currentVariant.featured_media_id) {
        this.dispatchEvent(new CustomEvent('media:change', {
          bubbles: false,
          detail: { mediaId: this.currentVariant.featured_media_id }
        }));
      }
    }

    _updateUrl() {
      if (!this.currentVariant) return;
      const url = new URL(window.location.href);
      url.searchParams.set('variant', this.currentVariant.id);
      window.history.replaceState({}, '', url.toString());
    }

    /* ---------- GALLERY ---------- */

    _initGallery() {
      this.mediaRoot = this.querySelector('.pdp__media');
      if (!this.mediaRoot) return;
      this.slides = Array.from(this.querySelectorAll('.pdp__main-media-slide'));
      this.thumbs = Array.from(this.querySelectorAll('.pdp__thumb'));
      this.counterCurrent = this.querySelector('[data-counter-current]');
      this.counterTotal = this.querySelector('[data-counter-total]');
      this.currentMediaIndex = Math.max(0, this.slides.findIndex(s => s.classList.contains('is-active')));
    }

    _bindGalleryListeners() {
      if (!this.mediaRoot) return;

      this.thumbs.forEach(thumb => {
        thumb.addEventListener('click', () => {
          const id = thumb.dataset.mediaId;
          this._showMediaById(id);
        });
      });

      const prevBtn = this.querySelector('[data-prev]');
      const nextBtn = this.querySelector('[data-next]');
      prevBtn && prevBtn.addEventListener('click', () => this._navigate(-1));
      nextBtn && nextBtn.addEventListener('click', () => this._navigate(1));

      this.addEventListener('media:change', (e) => {
        this._showMediaById(e.detail.mediaId);
      });

      // Zoom on click for images
      if (this.mediaRoot.dataset.zoom === 'true') {
        this.mediaRoot.addEventListener('click', (e) => {
          const slide = e.target.closest('.pdp__main-media-slide.is-active');
          if (!slide) return;
          if (slide.dataset.mediaType !== 'image') return;
          if (e.target.closest('.pdp__media-nav, .pdp__thumb')) return;
          slide.classList.toggle('is-zoomed');
        });
      }
    }

    _showMediaById(mediaId) {
      if (mediaId == null) return;
      const idx = this.slides.findIndex(s => String(s.dataset.mediaId) === String(mediaId));
      if (idx < 0) return;
      this._showMediaByIndex(idx);
    }

    _showMediaByIndex(idx) {
      if (idx < 0 || idx >= this.slides.length) return;
      this.slides.forEach((s, i) => {
        s.classList.toggle('is-active', i === idx);
        s.classList.remove('is-zoomed');
        if (i !== idx) {
          const v = s.querySelector('video');
          if (v) v.pause();
        }
      });
      this.thumbs.forEach(t => {
        const isActive = String(t.dataset.mediaId) === String(this.slides[idx].dataset.mediaId);
        t.classList.toggle('is-active', isActive);
        t.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
      this.currentMediaIndex = idx;
      if (this.counterCurrent) this.counterCurrent.textContent = idx + 1;
    }

    _navigate(direction) {
      let next = this.currentMediaIndex + direction;
      if (next < 0) next = this.slides.length - 1;
      if (next >= this.slides.length) next = 0;
      this._showMediaByIndex(next);
    }

    /* ---------- ACCORDION ---------- */
    _bindAccordion() {
      // Native <details> handles open/close — but we can auto-close siblings
      // if the merchant set data-exclusive on the accordion group.
      this.querySelectorAll('[data-accordion-exclusive]').forEach(group => {
        const items = group.querySelectorAll('.pdp-accordion-item');
        items.forEach(item => {
          item.addEventListener('toggle', () => {
            if (item.open) {
              items.forEach(other => { if (other !== item) other.removeAttribute('open'); });
            }
          });
        });
      });
    }

    /* ---------- Helpers used by blocks ---------- */
    formatMoney(cents) {
      const amount = (cents / 100).toFixed(2);
      try {
        return new Intl.NumberFormat(document.documentElement.lang || 'de-DE', {
          style: 'currency',
          currency: window.Shopify && window.Shopify.currency ? window.Shopify.currency.active : 'EUR'
        }).format(cents / 100);
      } catch (e) {
        return amount;
      }
    }
  }

  customElements.define('product-page', ProductPage);

  /* ============================================================
     Option Selectors (radio-button helper)
     Used by color swatches and size picker.
     ============================================================ */
  class OptionSelector extends HTMLElement {
    connectedCallback() {
      this.position = parseInt(this.dataset.optionPosition, 10);
      this.addEventListener('click', this._onClick.bind(this));
      this._root = this.closest('product-page');
      if (this._root) {
        this._root.addEventListener('variant:change', this._onVariantChange.bind(this));
      }
    }

    _onClick(e) {
      const btn = e.target.closest('[data-option-value]');
      if (!btn || btn.disabled) return;
      const value = btn.dataset.optionValue;
      this.querySelectorAll('[data-option-value]').forEach(b => {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
      const labelEl = this.querySelector('[data-option-current]');
      if (labelEl) labelEl.textContent = value;
      this.dispatchEvent(new CustomEvent('option:change', {
        bubbles: true,
        detail: { position: this.position, value }
      }));
    }

    _onVariantChange(e) {
      const { variant, selectedOptions } = e.detail;
      // Update active state from selectedOptions
      const value = selectedOptions[this.position - 1];
      this.querySelectorAll('[data-option-value]').forEach(b => {
        const isActive = b.dataset.optionValue === value;
        b.classList.toggle('is-active', isActive);
        b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
      const labelEl = this.querySelector('[data-option-current]');
      if (labelEl && value) labelEl.textContent = value;
    }
  }
  if (!customElements.get('option-selector')) {
    customElements.define('option-selector', OptionSelector);
  }

  /* ============================================================
     Price Updater
     ============================================================ */
  class PriceDisplay extends HTMLElement {
    connectedCallback() {
      this._root = this.closest('product-page');
      if (this._root) {
        this._root.addEventListener('variant:change', this._update.bind(this));
      }
    }
    _update(e) {
      const v = e.detail.variant;
      if (!v) return;
      const amountEl = this.querySelector('[data-price-amount]');
      const compareEl = this.querySelector('[data-price-compare]');
      const badgeEl = this.querySelector('[data-price-badge]');
      if (amountEl) amountEl.textContent = this._money(v.price);
      if (v.compare_at_price && v.compare_at_price > v.price) {
        if (compareEl) {
          compareEl.textContent = this._money(v.compare_at_price);
          compareEl.style.display = '';
        }
        if (badgeEl) {
          const pct = Math.round(100 * (v.compare_at_price - v.price) / v.compare_at_price);
          badgeEl.textContent = `-${pct}%`;
          badgeEl.style.display = '';
        }
      } else {
        if (compareEl) compareEl.style.display = 'none';
        if (badgeEl) badgeEl.style.display = 'none';
      }
    }
    _money(cents) {
      try {
        return new Intl.NumberFormat(document.documentElement.lang || 'de-DE', {
          style: 'currency',
          currency: window.Shopify && window.Shopify.currency ? window.Shopify.currency.active : 'EUR'
        }).format(cents / 100);
      } catch (e) {
        return (cents / 100).toFixed(2);
      }
    }
  }
  if (!customElements.get('price-display')) {
    customElements.define('price-display', PriceDisplay);
  }

  /* ============================================================
     Buy Buttons (variant id + availability)
     ============================================================ */
  class BuyButtons extends HTMLElement {
    connectedCallback() {
      this._root = this.closest('product-page');
      this.input = this.querySelector('input[name="id"]');
      this.button = this.querySelector('[data-add-button]');
      this.buttonLabel = this.querySelector('[data-add-label]');
      this.qtyMinus = this.querySelector('[data-qty-minus]');
      this.qtyPlus = this.querySelector('[data-qty-plus]');
      this.qtyInput = this.querySelector('[data-qty-input]');
      if (this._root) {
        this._root.addEventListener('variant:change', this._update.bind(this));
      }
      if (this.qtyMinus) this.qtyMinus.addEventListener('click', () => this._adjustQty(-1));
      if (this.qtyPlus) this.qtyPlus.addEventListener('click', () => this._adjustQty(1));
    }
    _update(e) {
      const v = e.detail.variant;
      if (!v) return;
      if (this.input) this.input.value = v.id;
      if (this.button) {
        this.button.disabled = !v.available;
        if (this.buttonLabel) {
          this.buttonLabel.textContent = v.available
            ? this.dataset.labelAdd
            : this.dataset.labelSoldOut;
        }
      }
    }
    _adjustQty(delta) {
      if (!this.qtyInput) return;
      const val = Math.max(1, parseInt(this.qtyInput.value, 10) + delta);
      this.qtyInput.value = val;
    }
  }
  if (!customElements.get('buy-buttons')) {
    customElements.define('buy-buttons', BuyButtons);
  }

  /* ============================================================
     Favorite (localStorage-based wishlist)
     ============================================================ */
  class FavoriteToggle extends HTMLElement {
    connectedCallback() {
      this.button = this.querySelector('button');
      this.productId = this.dataset.productId;
      if (!this.button || !this.productId) return;
      this._refresh();
      this.button.addEventListener('click', this._toggle.bind(this));
    }
    _getList() {
      try {
        return JSON.parse(localStorage.getItem('theme_wishlist') || '[]');
      } catch (e) {
        return [];
      }
    }
    _save(list) {
      try { localStorage.setItem('theme_wishlist', JSON.stringify(list)); } catch (e) {}
    }
    _refresh() {
      const list = this._getList();
      const active = list.includes(this.productId);
      this.button.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
    _toggle() {
      let list = this._getList();
      const idx = list.indexOf(this.productId);
      if (idx >= 0) list.splice(idx, 1);
      else list.push(this.productId);
      this._save(list);
      this._refresh();
      window.dispatchEvent(new CustomEvent('wishlist:change', { detail: { list } }));
    }
  }
  if (!customElements.get('favorite-toggle')) {
    customElements.define('favorite-toggle', FavoriteToggle);
  }

  /* ============================================================
     Delivery estimate + cutoff countdown
     ============================================================ */
  class DeliveryEstimate extends HTMLElement {
    connectedCallback() {
      this.minDays = parseInt(this.dataset.minDays, 10) || 2;
      this.maxDays = parseInt(this.dataset.maxDays, 10) || 5;
      this.cutoffTime = this.dataset.cutoffTime || '';
      this.tz = this.dataset.cutoffTz || 'Europe/Berlin';
      this.skipWeekend = this.dataset.cutoffSkipWeekend === 'true';
      this.textBefore = this.dataset.cutoffTextBefore || '';
      this.textAfter = this.dataset.cutoffTextAfter || '';
      this.timeFormat = this.dataset.cutoffTimeFormat || '{h} Std. {m} Min.';

      this.dateTarget = this.querySelector('[data-delivery-date]');
      this.cutoffRow = this.querySelector('[data-cutoff-row]');
      this.cutoffTextEl = this.querySelector('[data-cutoff-text]');

      this._tick();
      if (this.cutoffTime) {
        this._interval = setInterval(() => this._tick(), 30000);
      }
    }

    disconnectedCallback() {
      if (this._interval) clearInterval(this._interval);
    }

    _tick() {
      const beforeCutoff = this._isBeforeCutoff();
      this._renderDeliveryDate(beforeCutoff);
      this._renderCutoff(beforeCutoff);
    }

    /**
     * Returns a Date object whose local fields (getFullYear, getHours, …)
     * reflect the wall-clock time in the shop's configured timezone.
     */
    _wallClockInTz(date) {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: this.tz,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
      }).formatToParts(date);
      const get = (type) => parseInt(parts.find(p => p.type === type)?.value || '0', 10);
      const h = get('hour');
      return new Date(
        get('year'),
        get('month') - 1,
        get('day'),
        h === 24 ? 0 : h,
        get('minute'),
        get('second')
      );
    }

    _isBeforeCutoff() {
      if (!this.cutoffTime) return true;
      const now = this._wallClockInTz(new Date());
      const day = now.getDay(); // 0=Sun, 6=Sat
      if (this.skipWeekend && (day === 0 || day === 6)) return false;
      const [h, m] = this.cutoffTime.split(':').map(Number);
      const cutoff = new Date(now);
      cutoff.setHours(h, m, 0, 0);
      return now < cutoff;
    }

    _renderDeliveryDate(beforeCutoff) {
      if (!this.dateTarget) return;
      let offset = 0;
      if (this.cutoffTime && !beforeCutoff) offset = 1;
      if (this.skipWeekend) {
        const day = this._wallClockInTz(new Date()).getDay();
        if (day === 6) offset = Math.max(offset, 2); // Sat → Mon
        if (day === 0) offset = Math.max(offset, 1); // Sun → Mon
      }
      const today = new Date();
      const min = this._addBusinessDays(today, this.minDays + offset);
      const max = this._addBusinessDays(today, this.maxDays + offset);
      const locale = document.documentElement.lang || 'de-DE';
      const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' });
      this.dateTarget.textContent = this.minDays === this.maxDays
        ? fmt.format(min)
        : `${fmt.format(min)} – ${fmt.format(max)}`;
    }

    _renderCutoff(beforeCutoff) {
      if (!this.cutoffRow || !this.cutoffTextEl) return;
      if (beforeCutoff && this.textBefore) {
        const remaining = this._timeUntilCutoff();
        const html = this._escapeHtml(this.textBefore).replace('{time}', `<strong>${remaining}</strong>`);
        this.cutoffTextEl.innerHTML = html;
        this.cutoffRow.removeAttribute('hidden');
      } else if (!beforeCutoff && this.textAfter) {
        this.cutoffTextEl.textContent = this.textAfter;
        this.cutoffRow.removeAttribute('hidden');
      } else {
        this.cutoffRow.setAttribute('hidden', '');
      }
    }

    _timeUntilCutoff() {
      const now = this._wallClockInTz(new Date());
      const [h, m] = this.cutoffTime.split(':').map(Number);
      const cutoff = new Date(now);
      cutoff.setHours(h, m, 0, 0);
      const diff = cutoff - now;
      if (diff <= 0) return this._formatRemaining(0, 0);
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      return this._formatRemaining(hours, minutes);
    }

    _formatRemaining(hours, minutes) {
      // {h} and {m} placeholders, optional. If hours = 0, hides "0 Std. " segment.
      let out = this.timeFormat;
      if (hours === 0 && out.includes('{h}') && out.includes('{m}')) {
        // Drop everything up to and including the {h} segment up to {m}
        out = out.replace(/{h}[^{]*/, '');
      }
      out = out.replace('{h}', hours).replace('{m}', minutes);
      return out.trim();
    }

    _escapeHtml(s) {
      return String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#039;')
        .replace('&#123;time&#125;', '{time}') // restore {time} after escape if curlies got encoded
        .replace('&#x7b;time&#x7d;', '{time}');
    }

    _addBusinessDays(date, days) {
      const d = new Date(date);
      let added = 0;
      while (added < days) {
        d.setDate(d.getDate() + 1);
        const day = d.getDay();
        if (day !== 0 && day !== 6) added++;
      }
      return d;
    }
  }
  if (!customElements.get('delivery-estimate')) {
    customElements.define('delivery-estimate', DeliveryEstimate);
  }

  /* ============================================================
     Size guide modal
     ============================================================ */
  class SizeGuideModal extends HTMLElement {
    connectedCallback() {
      this.trigger = document.querySelector(`[data-size-guide-trigger="${this.id}"]`);
      this.closeBtn = this.querySelector('[data-close]');
      if (this.trigger) this.trigger.addEventListener('click', () => this._open());
      if (this.closeBtn) this.closeBtn.addEventListener('click', () => this._close());
      this.addEventListener('click', (e) => { if (e.target === this) this._close(); });
    }
    _open() { this.setAttribute('open', ''); document.body.style.overflow = 'hidden'; }
    _close() { this.removeAttribute('open'); document.body.style.overflow = ''; }
  }
  if (!customElements.get('size-guide-modal')) {
    customElements.define('size-guide-modal', SizeGuideModal);
  }
})();
