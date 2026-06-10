/* <count-down> — drop countdown timer. */
(() => {
  'use strict';

  class CountDown extends HTMLElement {
    connectedCallback() {
      this.deadline = new Date(this.dataset.deadline);
      this.units = this.querySelector('[data-countdown-units]');
      this.finishedEl = this.querySelector('[data-countdown-finished]');
      this.els = {
        days: this.querySelector('[data-cd-days]'),
        hours: this.querySelector('[data-cd-hours]'),
        minutes: this.querySelector('[data-cd-minutes]'),
        seconds: this.querySelector('[data-cd-seconds]')
      };
      if (Number.isNaN(this.deadline.getTime())) return;
      this.tick();
      this.interval = setInterval(() => this.tick(), 1000);
    }

    disconnectedCallback() {
      if (this.interval) clearInterval(this.interval);
    }

    tick() {
      const diff = this.deadline.getTime() - Date.now();
      if (diff <= 0) {
        this.finish();
        return;
      }
      const seconds = Math.floor(diff / 1000);
      const pad = (n) => String(n).padStart(2, '0');
      if (this.els.days) this.els.days.textContent = pad(Math.floor(seconds / 86400));
      if (this.els.hours) this.els.hours.textContent = pad(Math.floor((seconds % 86400) / 3600));
      if (this.els.minutes) this.els.minutes.textContent = pad(Math.floor((seconds % 3600) / 60));
      if (this.els.seconds) this.els.seconds.textContent = pad(seconds % 60);
    }

    finish() {
      if (this.interval) clearInterval(this.interval);
      if (this.dataset.finishedBehavior === 'hide') {
        const wrapper = this.closest('.countdown');
        if (wrapper) wrapper.setAttribute('hidden', '');
        return;
      }
      if (this.units) this.units.setAttribute('hidden', '');
      if (this.finishedEl && this.finishedEl.textContent.trim().length) {
        this.finishedEl.removeAttribute('hidden');
      }
    }
  }

  if (!customElements.get('count-down')) {
    customElements.define('count-down', CountDown);
  }
})();
