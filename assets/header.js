/* Header: mobile drawer dialog. */
(() => {
  'use strict';

  class HeaderDrawer extends HTMLElement {
    connectedCallback() {
      this.dialog = this.querySelector('dialog');
      this.addEventListener('click', this.onClick);
    }

    disconnectedCallback() {
      this.removeEventListener('click', this.onClick);
    }

    onClick = (event) => {
      if (event.target.closest('[data-drawer-open]')) {
        event.preventDefault();
        if (this.dialog && !this.dialog.open) this.dialog.showModal();
        return;
      }
      if (event.target.closest('[data-drawer-close]')) {
        event.preventDefault();
        if (this.dialog && this.dialog.open) this.dialog.close();
        return;
      }
      // Backdrop click
      if (event.target === this.dialog) this.dialog.close();
      // Close when a nav link inside is followed
      if (event.target.closest('a[href]') && this.dialog && this.dialog.open) this.dialog.close();
    };
  }

  if (!customElements.get('header-drawer')) {
    customElements.define('header-drawer', HeaderDrawer);
  }
})();
