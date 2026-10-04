/*
 * INeedACISO published prices. This file is the single place to change them.
 *
 * Every element marked data-price="<key>" on the site is filled from this list
 * when the page loads. The pages also carry the current prices as fallback text
 * (for search engines that don't run scripts and visitors with scripts off), so
 * after a price change, ask for the HTML fallbacks to be refreshed too.
 */
(function () {
  var PRICES = {
    // vCISO retainers, per month
    advisory:       '$2,000',
    core:           '$6,500',
    embedded:       '$12,000',
    // Fixed-fee entry offers
    sprint:         '$3,500',   // Deal-Unblock Sprint
    assessment:     '$6,500',   // Readiness Assessment
    implementation: '$30,000'   // Program Implementation (shown as "from")
  };

  var els = document.querySelectorAll('[data-price]');
  for (var i = 0; i < els.length; i++) {
    var key = els[i].getAttribute('data-price');
    if (PRICES[key] && els[i].textContent !== PRICES[key]) els[i].textContent = PRICES[key];
  }
})();
