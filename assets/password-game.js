/**
 * Password page mini game — an endless "runner" shown while the store is locked.
 *
 * Progressive enhancement: the markup works without JS (static canvas + sign-up
 * form). This script turns the <password-game> element into a playable game and
 * keeps a personal best score in localStorage.
 *
 * Data attributes (set from the section settings):
 *   data-player       — emoji used for the runner            (default 🛍️)
 *   data-obstacles    — comma separated emoji for obstacles  (default 👗,👠,…)
 *   data-storage-key  — localStorage key for the high score
 *
 * NOTE (future): score submission to a leaderboard backend is not wired up yet.
 * When the backend exists, send { email, score } in gameOver() and read the
 * ranking into a leaderboard element. See CLAUDE.md → "Passwortseiten-Spiel".
 */
(function () {
  if (window.customElements && customElements.get('password-game')) return;

  class PasswordGame extends HTMLElement {
    connectedCallback() {
      this.canvas = this.querySelector('[data-game-canvas]');
      if (!this.canvas || !this.canvas.getContext) return;
      this.ctx = this.canvas.getContext('2d');

      this.scoreEl = this.querySelector('[data-game-score]');
      this.bestEl = this.querySelector('[data-game-best]');
      this.overlay = this.querySelector('[data-game-overlay]');
      this.overlayTitle = this.querySelector('[data-game-overlay-title]');
      this.overlayText = this.querySelector('[data-game-overlay-text]');
      this.startBtn = this.querySelector('[data-game-start]');

      this.playerGlyph = (this.dataset.player || '🛍️').trim() || '🛍️';
      this.obstacleGlyphs = (this.dataset.obstacles || '👗,👠,🧥,👜,🕶️')
        .split(',')
        .map(function (s) { return s.trim(); })
        .filter(Boolean);
      if (!this.obstacleGlyphs.length) this.obstacleGlyphs = ['📦'];

      this.storageKey = this.dataset.storageKey || 'fashion-runner-highscore';
      this.best = this.readBest();
      if (this.bestEl) this.bestEl.textContent = this.best;

      this.emojiFont =
        '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif';
      this.fg = this.readColor();

      this.state = 'idle';
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);

      this._onResize = this.resize.bind(this);
      this._onKey = this.onKey.bind(this);
      this._onPointer = this.onPointer.bind(this);
      this._loop = this.loop.bind(this);
      this._onStart = this.start.bind(this);

      window.addEventListener('resize', this._onResize);
      document.addEventListener('keydown', this._onKey);
      this.canvas.addEventListener('pointerdown', this._onPointer);
      if (this.startBtn) this.startBtn.addEventListener('click', this._onStart);

      this.resize();
      this.reset();
      this.showOverlay('idle');
      this.draw();
    }

    disconnectedCallback() {
      window.removeEventListener('resize', this._onResize);
      document.removeEventListener('keydown', this._onKey);
      if (this.raf) cancelAnimationFrame(this.raf);
      this.state = 'idle';
    }

    readBest() {
      try {
        return parseInt(window.localStorage.getItem(this.storageKey) || '0', 10) || 0;
      } catch (e) {
        return 0;
      }
    }

    saveBest(value) {
      try {
        window.localStorage.setItem(this.storageKey, String(value));
      } catch (e) {
        /* storage blocked — keep the score in memory only */
      }
    }

    readColor() {
      try {
        var c = getComputedStyle(this.canvas).color;
        return c && c !== 'rgba(0, 0, 0, 0)' ? c : '#111111';
      } catch (e) {
        return '#111111';
      }
    }

    resize() {
      var w = this.canvas.clientWidth || (this.canvas.parentElement && this.canvas.parentElement.clientWidth) || 600;
      var h = this.canvas.clientHeight || 220;
      this.cssW = w;
      this.cssH = h;
      this.canvas.width = Math.round(w * this.dpr);
      this.canvas.height = Math.round(h * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.groundY = h - 26;
      if (this.player) this.player.y = Math.min(this.player.y, this.groundY);
      if (this.state !== 'running') this.draw();
    }

    reset() {
      this.score = 0;
      this.baseSpeed = Math.max(4, this.cssW / 130);
      this.speed = this.baseSpeed;
      this.gravity = 0.7;
      this.player = { x: 52, y: this.groundY, vy: 0, size: 30, onGround: true };
      this.obstacles = [];
      this.spawnTimer = 40;
      this.elapsed = 0;
      this.updateScore();
    }

    start() {
      if (this.state === 'running') return;
      this.reset();
      this.state = 'running';
      this.hideOverlay();
      this.last = performance.now();
      this.raf = requestAnimationFrame(this._loop);
    }

    isVisible() {
      if (this.offsetParent === null) return false;
      var r = this.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      return r.bottom > 0 && r.top < vh;
    }

    onKey(e) {
      var t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW' || e.key === ' ') {
        if (!this.isVisible()) return;
        e.preventDefault();
        this.action();
      }
    }

    onPointer(e) {
      e.preventDefault();
      this.action();
    }

    action() {
      if (this.state === 'idle' || this.state === 'over') {
        this.start();
        return;
      }
      this.jump();
    }

    jump() {
      if (this.player.onGround) {
        this.player.vy = -12;
        this.player.onGround = false;
      }
    }

    loop(now) {
      var dt = Math.min((now - this.last) / 16.67, 2.5);
      this.last = now;
      this.update(dt);
      this.draw();
      if (this.state === 'running') this.raf = requestAnimationFrame(this._loop);
    }

    rand(min, max) {
      return Math.random() * (max - min) + min;
    }

    pick(arr) {
      return arr[Math.floor(Math.random() * arr.length)];
    }

    update(dt) {
      this.elapsed += dt;
      this.speed = this.baseSpeed + this.elapsed * 0.0022 * this.baseSpeed;

      var p = this.player;
      p.vy += this.gravity * dt;
      p.y += p.vy * dt;
      if (p.y >= this.groundY) {
        p.y = this.groundY;
        p.vy = 0;
        p.onGround = true;
      }

      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        var ratio = this.speed / this.baseSpeed;
        this.spawnTimer = this.rand(58, 104) / ratio;
        this.obstacles.push({
          x: this.cssW + 24,
          size: this.rand(22, 34),
          glyph: this.pick(this.obstacleGlyphs)
        });
      }

      for (var i = this.obstacles.length - 1; i >= 0; i--) {
        var o = this.obstacles[i];
        o.x -= this.speed * dt;
        if (this.hit(p, o)) {
          this.gameOver();
          return;
        }
        if (o.x + o.size < -20) this.obstacles.splice(i, 1);
      }

      this.score += dt * 0.5;
      this.updateScore();
    }

    hit(p, o) {
      var pl = p.x - p.size * 0.28;
      var pr = p.x + p.size * 0.28;
      var pt = p.y - p.size * 0.78;
      var pb = p.y;
      var ol = o.x - o.size * 0.28;
      var or = o.x + o.size * 0.28;
      var ot = this.groundY - o.size * 0.78;
      var ob = this.groundY;
      return pr > ol && pl < or && pb > ot && pt < ob;
    }

    draw() {
      var ctx = this.ctx;
      ctx.clearRect(0, 0, this.cssW, this.cssH);

      // ground line
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = this.fg;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, this.groundY + 3);
      ctx.lineTo(this.cssW, this.groundY + 3);
      ctx.stroke();
      ctx.restore();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';

      // obstacles
      for (var i = 0; i < this.obstacles.length; i++) {
        var o = this.obstacles[i];
        ctx.font = o.size + 'px ' + this.emojiFont;
        ctx.fillText(o.glyph, o.x, this.groundY);
      }

      // player
      var p = this.player;
      ctx.font = p.size + 'px ' + this.emojiFont;
      ctx.fillText(this.playerGlyph, p.x, p.y);
    }

    updateScore() {
      if (this.scoreEl) this.scoreEl.textContent = Math.floor(this.score);
    }

    gameOver() {
      if (this.raf) cancelAnimationFrame(this.raf);
      this.state = 'over';
      var final = Math.floor(this.score);
      var isBest = final > this.best;
      if (isBest) {
        this.best = final;
        this.saveBest(final);
        if (this.bestEl) this.bestEl.textContent = this.best;
      }
      this.showOverlay('over', final, isBest);
      this.dispatchEvent(
        new CustomEvent('game:over', { bubbles: true, detail: { score: final, best: this.best } })
      );
    }

    showOverlay(mode, score, isBest) {
      if (!this.overlay) return;
      this.overlay.hidden = false;
      var labels = this.overlay.dataset;
      if (mode === 'idle') {
        if (this.overlayTitle) this.overlayTitle.textContent = labels.idleTitle || 'Ready?';
        if (this.overlayText) this.overlayText.textContent = labels.idleText || 'Tap or press space to play';
        if (this.startBtn) this.startBtn.textContent = labels.idleBtn || 'Play';
      } else {
        var title = isBest ? labels.bestTitle || 'New best!' : labels.overTitle || 'Game over';
        if (this.overlayTitle) this.overlayTitle.textContent = title;
        if (this.overlayText) {
          var tmpl = labels.overText || 'Score: %score%';
          this.overlayText.textContent = tmpl.replace('%score%', score);
        }
        if (this.startBtn) this.startBtn.textContent = labels.overBtn || 'Play again';
      }
    }

    hideOverlay() {
      if (this.overlay) this.overlay.hidden = true;
    }
  }

  customElements.define('password-game', PasswordGame);
})();
