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

  function hasEventEnded(puja) {
    const now = new Date();
    
    // Use endDate if available, otherwise use startDate
    const eventDate = puja.endDate || puja.startDate;
    if (!eventDate) return false;
    
    // Use endTime if available, otherwise use startTime
    const eventTime = puja.endTime || puja.startTime || '23:59';
    
    // Parse the date (YYYY-MM-DD format)
    const [year, month, day] = eventDate.split('-').map(Number);
    
    // Parse the time (various formats: "6:30 pm", "6:30pm", "18:30")
    let hours = 0, minutes = 0;
    const timeStr = eventTime.toLowerCase().trim();
    
    if (timeStr.includes('am') || timeStr.includes('pm')) {
      const isPM = timeStr.includes('pm');
      const timeMatch = timeStr.match(/(\d+):?(\d*)/);
      if (timeMatch) {
        hours = parseInt(timeMatch[1]);
        minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        if (isPM && hours !== 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;
      }
    } else {
      // 24-hour format
      const timeMatch = timeStr.match(/(\d+):?(\d*)/);
      if (timeMatch) {
        hours = parseInt(timeMatch[1]);
        minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      }
    }
    
    const eventDateTime = new Date(year, month - 1, day, hours, minutes);
    return now > eventDateTime;
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
        '<div class="puja-card-date"><strong>Date:</strong><span>' + escapeHtml(dateText) + '</span></div>' +
        '<div class="puja-card-time"><strong>Time:</strong><span>' + escapeHtml(timeText) + '</span></div>' +
        detailsHtml +
      '</div>';
    }
    return '<div class="' + cardClass + '">' +
      '<span class="card-corner-top-left" aria-hidden="true"></span>' +
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

    function getSlideWidth() { return track.offsetWidth || 0; }
    var currentSlide = 0;
    function goToSlide(index, useTransition) {
      currentSlide = index;
      var slideWidth = getSlideWidth();
      inner.style.transition = useTransition ? 'transform 0.5s ease-in-out' : 'none';
      inner.style.transform = 'translateX(-' + (index * slideWidth) + 'px)';
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
    window.addEventListener('resize', function() { goToSlide(currentSlide, false); });
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

  function initOmBackground() {
    var container = document.getElementById('om-bg');
    if (!container) return;
    var rows = 6;
    var cols = 8;
    var totalCells = rows * cols;
    var cellWidth = 100 / cols;
    var cellHeight = 100 / rows;
    
    for (var i = 0; i < totalCells; i++) {
      var row = Math.floor(i / cols);
      var col = i % cols;
      var span = document.createElement('span');
      span.textContent = '\u0950';
      
      var left = (col * cellWidth) + (Math.random() * cellWidth * 0.7 + cellWidth * 0.15);
      var top = (row * cellHeight) + (Math.random() * cellHeight * 0.7 + cellHeight * 0.15);
      
      span.style.left = left + '%';
      span.style.top = top + '%';
      span.style.fontSize = (1.4 + Math.random() * 1.2) + 'rem';
      span.style.transform = 'rotate(' + (Math.random() * 60 - 30) + 'deg)';
      span.style.opacity = (0.12 + Math.random() * 0.06).toFixed(2);
      span.style.animationDelay = (Math.random() * 4) + 's';
      container.appendChild(span);
    }
  }

  function initOmCursor() {
    var el = document.getElementById('om-cursor');
    if (!el) return;
    var x = 0, y = 0;
    var tx = 0, ty = 0;
    document.addEventListener('mousemove', function(e) {
      x = e.clientX;
      y = e.clientY;
    });
    function tick() {
      tx += (x - tx) * 0.12;
      ty += (y - ty) * 0.12;
      el.style.left = tx + 'px';
      el.style.top = ty + 'px';
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  loadPujas();
  setInterval(loadPujas, 60000);
  initOmBackground();
  // initOmCursor(); // Removed - Om cursor follower disabled
})();
