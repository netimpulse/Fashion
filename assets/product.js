/* Product page: variant picker, gallery, sticky add-to-cart, share, dialogs. */
(() => {
  'use strict';

  /* ---------------------------------------------------------------- */
  /* <variant-picker>                                                  */
  /* ---------------------------------------------------------------- */
  class VariantPicker extends HTMLElement {
    connectedCallback() {
      this.sectionId = this.dataset.section;
      this.productUrl = this.dataset.url;
      this.section = document.getElementById(`shopify-section-${this.sectionId}`);
      try {
        const json = this.querySelector('[data-variant-json]');
        this.variants = json ? JSON.parse(json.textContent) : [];
      } catch (e) {
        this.variants = [];
      }
      this.addEventListener('change', this.onChange);
      this.updateAvailability();
    }

    disconnectedCallback() {
      this.removeEventListener('change', this.onChange);
    }

    get selectedOptions() {
      return [...this.querySelectorAll('fieldset')].map((fieldset) => {
        const checked = fieldset.querySelector('input:checked');
        return checked ? checked.value : null;
      });
    }

    findVariant(options) {
      return this.variants.find((variant) => variant.options.every((value, index) => value === options[index]));
    }

    onChange = (event) => {
      const input = event.target.closest('[data-option-value-input]');
      if (!input) return;

      const fieldset = input.closest('fieldset');
      const selectedLabel = fieldset && fieldset.querySelector('[data-option-selected]');
      if (selectedLabel) selectedLabel.textContent = input.value;

      const variant = this.findVariant(this.selectedOptions);
      this.updateAvailability();

      if (!variant) {
        this.setButtonState(false, window.themeStrings.unavailable);
        return;
      }

      this.section.querySelectorAll('[data-variant-id]').forEach((el) => {
        el.value = variant.id;
      });

      const url = new URL(this.productUrl, window.location.origin);
      url.searchParams.set('variant', variant.id);
      window.history.replaceState({}, '', url);

      if (variant.featured_media) {
        document.dispatchEvent(
          new CustomEvent('product:media-change', {
            detail: { sectionId: this.sectionId, mediaId: variant.featured_media.id }
          })
        );
      }

      this.setButtonState(variant.available, variant.available ? window.themeStrings.addToCart : window.themeStrings.soldOut);
      this.refreshFromSection(variant.id);
    };

    setButtonState(enabled, label) {
      this.section.querySelectorAll('[data-atc-button]').forEach((button) => {
        button.toggleAttribute('disabled', !enabled);
        const text = button.querySelector('[data-atc-text]');
        if (text && label) text.textContent = label;
      });
      const sticky = this.section.querySelector('[data-sticky-submit]');
      if (sticky && label) sticky.textContent = label;
    }

    /* Cross out option values that have no available variant for the
       current selection of the other options. */
    updateAvailability() {
      const selected = this.selectedOptions;
      this.querySelectorAll('fieldset').forEach((fieldset, optionIndex) => {
        fieldset.querySelectorAll('[data-option-value-input]').forEach((input) => {
          const candidate = [...selected];
          candidate[optionIndex] = input.value;
          const variant = this.variants.find((v) => v.options.every((value, i) => value === candidate[i]));
          const label = fieldset.querySelector(`label[for="${input.id}"]`);
          if (label) label.classList.toggle('is-unavailable', !variant || !variant.available);
        });
      });
    }

    /* Re-render price wrappers + SKU from the server so money formatting,
       unit prices and sale badges stay correct. */
    async refreshFromSection(variantId) {
      try {
        const response = await fetch(`${this.productUrl}?variant=${variantId}&section_id=${this.sectionId}`);
        if (!response.ok) return;
        const html = new DOMParser().parseFromString(await response.text(), 'text/html');
        const currentPrices = this.section.querySelectorAll('[data-price-wrapper]');
        const freshPrices = html.querySelectorAll('[data-price-wrapper]');
        currentPrices.forEach((el, index) => {
          if (freshPrices[index]) el.innerHTML = freshPrices[index].innerHTML;
        });
        const sku = this.section.querySelector('[data-sku]');
        const freshSku = html.querySelector('[data-sku]');
        if (sku && freshSku) sku.textContent = freshSku.textContent;
      } catch (e) {
        /* non-critical */
      }
    }
  }

  if (!customElements.get('variant-picker')) {
    customElements.define('variant-picker', VariantPicker);
  }

  /* ---------------------------------------------------------------- */
  /* <product-gallery>                                                 */
  /* ---------------------------------------------------------------- */
  class ProductGallery extends HTMLElement {
    connectedCallback() {
      this.track = this.querySelector('[data-gallery-track]');
      this.counter = this.querySelector('[data-gallery-current]');
      this.items = [...this.querySelectorAll('[data-media-id]')];
      if (this.track) this.track.addEventListener('scroll', this.onScroll, { passive: true });
      this.addEventListener('click', this.onClick);
      this.onMediaChange = (event) => {
        if (event.detail.sectionId !== this.dataset.sectionId) return;
        this.showMedia(String(event.detail.mediaId));
      };
      document.addEventListener('product:media-change', this.onMediaChange);
    }

    disconnectedCallback() {
      if (this.track) this.track.removeEventListener('scroll', this.onScroll);
      document.removeEventListener('product:media-change', this.onMediaChange);
    }

    onClick = (event) => {
      const thumb = event.target.closest('[data-media-thumb]');
      if (!thumb) return;
      this.showMedia(thumb.dataset.mediaThumb);
    };

    onScroll = () => {
      if (!this.counter || !this.items.length) return;
      const index = Math.round(this.track.scrollLeft / this.track.clientWidth);
      this.counter.textContent = Math.min(index + 1, this.items.length);
    };

    showMedia(mediaId) {
      const item = this.querySelector(`[data-media-id="${mediaId}"]`);
      if (!item) return;
      this.items.forEach((el) => el.classList.toggle('is-active', el === item));
      this.querySelectorAll('[data-media-thumb]').forEach((thumb) => {
        thumb.classList.toggle('is-active', thumb.dataset.mediaThumb === mediaId);
      });
      const isMobileSlider = window.matchMedia('(max-width: 989px)').matches;
      if (isMobileSlider) {
        this.track.scrollTo({ left: item.offsetLeft, behavior: 'smooth' });
      } else {
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }

  if (!customElements.get('product-gallery')) {
    customElements.define('product-gallery', ProductGallery);
  }

  /* ---------------------------------------------------------------- */
  /* <sticky-atc>                                                      */
  /* ---------------------------------------------------------------- */
  class StickyAtc extends HTMLElement {
    connectedCallback() {
      this.form = document.getElementById(this.dataset.formId);
      this.button = this.querySelector('[data-sticky-submit]');
      const target = this.form ? this.form.querySelector('[data-atc-button]') : null;
      if (!target) return;
      this.observer = new IntersectionObserver(
        ([entry]) => {
          const show = !entry.isIntersecting && entry.boundingClientRect.top < 0;
          this.classList.toggle('is-visible', show);
          this.setAttribute('aria-hidden', show ? 'false' : 'true');
        },
        { threshold: 0 }
      );
      this.observer.observe(target);
      if (this.button) this.button.addEventListener('click', this.onClick);
    }

    disconnectedCallback() {
      if (this.observer) this.observer.disconnect();
      if (this.button) this.button.removeEventListener('click', this.onClick);
    }

    onClick = () => {
      if (this.form) this.form.requestSubmit();
    };
  }

  if (!customElements.get('sticky-atc')) {
    customElements.define('sticky-atc', StickyAtc);
  }

  /* ---------------------------------------------------------------- */
  /* Share button + generic dialog openers                             */
  /* ---------------------------------------------------------------- */
  document.addEventListener('click', async (event) => {
    const share = event.target.closest('[data-share]');
    if (share) {
      const url = share.dataset.shareUrl || window.location.href;
      if (navigator.share) {
        navigator.share({ url, title: document.title }).catch(() => {});
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        const label = share.querySelector('[data-share-label]');
        if (label) {
          const original = label.textContent;
          label.textContent = label.dataset.copied || original;
          setTimeout(() => {
            label.textContent = original;
          }, 2000);
        }
      }
      return;
    }

    const opener = event.target.closest('[data-dialog-open]');
    if (opener) {
      const dialog = document.getElementById(opener.dataset.dialogOpen);
      if (dialog && !dialog.open) dialog.showModal();
      return;
    }

    const closer = event.target.closest('[data-dialog-close]');
    if (closer) {
      const dialog = closer.closest('dialog');
      if (dialog && dialog.open) dialog.close();
      return;
    }

    // Backdrop click on product dialogs
    if (event.target instanceof HTMLDialogElement && event.target.classList.contains('product-dialog')) {
      event.target.close();
    }
  });
})();
