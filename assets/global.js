/* Statik global helpers — kept intentionally small. */
(() => {
  'use strict';

  /* ---------------------------------------------------------------- */
  /* <quantity-input> — +/- stepper around a number input             */
  /* ---------------------------------------------------------------- */
  class QuantityInput extends HTMLElement {
    connectedCallback() {
      this.input = this.querySelector('input');
      this.addEventListener('click', this.onClick);
    }

    disconnectedCallback() {
      this.removeEventListener('click', this.onClick);
    }

    onClick = (event) => {
      const button = event.target.closest('button[name="plus"], button[name="minus"]');
      if (!button || !this.input) return;
      event.preventDefault();
      const previous = this.input.value;
      if (button.name === 'plus') {
        this.input.stepUp();
      } else {
        this.input.stepDown();
      }
      if (previous !== this.input.value) {
        this.input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    };
  }

  if (!customElements.get('quantity-input')) {
    customElements.define('quantity-input', QuantityInput);
  }

  /* ---------------------------------------------------------------- */
  /* <details-disclosure> — closes on Escape and outside click        */
  /* ---------------------------------------------------------------- */
  class DetailsDisclosure extends HTMLElement {
    connectedCallback() {
      this.details = this.querySelector('details');
      document.addEventListener('click', this.onDocumentClick);
      this.addEventListener('keyup', this.onKeyUp);
    }

    disconnectedCallback() {
      document.removeEventListener('click', this.onDocumentClick);
      this.removeEventListener('keyup', this.onKeyUp);
    }

    onDocumentClick = (event) => {
      if (!this.details || !this.details.open) return;
      if (!this.contains(event.target)) this.details.removeAttribute('open');
    };

    onKeyUp = (event) => {
      if (event.key !== 'Escape' || !this.details || !this.details.open) return;
      this.details.removeAttribute('open');
      const summary = this.details.querySelector('summary');
      if (summary) summary.focus();
    };
  }

  if (!customElements.get('details-disclosure')) {
    customElements.define('details-disclosure', DetailsDisclosure);
  }

  /* ---------------------------------------------------------------- */
  /* Scroll reveal — opt-in via body.anim-reveal + [data-reveal]      */
  /* ---------------------------------------------------------------- */
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const initReveal = () => {
    if (!document.body.classList.contains('anim-reveal') || reduceMotion.matches) return;
    const targets = document.querySelectorAll('[data-reveal]:not(.is-revealed)');
    if (!targets.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px' }
    );
    targets.forEach((el) => observer.observe(el));
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReveal);
  } else {
    initReveal();
  }
  document.addEventListener('shopify:section:load', initReveal);

  /* ---------------------------------------------------------------- */
  /* <localization-form> — submit on select change                    */
  /* ---------------------------------------------------------------- */
  class LocalizationForm extends HTMLElement {
    connectedCallback() {
      this.addEventListener('change', this.onChange);
    }

    disconnectedCallback() {
      this.removeEventListener('change', this.onChange);
    }

    onChange = (event) => {
      const select = event.target.closest('select');
      if (!select) return;
      const form = this.querySelector('form');
      if (form) form.submit();
    };
  }

  if (!customElements.get('localization-form')) {
    customElements.define('localization-form', LocalizationForm);
  }
})();
