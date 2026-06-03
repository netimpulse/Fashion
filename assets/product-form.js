(function () {
  "use strict";

  const moneyFormat = (window.Shopify && window.Shopify.money_format) || "${{amount}}";

  function formatMoney(cents, format) {
    if (typeof cents === "string") cents = cents.replace(".", "");
    const value = (cents / 100).toFixed(2);
    const fmt = format || moneyFormat;
    return fmt.replace(/\{\{\s*(\w+)\s*\}\}/g, function (_m, key) {
      if (key === "amount") return value;
      if (key === "amount_no_decimals") return Math.round(cents / 100).toString();
      if (key === "amount_with_comma_separator") return value.replace(".", ",");
      if (key === "amount_no_decimals_with_comma_separator") {
        return Math.round(cents / 100).toString();
      }
      return value;
    });
  }

  function init(root) {
    if (!root || root.__pdpInit) return;
    root.__pdpInit = true;

    const form = root.querySelector("form[action*='/cart/add']");
    const variantInput = root.querySelector("[data-variant-id-input]");
    const variantsScript = root.querySelector("[data-variants-json]");
    const priceWrap = root.querySelector("[data-price-wrap]");
    const currentPriceEl = root.querySelector("[data-current-price]");
    const compareAtEl = root.querySelector("[data-compare-at]");
    const atcBtn = root.querySelector("[data-atc]");
    const atcLabel = root.querySelector("[data-atc-label]");
    const feedback = root.querySelector("[data-form-feedback]");
    const stage = root.querySelector("[data-media-stage]");
    const thumbBtns = root.querySelectorAll("[data-thumb]");
    const wishlistBtn = root.querySelector("[data-wishlist]");

    let variants = [];
    if (variantsScript) {
      try { variants = JSON.parse(variantsScript.textContent); } catch (_e) { variants = []; }
    }

    /* -------- Gallery -------- */
    function activateMedia(targetId, targetIndex) {
      if (!stage) return;
      const figures = stage.querySelectorAll("[data-media-id]");
      figures.forEach((fig) => {
        const matches = (targetId != null && String(fig.dataset.mediaId) === String(targetId)) ||
          (targetIndex != null && String(fig.dataset.mediaIndex) === String(targetIndex));
        if (matches) {
          fig.removeAttribute("hidden");
          fig.classList.add("is-active");
        } else {
          fig.setAttribute("hidden", "");
          fig.classList.remove("is-active");
        }
      });
      thumbBtns.forEach((btn) => {
        const matches = (targetId != null && String(btn.dataset.targetId) === String(targetId)) ||
          (targetIndex != null && String(btn.dataset.targetIndex) === String(targetIndex));
        btn.classList.toggle("is-active", matches);
        btn.setAttribute("aria-selected", matches ? "true" : "false");
      });
    }

    thumbBtns.forEach((btn) => {
      btn.addEventListener("click", function () {
        activateMedia(btn.dataset.targetId, btn.dataset.targetIndex);
      });
    });

    /* -------- Variant Picker -------- */
    function getSelectedOptions() {
      const fieldsets = root.querySelectorAll("[data-option-fieldset]");
      const values = [];
      fieldsets.forEach((fs) => {
        const idx = parseInt(fs.dataset.optionIndex, 10);
        const checked = fs.querySelector("[data-option-input]:checked");
        if (checked) values[idx] = checked.value;
      });
      return values;
    }

    function findVariantByOptions(opts) {
      if (!variants || !variants.length) return null;
      return variants.find((v) => {
        const vOpts = [v.option1, v.option2, v.option3];
        return opts.every((val, i) => vOpts[i] === val);
      }) || null;
    }

    function updateAvailability(currentOpts) {
      const fieldsets = root.querySelectorAll("[data-option-fieldset]");
      fieldsets.forEach((fs) => {
        const idx = parseInt(fs.dataset.optionIndex, 10);
        const inputs = fs.querySelectorAll("[data-option-input]");
        inputs.forEach((input) => {
          const testOpts = currentOpts.slice();
          testOpts[idx] = input.value;
          const match = variants.find((v) => {
            const vOpts = [v.option1, v.option2, v.option3];
            return testOpts.every((val, i) => vOpts[i] === val || val == null);
          });
          input.disabled = match ? !match.available : true;
        });
      });
    }

    function updateSelectedLabels() {
      const fieldsets = root.querySelectorAll("[data-option-fieldset]");
      fieldsets.forEach((fs) => {
        const checked = fs.querySelector("[data-option-input]:checked");
        const lbl = fs.querySelector("[data-selected-label]");
        if (checked && lbl) lbl.textContent = checked.value;
      });
    }

    function updatePrice(variant) {
      if (!variant || !currentPriceEl) return;
      currentPriceEl.textContent = formatMoney(variant.price);
      const hasCompare = variant.compare_at_price && variant.compare_at_price > variant.price;
      if (compareAtEl) {
        if (hasCompare) {
          compareAtEl.textContent = formatMoney(variant.compare_at_price);
          compareAtEl.hidden = false;
          currentPriceEl.classList.add("is-sale");
        } else {
          compareAtEl.hidden = true;
          currentPriceEl.classList.remove("is-sale");
        }
      } else if (hasCompare && priceWrap) {
        const span = document.createElement("span");
        span.className = "pdp__price-compare";
        span.setAttribute("data-compare-at", "");
        span.textContent = formatMoney(variant.compare_at_price);
        priceWrap.appendChild(span);
        currentPriceEl.classList.add("is-sale");
      } else {
        currentPriceEl.classList.remove("is-sale");
      }
    }

    function updateAtcState(variant) {
      if (!atcBtn || !atcLabel) return;
      if (!variant) {
        atcBtn.disabled = true;
        atcLabel.textContent = atcBtn.dataset.unavailableLabel || "Unavailable";
        return;
      }
      if (!variant.available) {
        atcBtn.disabled = true;
        atcLabel.textContent = atcBtn.dataset.soldoutLabel || "Sold out";
      } else {
        atcBtn.disabled = false;
        atcLabel.textContent = atcBtn.dataset.addLabel || atcLabel.textContent;
      }
    }

    function updateUrl(variant) {
      if (!variant || !history.replaceState) return;
      const url = new URL(window.location.href);
      url.searchParams.set("variant", variant.id);
      history.replaceState({}, "", url.toString());
    }

    function onOptionChange() {
      const opts = getSelectedOptions();
      const variant = findVariantByOptions(opts);

      updateSelectedLabels();
      updateAvailability(opts);

      if (!variant) {
        if (variantInput) variantInput.value = "";
        updateAtcState(null);
        return;
      }

      if (variantInput) variantInput.value = variant.id;
      updatePrice(variant);
      updateAtcState(variant);
      updateUrl(variant);

      if (variant.featured_media) {
        activateMedia(variant.featured_media.id, null);
      }
    }

    /* Capture original ATC labels for state transitions */
    if (atcBtn && atcLabel) {
      atcBtn.dataset.addLabel = (root.dataset.addLabel || atcLabel.textContent || "Add to cart").trim();
      atcBtn.dataset.soldoutLabel = (root.dataset.soldoutLabel || "Sold out").trim();
      atcBtn.dataset.unavailableLabel = (root.dataset.unavailableLabel || "Unavailable").trim();
    }

    root.querySelectorAll("[data-option-input]").forEach((input) => {
      input.addEventListener("change", onOptionChange);
    });

    /* Initial sync */
    if (variants.length) {
      const initOpts = getSelectedOptions();
      updateAvailability(initOpts);
    }

    /* -------- Quantity stepper -------- */
    const qtyInput = root.querySelector("[data-qty-input]");
    const qtyMinus = root.querySelector("[data-qty-minus]");
    const qtyPlus = root.querySelector("[data-qty-plus]");

    function clampQty() {
      if (!qtyInput) return;
      let v = parseInt(qtyInput.value, 10);
      if (isNaN(v) || v < 1) v = 1;
      qtyInput.value = v;
    }

    if (qtyMinus) {
      qtyMinus.addEventListener("click", function () {
        if (!qtyInput) return;
        qtyInput.value = Math.max(1, (parseInt(qtyInput.value, 10) || 1) - 1);
        qtyInput.dispatchEvent(new Event("change", { bubbles: true }));
      });
    }
    if (qtyPlus) {
      qtyPlus.addEventListener("click", function () {
        if (!qtyInput) return;
        qtyInput.value = (parseInt(qtyInput.value, 10) || 1) + 1;
        qtyInput.dispatchEvent(new Event("change", { bubbles: true }));
      });
    }
    if (qtyInput) qtyInput.addEventListener("blur", clampQty);

    /* -------- AJAX Add to Cart -------- */
    function setFeedback(state, text) {
      if (!feedback) return;
      feedback.setAttribute("data-state", state || "");
      feedback.textContent = text || "";
    }

    function setLoading(loading) {
      if (!atcBtn) return;
      atcBtn.dataset.loading = loading ? "true" : "false";
      const spinner = atcBtn.querySelector("[data-atc-spinner]");
      if (spinner) {
        if (loading) spinner.removeAttribute("hidden");
        else spinner.setAttribute("hidden", "");
      }
      atcBtn.disabled = !!loading;
    }

    if (form) {
      form.addEventListener("submit", async function (e) {
        e.preventDefault();
        clampQty();
        setLoading(true);
        setFeedback("", "");

        const fd = new FormData(form);
        try {
          const res = await fetch("/cart/add.js", {
            method: "POST",
            headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
            body: fd,
          });
          const data = await res.json();

          if (!res.ok) {
            const msg = (data && (data.description || data.message)) || "Could not add to cart.";
            setFeedback("error", msg);
            setLoading(false);
            return;
          }

          /* Get updated cart count */
          const cartRes = await fetch("/cart.js", {
            headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
          });
          const cart = await cartRes.json();

          setFeedback("success", root.dataset.addedLabel || "Added to cart");

          document.dispatchEvent(new CustomEvent("cart:updated", { detail: { cart: cart, added: data } }));

          /* Update header cart count if present */
          const cartCountEl = document.querySelector("header [data-cart-count], header a[href*='cart'] sup");
          if (cartCountEl) {
            cartCountEl.textContent = cart.item_count;
          } else {
            const headerCartLink = document.querySelector("header a[href*='cart']");
            if (headerCartLink && cart.item_count > 0 && !headerCartLink.querySelector("sup")) {
              const sup = document.createElement("sup");
              sup.textContent = cart.item_count;
              headerCartLink.insertBefore(sup, headerCartLink.firstChild);
            }
          }
        } catch (err) {
          setFeedback("error", "Network error. Please try again.");
        } finally {
          setLoading(false);
        }
      });
    }

    /* -------- Wishlist (local-only persistence) -------- */
    if (wishlistBtn) {
      const productId = root.dataset.productId;
      const key = "pdp:wishlist";
      function getList() {
        try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch (_) { return []; }
      }
      function setList(list) {
        try { localStorage.setItem(key, JSON.stringify(list)); } catch (_) {}
      }
      const list = getList();
      if (productId && list.indexOf(productId) !== -1) {
        wishlistBtn.setAttribute("aria-pressed", "true");
      }
      wishlistBtn.addEventListener("click", function () {
        if (!productId) return;
        let current = getList();
        const idx = current.indexOf(productId);
        if (idx === -1) {
          current.push(productId);
          wishlistBtn.setAttribute("aria-pressed", "true");
        } else {
          current.splice(idx, 1);
          wishlistBtn.setAttribute("aria-pressed", "false");
        }
        setList(current);
      });
    }
  }

  function initAll() {
    document.querySelectorAll("[data-pdp]").forEach(init);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }

  /* Theme editor: re-init on section reload */
  document.addEventListener("shopify:section:load", function (e) {
    e.target.querySelectorAll("[data-pdp]").forEach(init);
  });
})();
