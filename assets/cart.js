/* Statik cart logic: AJAX add-to-cart, cart drawer, cart line updates. */
(() => {
  'use strict';

  const strings = window.themeStrings || {};

  const jsonHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  };

  const updateCartCounts = (count) => {
    document.querySelectorAll('[data-cart-count]').forEach((el) => {
      el.textContent = count;
      el.toggleAttribute('hidden', count === 0);
    });
  };

  const replaceSection = (sectionId, html) => {
    const target = document.getElementById(`shopify-section-${sectionId}`);
    if (!target || typeof html !== 'string') return;
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const fresh = parsed.getElementById(`shopify-section-${sectionId}`) || parsed.body;
    target.innerHTML = fresh.innerHTML;
  };

  const getCartSectionIds = () => {
    const ids = [];
    document.querySelectorAll('[data-cart-section]').forEach((el) => {
      const wrapper = el.closest('.shopify-section');
      if (wrapper && wrapper.id) ids.push(wrapper.id.replace('shopify-section-', ''));
    });
    return [...new Set(ids)];
  };

  /* Section re-renders replace the <cart-drawer> element, so always
     re-query before opening. */
  const openCartDrawer = () => {
    const drawer = document.querySelector('cart-drawer');
    if (drawer && typeof drawer.open === 'function') drawer.open();
  };

  const isCartDrawerOpen = () => !!document.querySelector('cart-drawer dialog[open]');

  /* ---------------------------------------------------------------- */
  /* <cart-drawer>                                                     */
  /* ---------------------------------------------------------------- */
  class CartDrawer extends HTMLElement {
    connectedCallback() {
      this.dialog = this.querySelector('dialog');
      document.addEventListener('click', this.onDocumentClick);
      this.addEventListener('click', this.onInnerClick);
    }

    disconnectedCallback() {
      document.removeEventListener('click', this.onDocumentClick);
    }

    onDocumentClick = (event) => {
      const opener = event.target.closest('[data-cart-drawer-open]');
      if (opener) {
        event.preventDefault();
        this.open();
      }
    };

    onInnerClick = (event) => {
      if (event.target.closest('[data-cart-drawer-close]')) {
        event.preventDefault();
        this.close();
        return;
      }
      // Click on the backdrop (the <dialog> itself, not its children)
      if (event.target === this.dialog) this.close();
    };

    open() {
      if (this.dialog && !this.dialog.open) this.dialog.showModal();
    }

    close() {
      if (this.dialog && this.dialog.open) this.dialog.close();
    }
  }

  if (!customElements.get('cart-drawer')) {
    customElements.define('cart-drawer', CartDrawer);
  }

  /* ---------------------------------------------------------------- */
  /* <cart-items> — quantity changes + remove links (drawer + page)   */
  /* ---------------------------------------------------------------- */
  class CartItems extends HTMLElement {
    connectedCallback() {
      this.addEventListener('change', this.onChange);
      this.addEventListener('click', this.onClick);
    }

    onChange = (event) => {
      const input = event.target.closest('[data-line-quantity]');
      if (!input) return;
      this.updateLine(input.dataset.line, input.value);
    };

    onClick = (event) => {
      const removeLink = event.target.closest('[data-cart-remove]');
      if (!removeLink) return;
      event.preventDefault();
      this.updateLine(removeLink.dataset.line, 0);
    };

    setBusy(busy) {
      this.toggleAttribute('aria-busy', busy);
    }

    async updateLine(line, quantity) {
      if (!line) return;
      this.setBusy(true);
      const drawerWasOpen = isCartDrawerOpen();
      try {
        const response = await fetch(`${window.Shopify ? window.Shopify.routes.root : '/'}cart/change.js`, {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({
            line: Number(line),
            quantity: Number(quantity),
            sections: getCartSectionIds(),
            sections_url: window.location.pathname
          })
        });
        const cart = await response.json();
        if (!response.ok) throw new Error(cart.description || strings.cartError);
        Object.entries(cart.sections || {}).forEach(([id, html]) => replaceSection(id, html));
        updateCartCounts(cart.item_count);
        if (drawerWasOpen) openCartDrawer();
        document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart } }));
      } catch (error) {
        this.showError(error.message || strings.cartError);
      } finally {
        this.setBusy(false);
      }
    }

    showError(message) {
      const region = document.querySelector('[data-cart-error]');
      if (region) {
        region.textContent = message;
        region.removeAttribute('hidden');
      } else {
        window.alert(message);
      }
    }
  }

  if (!customElements.get('cart-items')) {
    customElements.define('cart-items', CartItems);
  }

  /* ---------------------------------------------------------------- */
  /* Cart note — saved on change                                       */
  /* ---------------------------------------------------------------- */
  document.addEventListener('change', (event) => {
    const note = event.target.closest('[data-cart-note]');
    if (!note) return;
    fetch(`${window.Shopify ? window.Shopify.routes.root : '/'}cart/update.js`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ note: note.value })
    });
  });

  /* ---------------------------------------------------------------- */
  /* <product-form> — AJAX add to cart (product page + quick add)     */
  /* ---------------------------------------------------------------- */
  class ProductForm extends HTMLElement {
    connectedCallback() {
      this.form = this.querySelector('form');
      this.submitButton = this.querySelector('[type="submit"]');
      if (this.form) this.form.addEventListener('submit', this.onSubmit);
    }

    disconnectedCallback() {
      if (this.form) this.form.removeEventListener('submit', this.onSubmit);
    }

    onSubmit = async (event) => {
      // Fall back to a normal POST when there is no drawer to update.
      const drawer = document.querySelector('cart-drawer');
      const onCartPage = window.themeSettings && window.themeSettings.templateName === 'cart';
      if (!drawer && !onCartPage) return;

      event.preventDefault();
      if (this.submitButton && this.submitButton.hasAttribute('aria-disabled')) return;
      this.setBusy(true);
      this.hideError();

      const formData = new FormData(this.form);
      const sectionIds = getCartSectionIds();
      if (drawer) {
        const wrapper = drawer.closest('.shopify-section');
        if (wrapper) sectionIds.push(wrapper.id.replace('shopify-section-', ''));
      }
      formData.append('sections', [...new Set(sectionIds)].join(','));
      formData.append('sections_url', window.location.pathname);

      try {
        const response = await fetch(`${window.Shopify ? window.Shopify.routes.root : '/'}cart/add.js`, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: formData
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.description || strings.cartError);

        Object.entries(result.sections || {}).forEach(([id, html]) => replaceSection(id, html));

        const cartResponse = await fetch(`${window.Shopify ? window.Shopify.routes.root : '/'}cart.js`, {
          headers: jsonHeaders
        });
        const cart = await cartResponse.json();
        updateCartCounts(cart.item_count);
        document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart } }));

        if (drawer) openCartDrawer();
      } catch (error) {
        this.showError(error.message || strings.cartError);
      } finally {
        this.setBusy(false);
      }
    };

    setBusy(busy) {
      if (!this.submitButton) return;
      if (busy) {
        this.submitButton.setAttribute('aria-busy', 'true');
      } else {
        this.submitButton.removeAttribute('aria-busy');
      }
    }

    showError(message) {
      const region = this.querySelector('[data-form-error]');
      if (region) {
        region.textContent = message;
        region.removeAttribute('hidden');
      } else {
        window.alert(message);
      }
    }

    hideError() {
      const region = this.querySelector('[data-form-error]');
      if (region) region.setAttribute('hidden', '');
    }
  }

  if (!customElements.get('product-form')) {
    customElements.define('product-form', ProductForm);
  }
})();
