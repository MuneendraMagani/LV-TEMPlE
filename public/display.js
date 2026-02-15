(function() {
  const API = '/api/pujas';

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months[d.getMonth()] + ' ' + d.getDate();
  }

  function formatDateShort(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[d.getMonth()] + ' ' + d.getDate();
  }

  function sortKey(puja) {
    var d = (puja.startDate || '').replace(/-/g, '');
    var t = (puja.startTime || '').replace(/\D/g, '').slice(0, 4) || '1200';
    return d + t;
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function buildCard(puja, isUpcoming) {
    const title = escapeHtml(puja.title || 'Event');
    const startDate = formatDate(puja.startDate);
    const startDateShort = formatDateShort(puja.startDate);
    const endDate = puja.endDate && puja.endDate !== puja.startDate ? formatDate(puja.endDate) : '';
    const endDateShort = puja.endDate && puja.endDate !== puja.startDate ? formatDateShort(puja.endDate) : '';
    const startTime = puja.startTime || '';
    const endTime = puja.endTime || '';
    let dateText = startDate;
    if (endDate) dateText += ' – ' + endDate;
    var dateShortText = startDateShort;
    if (endDateShort) {
      var endDay = endDateShort.replace(/^[A-Za-z]+\s+/, '');
      dateShortText = startDateShort + '-' + endDay;
    }
    let timeText = startTime;
    if (endTime) timeText += (startTime ? ' – ' : '') + endTime;

    let detailsHtml = '';
    if (puja.details && puja.details.length > 0 && !isUpcoming) {
      detailsHtml = '<div class="puja-card-detail-items">' +
        puja.details.map(function(d) {
          return '<div class="puja-card-detail-item">' +
            '<span class="puja-card-detail-time">' + escapeHtml(d.time || '') + '</span>' +
            '<span>' + escapeHtml(d.name || '') + '</span></div>';
        }).join('') +
        '</div>';
    }

    var cardClass = 'puja-card' + (isUpcoming ? ' puja-card--upcoming' : '');
    var detailsBlock;
    if (isUpcoming) {
      var dateTimeLine = escapeHtml(dateShortText + (timeText ? ' | ' + timeText : ''));
      detailsBlock = '<div class="puja-card-details">' +
        '<div class="puja-card-details-heading">DETAILS</div>' +
        '<div class="puja-card-datetime">' + dateTimeLine + '</div>' +
      '</div>';
    } else {
      detailsBlock = '<div class="puja-card-details">' +
        '<div class="puja-card-details-heading">DETAILS</div>' +
        '<div class="puja-card-date">Date: ' + escapeHtml(dateText) + '</div>' +
        '<div class="puja-card-time">Time: ' + escapeHtml(timeText) + '</div>' +
        detailsHtml +
      '</div>';
    }
    return '<div class="' + cardClass + '">' +
      '<span class="card-corner-bottom-left" aria-hidden="true"></span>' +
      '<span class="card-corner-bottom-right" aria-hidden="true"></span>' +
      '<h2 class="puja-card-title">' + title + '</h2>' +
      detailsBlock +
    '</div>';
  }

  function renderPujas(pujas) {
    const container = document.getElementById('pujaCards');
    if (!container) return;

    if (!pujas || pujas.length === 0) {
      container.className = 'puja-cards no-events';
      container.innerHTML = '<div class="puja-card-placeholder">No upcoming pujas</div>';
      return;
    }

    var sorted = pujas.slice().sort(function(a, b) { return sortKey(a).localeCompare(sortKey(b)); });
    var first = sorted[0];
    var rest = sorted.slice(1);

    var html = '<div class="puja-featured">' + buildCard(first) + '</div>';
    if (rest.length > 0) {
      html += '<h2 class="upcoming-events-title">Upcoming Events</h2>';
      html += '<div class="puja-upcoming-wrap"><div class="puja-upcoming-track"><div class="puja-upcoming">' + rest.map(function(p) { return buildCard(p, true); }).join('') + '</div></div></div>';
    }

    container.className = 'puja-cards';
    container.innerHTML = html;

    if (rest.length > 0) startUpcomingSlider(rest.length);
  }

  var upcomingSliderTimer = null;
  function startUpcomingSlider(numCards) {
    if (numCards <= 0) return;
    var wrap = document.querySelector('.puja-upcoming-wrap');
    var track = document.querySelector('.puja-upcoming-track');
    var inner = document.querySelector('.puja-upcoming');
    if (!wrap || !track || !inner) return;

    var numSlides = Math.ceil(numCards / 2);
    if (numSlides <= 1) return;

    var CARD_WIDTH = 280;
    var GAP = 16;
    var SLIDE_WIDTH = 2 * CARD_WIDTH + GAP;

    var currentSlide = 0;
    function goToSlide(index, useTransition) {
      currentSlide = index;
      inner.style.transition = useTransition ? 'transform 0.5s ease-in-out' : 'none';
      inner.style.transform = 'translateX(-' + (index * SLIDE_WIDTH) + 'px)';
    }
    function nextSlide() {
      if (currentSlide < numSlides - 1) {
        goToSlide(currentSlide + 1, true);
      } else {
        goToSlide(0, false);
      }
      upcomingSliderTimer = setTimeout(nextSlide, 5000);
    }

    if (upcomingSliderTimer) clearTimeout(upcomingSliderTimer);
    goToSlide(0, false);
    upcomingSliderTimer = setTimeout(nextSlide, 5000);
  }

  function loadPujas() {
    fetch(API)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        const pujas = (data.pujas || []).filter(function(p) { return p.isActive !== false; });
        renderPujas(pujas);
      })
      .catch(function() {
        renderPujas([]);
      });
  }

  loadPujas();
  setInterval(loadPujas, 60000);
})();
