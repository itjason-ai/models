/* INeedACISO booking + engagement signals for Google Tag Manager.
 * Loaded on every page with a booking calendar (<div id="cal">). No vendor tags
 * fire from here; GTM decides what to do with each event.
 *
 *  Client pages (default):
 *   booking_started   : a "Book" button or Calendly link was clicked (cta_label, page_path, lead_*)
 *   booking_completed : a booking finished inside the embedded calendar. booked.html sends the
 *                       same event after Calendly's redirect; a shared localStorage record stops
 *                       one booking counting twice.
 *  Partner page (#cal data-kind="partner"):
 *   partner_booking_started / partner_inquiry : same moments, kept separate from client conversions.
 *  All pages:
 *   email_click       : a mailto: link was clicked
 *
 * Campaign tags are remembered for 30 days and passed to Calendly, so a booking carries its
 * source even if the visitor changed pages first.
 */
window.dataLayer = window.dataLayer || [];
(function(){
  // The calendar on each page is configured on its #cal element:
  //   data-cal  : Calendly event URL (default: the 30-minute discovery call)
  //   data-kind : "client" (default) or "partner". Partner bookings send their
  //               own events so they never count as client conversions.
  var CAL_DEFAULT = 'https://calendly.com/it-jason/30min';
  // Loaded with defer, so the page body (and #cal) exists by the time this runs.
  var calEl = document.getElementById('cal');
  var CAL_URL = (calEl && calEl.getAttribute('data-cal')) || CAL_DEFAULT;
  var PARTNER = !!(calEl && calEl.getAttribute('data-kind') === 'partner');
  var KEY = PARTNER ? 'iac_partner_booking' : 'iac_booking', WINDOW_MS = 15 * 60 * 1000, started = false;

  var SRC_KEY = 'iac_source', SRC_TTL = 30 * 24 * 60 * 60 * 1000;
  function readSource(){
    var o = {}, any = false, stored = null;
    try {
      var q = new URLSearchParams(location.search);
      ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].forEach(function(k){
        if (q.get(k)) { o[k] = q.get(k); any = true; }
      });
      if (!o.utm_source && q.get('gclid')) { o.utm_source = 'google'; o.utm_medium = 'cpc'; any = true; }
      if (!any && document.referrer) {
        var host = new URL(document.referrer).hostname.replace(/^www\./, '');
        if (host && host !== location.hostname.replace(/^www\./, '') && !/(^|\.)(calendly|payhip)\.com$/.test(host)) {
          o.utm_source = host;
          o.utm_medium = /(^|\.)(google|bing|duckduckgo|yahoo|ecosia|brave)\./.test(host + '.') ? 'organic' : 'referral';
          any = true;
        }
      }
      if (any) { o.t = Date.now(); localStorage.setItem(SRC_KEY, JSON.stringify(o)); return o; }
      stored = JSON.parse(localStorage.getItem(SRC_KEY));
      if (stored && Date.now() - stored.t > SRC_TTL) stored = null;
    } catch(err){}
    return stored || {};
  }
  var SRC = readSource();
  function withLead(o){
    o.lead_source = SRC.utm_source || '(direct)';
    o.lead_medium = SRC.utm_medium || '(none)';
    o.lead_campaign = SRC.utm_campaign || '(none)';
    return o;
  }

  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a[href*="calendly.com"], a[href$="#book"], a[href^="mailto:"]');
    if (!a) return;
    if (a.getAttribute('href').indexOf('mailto:') === 0) {
      dataLayer.push(withLead({ event: 'email_click', link_url: a.href, page_path: location.pathname }));
      return;
    }
    var label = (a.getAttribute('data-cta') || a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    dataLayer.push(withLead({ event: PARTNER ? 'partner_booking_started' : 'booking_started', booking_type: PARTNER ? 'partner' : 'client', cta_label: label, page_path: location.pathname, link_url: a.href }));
    loadCalendly();
  });

  function calendlyUtm(){
    var map = {utm_source:'utmSource', utm_medium:'utmMedium', utm_campaign:'utmCampaign', utm_content:'utmContent', utm_term:'utmTerm'}, o = {};
    for (var k in map) { if (SRC[k]) o[map[k]] = SRC[k]; }
    return o;
  }

  function fail(box){
    box.style.height = 'auto';
    box.innerHTML = '<p class="cal-wait">The calendar didn\'t load. <a href="' + CAL_URL + '" target="_blank" rel="noopener">Open it in a new tab</a> or email <a href="mailto:jason@ineedaciso.com?subject=' + (PARTNER ? 'Partner%20introduction' : 'Discovery%20call') + '">jason@ineedaciso.com</a>.</p>';
  }

  function loadCalendly(){
    var box = document.getElementById('cal');
    if (started || !box) return;
    started = true;
    var s = document.createElement('script');
    s.src = 'https://assets.calendly.com/assets/external/widget.js';
    s.async = true;
    s.onload = function(){
      if (!window.Calendly) { fail(box); return; }
      box.innerHTML = '';
      Calendly.initInlineWidget({
        url: CAL_URL + '?hide_gdpr_banner=1&primary_color=2d7dd2',
        parentElement: box,
        utm: calendlyUtm()
      });
    };
    s.onerror = function(){ fail(box); };
    document.head.appendChild(s);
  }

  function recordBooking(id){
    var now = Date.now(), prev = null;
    try { prev = JSON.parse(localStorage.getItem(KEY)); } catch(err){}
    if (prev && ((id && prev.id === id) || (!id && now - prev.t < WINDOW_MS))) {
      dataLayer.push({ event: PARTNER ? 'partner_duplicate' : 'booking_duplicate' });
      return;
    }
    id = id || ('bk-' + now + '-' + Math.random().toString(36).slice(2, 8));
    try { localStorage.setItem(KEY, JSON.stringify({ id: id, t: now })); } catch(err){}
    if (PARTNER) {
      dataLayer.push(withLead({ event: 'partner_inquiry', booking_type: 'partner', transaction_id: id, booking_source: 'embed', page_path: location.pathname }));
      return;
    }
    dataLayer.push(withLead({ event: 'booking_completed', booking_type: 'client', value: 500.0, currency: 'USD', transaction_id: id, booking_source: 'embed', page_path: location.pathname }));
  }

  window.addEventListener('message', function(e){
    if (!/^https:\/\/([a-z0-9-]+\.)*calendly\.com$/.test(e.origin)) return;
    var d = e.data;
    if (!d || typeof d !== 'object' || d.event !== 'calendly.event_scheduled') return;
    var id = null;
    try { id = d.payload.invitee.uri.split('/').pop() || null; } catch(err){}
    recordBooking(id);
  });

  document.addEventListener('DOMContentLoaded', function(){
    var box = document.getElementById('cal');
    if (!box) return;
    if (location.hash === '#book') { loadCalendly(); return; }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function(entries){
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) { io.disconnect(); loadCalendly(); return; }
        }
      }, { rootMargin: '800px 0px' });
      io.observe(box);
    } else {
      window.addEventListener('load', loadCalendly);
    }
  });
})();
