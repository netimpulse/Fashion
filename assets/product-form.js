(function () {
  'use strict';

  const money = (cents, format) => {
    if (typeof cents !== 'number') cents = parseInt(cents, 10);
    if (isNaN(cents)) return '';
    const fmt = format || (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) || 'USD';
    const value = (cents / 100).toFixed(2);
    return `${fmt} ${value}`;
  };

  class MediaGallery extends HTMLElement {
    constructor() {
      super();
      this._onThumbClick = this._onThumbClick.bind(this);
      this._onPrev = this._onPrev.bind(this);
      this._onNext = this._onNext.bind(this);
      this._onZoom = this._onZoom.bind(this);
      this._onVariantChange = this._onVariantChange.bind(this);
    }

    connectedCallback() {
      this.stage = this.querySelector('[data-gallery-stage]');
      this.slides = Array.from(this.querySelectorAll('.product-gallery__slide'));
      this.thumbs = Array.from(this.querySelectorAll('[data-thumb]'));
      this.prevBtn = this.querySelector('[data-gallery-prev]');
      this.nextBtn = this.querySelector('[data-gallery-next]');
      this.zoomEnabled = this.dataset.enableZoom === 'true';

      this.thumbs.forEach((t) => t.addEventListener('click', this._onThumbClick));
      if (this.prevBtn) this.prevBtn.addEventListener('click', this._onPrev);
      if (this.nextBtn) this.nextBtn.addEventListener('click', this._onNext);

      this.zoomTriggers = Array.from(this.querySelectorAll('[data-zoom-trigger]'));
      this.zoomTriggers.forEach((b) => b.addEventListener('click', this._onZoom));

      this._docListener = this._onVariantChange;
      document.addEventListener('variant:change', this._docListener);
    }

    disconnectedCallback() {
      this.thumbs.forEach((t) => t.removeEventListener('click', this._onThumbClick));
      if (this.prevBtn) this.prevBtn.removeEventListener('click', this._onPrev);
      if (this.nextBtn) this.nextBtn.removeEventListener('click', this._onNext);
      this.zoomTriggers.forEach((b) => b.removeEventListener('click', this._onZoom));
      document.removeEventListener('variant:change', this._docListener);
    }

    _activeIndex() {
      return this.slides.findIndex((s) => s.classList.contains('is-active'));
    }

    _activate(index) {
      if (!this.slides.length) return;
      const i = ((index % this.slides.length) + this.slides.length) % this.slides.length;
      this.slides.forEach((s, n) => {
        const active = n === i;
        s.classList.toggle('is-active', active);
        s.setAttribute('aria-hidden', active ? 'false' : 'true');
      });
      this.thumbs.forEach((t, n) => {
        const active = n === i;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-current', active ? 'true' : 'false');
      });
      this.thumbs[i] && this.thumbs[i].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    }

    _activateByMediaId(mediaId) {
      const idx = this.slides.findIndex((s) => String(s.dataset.mediaId) === String(mediaId));
      if (idx >= 0) this._activate(idx);
    }

    _onThumbClick(e) {
      const thumb = e.currentTarget;
      this._activateByMediaId(thumb.dataset.mediaId);
    }

    _onPrev() { this._activate(this._activeIndex() - 1); }
    _onNext() { this._activate(this._activeIndex() + 1); }

    _onZoom(e) {
      const btn = e.currentTarget;
      const slide = btn.closest('.product-gallery__slide');
      if (!slide) return;
      const isZoomed = slide.classList.toggle('is-zoomed');
      btn.setAttribute('aria-pressed', isZoomed ? 'true' : 'false');
    }

    _onVariantChange(event) {
      const detail = event.detail || {};
      if (String(detail.productId) !== String(this.dataset.productId)) return;
      if (detail.featuredMediaId) this._activateByMediaId(detail.featuredMediaId);
    }
  }

  if (!customElements.get('media-gallery')) {
    customElements.define('media-gallery', MediaGallery);
  }

  class QuantityStepper extends HTMLElement {
    constructor() {
      super();
      this._onClick = this._onClick.bind(this);
    }

    connectedCallback() {
      this.input = this.querySelector('[data-quantity-input]');
      this.decrease = this.querySelector('[data-quantity-decrease]');
      this.increase = this.querySelector('[data-quantity-increase]');
      if (this.decrease) this.decrease.addEventListener('click', this._onClick);
      if (this.increase) this.increase.addEventListener('click', this._onClick);
    }

    disconnectedCallback() {
      if (this.decrease) this.decrease.removeEventListener('click', this._onClick);
      if (this.increase) this.increase.removeEventListener('click', this._onClick);
    }

    _onClick(e) {
      if (!this.input) return;
      const dir = e.currentTarget === this.increase ? 1 : -1;
      const min = parseInt(this.input.min || '1', 10);
      const next = Math.max(min, (parseInt(this.input.value, 10) || min) + dir);
      this.input.value = next;
      this.input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  if (!customElements.get('quantity-stepper')) {
    customElements.define('quantity-stepper', QuantityStepper);
  }

  class VariantPicker extends HTMLElement {
    constructor() {
      super();
      this._onChange = this._onChange.bind(this);
    }

    connectedCallback() {
      const jsonScript = this.querySelector('[data-variants-json]');
      try {
        this.variants = jsonScript ? JSON.parse(jsonScript.textContent) : [];
      } catch (err) {
        this.variants = [];
      }
      this.updateUrl = this.dataset.updateUrl === 'true';
      this.inputs = Array.from(this.querySelectorAll('.variant-picker__input'));
      this.inputs.forEach((i) => i.addEventListener('change', this._onChange));
    }

    disconnectedCallback() {
      this.inputs.forEach((i) => i.removeEventListener('change', this._onChange));
    }

    _selectedOptions() {
      const grouped = {};
      this.inputs.forEach((i) => {
        if (i.checked) {
          const idx = parseInt(i.dataset.optionIndex, 10);
          grouped[idx] = i.dataset.optionValue;
        }
      });
      return Object.keys(grouped).sort().map((k) => grouped[k]);
    }

    _matchingVariant(options) {
      return this.variants.find((v) => {
        const vOptions = [v.option1, v.option2, v.option3].filter((x) => x !== null && x !== undefined);
        if (vOptions.length !== options.length) return false;
        return vOptions.every((vo, idx) => String(vo) === String(options[idx]));
      });
    }

    _updateLegend(name, value) {
      const target = this.querySelector(`[data-selected-value-for="${CSS.escape(name)}"]`);
      if (target) target.textContent = value;
    }

    _onChange(e) {
      const changed = e.currentTarget;
      this._updateLegend(changed.dataset.optionName, changed.dataset.optionValue);

      const selected = this._selectedOptions();
      const variant = this._matchingVariant(selected);

      const section = this.closest('[data-section-id]');
      const productForm = section ? section.querySelector('product-form') : null;
      if (productForm) {
        productForm.applyVariant(variant);
      }

      if (this.updateUrl && variant && window.history && window.history.replaceState) {
        const url = new URL(window.location.href);
        url.searchParams.set('variant', variant.id);
        window.history.replaceState({}, '', url.toString());
      }
    }
  }

  if (!customElements.get('variant-picker')) {
    customElements.define('variant-picker', VariantPicker);
  }

  class ProductForm extends HTMLElement {
    constructor() {
      super();
      this._onSubmit = this._onSubmit.bind(this);
      this._onShare = this._onShare.bind(this);
    }

    connectedCallback() {
      this.productId = this.dataset.productId;
      this.sectionId = this.dataset.sectionId;
      this.form = this.querySelector('form.product-form');
      this.atcButton = this.querySelector('[data-atc-button]');
      this.atcText = this.querySelector('[data-atc-text]');
      this.variantInput = this.querySelector('[data-variant-id]');
      this.priceBlock = this.querySelector('[data-price-block]');
      this.skuTarget = this.querySelector('[data-sku]');

      if (this.form) this.form.addEventListener('submit', this._onSubmit);

      this.shareCopyBtn = this.querySelector('[data-share-copy]');
      if (this.shareCopyBtn) this.shareCopyBtn.addEventListener('click', this._onShare);
    }

    disconnectedCallback() {
      if (this.form) this.form.removeEventListener('submit', this._onSubmit);
      if (this.shareCopyBtn) this.shareCopyBtn.removeEventListener('click', this._onShare);
    }

    applyVariant(variant) {
      if (!variant) {
        this._setAtc(false, this._unavailableLabel());
        return;
      }

      if (this.variantInput) this.variantInput.value = variant.id;
      if (this.skuTarget) this.skuTarget.textContent = variant.sku || '';

      this._renderPrice(variant);
      this._setAtc(variant.available, variant.available ? this._addLabel() : this._soldOutLabel());

      document.dispatchEvent(new CustomEvent('variant:change', {
        detail: {
          productId: this.productId,
          variantId: variant.id,
          featuredMediaId: variant.featured_media ? variant.featured_media.id : null,
          available: variant.available,
        },
      }));
    }

    _setAtc(available, label) {
      if (!this.atcButton) return;
      this.atcButton.disabled = !available;
      if (this.atcText && label) this.atcText.textContent = label;
    }

    _addLabel() {
      return this._getLabel('add_to_cart', 'Add to cart');
    }

    _soldOutLabel() {
      return this._getLabel('sold_out', 'Sold out');
    }

    _unavailableLabel() {
      return this._getLabel('unavailable', 'Unavailable');
    }

    _getLabel(key, fallback) {
      const map = (window.Fashion && window.Fashion.t && window.Fashion.t.product) || {};
      return map[key] || fallback;
    }

    _renderPrice(variant) {
      if (!this.priceBlock) return;
      const wrapper = this.priceBlock.querySelector('[data-price-wrapper]');
      if (!wrapper) return;

      const current = wrapper.querySelector('[data-price]');
      const compare = wrapper.querySelector('[data-compare-price]');
      const badge = wrapper.querySelector('[data-discount-badge]');
      const soldOut = wrapper.querySelector('[data-sold-out-label]');

      const onSale = variant.compare_at_price && variant.compare_at_price > variant.price;

      wrapper.classList.toggle('price--on-sale', !!onSale);
      wrapper.classList.toggle('price--sold-out', !variant.available);

      if (current) {
        const fmt = window.Shopify && window.Shopify.money_format;
        current.textContent = window.Shopify && window.Shopify.formatMoney
          ? window.Shopify.formatMoney(variant.price, fmt)
          : money(variant.price);
      }

      if (compare) {
        if (onSale) {
          compare.textContent = window.Shopify && window.Shopify.formatMoney
            ? window.Shopify.formatMoney(variant.compare_at_price, window.Shopify.money_format)
            : money(variant.compare_at_price);
          compare.style.display = '';
        } else {
          compare.style.display = 'none';
        }
      }

      if (badge) {
        if (onSale) {
          const pct = Math.round(((variant.compare_at_price - variant.price) * 100) / variant.compare_at_price);
          badge.textContent = `-${pct}%`;
          badge.style.display = '';
        } else {
          badge.style.display = 'none';
        }
      }

      if (soldOut) soldOut.style.display = variant.available ? 'none' : '';
    }

    async _onSubmit(e) {
      if (!this.form) return;
      e.preventDefault();
      if (this.atcButton.disabled) return;

      this.atcButton.classList.add('is-loading');
      const formData = new FormData(this.form);

      try {
        const res = await fetch(`${window.Shopify && window.Shopify.routes ? window.Shopify.routes.root : '/'}cart/add.js`, {
          method: 'POST',
          headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          body: formData,
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        document.dispatchEvent(new CustomEvent('cart:added', { detail: data }));

        if (this.atcText) {
          const prev = this.atcText.textContent;
          this.atcText.textContent = this._getLabel('added', 'Added!');
          setTimeout(() => { if (this.atcText) this.atcText.textContent = prev; }, 1500);
        }
      } catch (err) {
        console.error('[product-form] Add to cart failed', err);
        if (this.atcText) {
          const prev = this.atcText.textContent;
          this.atcText.textContent = this._getLabel('error', 'Error');
          setTimeout(() => { if (this.atcText) this.atcText.textContent = prev; }, 1800);
        }
      } finally {
        this.atcButton.classList.remove('is-loading');
      }
    }

    _onShare() {
      const url = window.location.href.split('?')[0];
      const handle = navigator.clipboard;
      if (handle && handle.writeText) {
        handle.writeText(url).catch(() => {});
      }
      const original = this.shareCopyBtn.getAttribute('aria-label') || '';
      this.shareCopyBtn.setAttribute('aria-label', this._getLabel('share_copied', 'Link copied'));
      setTimeout(() => this.shareCopyBtn.setAttribute('aria-label', original), 1500);
    }
  }

  if (!customElements.get('product-form')) {
    customElements.define('product-form', ProductForm);
  }
})();
