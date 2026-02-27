(function() {
  const API = '/api/poojas';

  function formatDayName(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr + 'T12:00:00');
    var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[d.getDay()];
  }

  function formatDateSchedule(startDateStr, endDateStr) {
    if (!startDateStr) return '';
    const start = new Date(startDateStr + 'T12:00:00');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[start.getMonth()];
    const startDay = start.getDate();
    if (endDateStr && endDateStr !== startDateStr) {
      const end = new Date(endDateStr + 'T12:00:00');
      const endDay = end.getDate();
      return month + ' ' + startDay + '-' + endDay;
    }
    return month + ' ' + startDay;
  }

  function formatTimeDisplay(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return '';
    var m = timeStr.toLowerCase().trim().match(/(\d+):?(\d*)\s*(am|pm)?/);
    if (!m) return '';
    var h = parseInt(m[1], 10);
    var min = m[2] ? parseInt(m[2], 10) : 0;
    var suffix = 'AM';
    if (m[3]) {
      if (m[3] === 'pm' && h !== 12) h += 12;
      if (m[3] === 'am' && h === 12) h = 0;
    }
    if (h >= 12) { suffix = 'PM'; if (h > 12) h -= 12; }
    return (min > 0 ? h + ':' + (min < 10 ? '0' : '') + min : h) + ' ' + suffix;
  }

  function parseTimeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    var s = timeStr.toLowerCase().trim();
    var m = s.match(/(\d+):?(\d*)\s*(am|pm)?/);
    if (!m) return 0;
    var h = parseInt(m[1], 10);
    var min = m[2] ? parseInt(m[2], 10) : 0;
    if (m[3] === 'pm' && h !== 12) h += 12;
    if (m[3] === 'am' && h === 12) h = 0;
    return h * 60 + min;
  }

  function toDate(s) {
    if (!s) return null;
    var p = s.split('-');
    return p.length === 3 ? new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10)) : null;
  }
  function toStr(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function isEventToday(p, today) {
    var start = p.startDate || '';
    var end = p.endDate || p.startDate || '';
    return start && end && start <= today && end >= today;
  }

  function getEventStatus(pooja) {
    var now = new Date();
    var startDate = pooja.startDate;
    if (!startDate) return 'upcoming';
    var eventDate = pooja.endDate || startDate;
    var eventTime = pooja.endTime || pooja.startTime || '23:59';
    var startTime = pooja.startTime || '00:00';
    var sy = startDate.split('-')[0], sm = startDate.split('-')[1], sd = startDate.split('-')[2];
    var ey = eventDate.split('-')[0], em = eventDate.split('-')[1], ed = eventDate.split('-')[2];
    var startMin = parseTimeToMinutes(startTime);
    var endMin = parseTimeToMinutes(eventTime);
    var startDt = new Date(parseInt(sy, 10), parseInt(sm, 10) - 1, parseInt(sd, 10), Math.floor(startMin / 60), startMin % 60);
    var endDt = new Date(parseInt(ey, 10), parseInt(em, 10) - 1, parseInt(ed, 10), Math.floor(endMin / 60), endMin % 60);
    if (eventDate === startDate && endMin < startMin) endDt.setDate(endDt.getDate() + 1);
    if (now < startDt) return 'upcoming';
    if (now > endDt) return 'completed';
    return 'live';
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function sortPoojasTodayFirst(poojas) {
    var n = new Date();
    var today = n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0');
    function key(p) { return (p.startDate || '').replace(/-/g, '') + String(parseTimeToMinutes(p.startTime) || 0).padStart(4, '0'); }
    return poojas.slice().sort(function(a, b) {
      if (isEventToday(a, today) && !isEventToday(b, today)) return -1;
      if (!isEventToday(a, today) && isEventToday(b, today)) return 1;
      return key(a).localeCompare(key(b));
    });
  }

  var upcomingSliderTimer = null;

  function startUpcomingSlider(numCards) {
    if (document.documentElement.classList.contains("mobile-mode")) {
      return; // Disable auto sliding on mobile
    }
    var container = document.getElementById('poojaUpcomingWrap');
    var inner = document.getElementById('poojaUpcomingInner');
    if (!container || !inner) return;

    var numSlides = Math.ceil(numCards / 2);
    if (numSlides <= 1) return;

    var currentSlide = 0;

    function getSlideWidth() {
      return container ? container.offsetWidth : 0;
    }

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

    window.addEventListener('resize', function onResize() {
      goToSlide(currentSlide, false);
    });
  }

  function renderPoojas(poojas) {
    const container = document.getElementById('poojaCards');
    if (!container) return;

    var n = new Date();
    var today = n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0');
    var sorted = sortPoojasTodayFirst(poojas || []);
    var upcomingOnly = sorted.filter(function(p) { return getEventStatus(p) === 'upcoming'; });
    var liveOrUpcoming = sorted.filter(function(p) { var s = getEventStatus(p); return s === 'live' || s === 'upcoming'; });

    if (!sorted.length) {
      container.className = 'pooja-cards-section no-events';
      container.innerHTML = '<div class="pooja-placeholder">No upcoming poojas</div>';
      return;
    }
    var todayEvents = sorted.filter(function(p) { return isEventToday(p, today); });

    var tomorrow = toStr(new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1));
    var weekEnd = toStr(new Date(n.getFullYear(), n.getMonth(), n.getDate() + 6));
    var upcomingItems = [];
    sorted.forEach(function(p) {
      var start = p.startDate || '', end = p.endDate || p.startDate || '';
      if (!start || end < today) return;
      if (start === end) {
        if (start > today && start <= weekEnd) upcomingItems.push({ pooja: p, displayDate: start });
        return;
      }
      var first = start > tomorrow ? start : tomorrow;
      var endCapped = end > weekEnd ? weekEnd : end;
      if (first > endCapped) return;
      var d = toDate(first), endD = toDate(endCapped);
      if (!d || !endD) return;
      for (; d <= endD; d.setDate(d.getDate() + 1))
        upcomingItems.push({ pooja: p, displayDate: toStr(d) });
    });
    upcomingItems.sort(function(a, b) {
      var c = a.displayDate.localeCompare(b.displayDate);
      return c !== 0 ? c : (parseTimeToMinutes(a.pooja.startTime) || 0) - (parseTimeToMinutes(b.pooja.startTime) || 0);
    });

    var mainHtml = '';
    if (todayEvents.length > 0) {
      var itemsHtml = todayEvents.map(function(p) {
        var title = escapeHtml(p.title || 'Event');
        var startFormatted = formatTimeDisplay(p.startTime);
        var endFormatted = formatTimeDisplay(p.endTime);
        var timeText = startFormatted ? (startFormatted + (endFormatted ? ' - ' + endFormatted : '')) : (endFormatted || '');
        if (!timeText) timeText = '\u2014';
        return '<div class="pooja-main-item">' +
          '<span class="pooja-main-time">' + escapeHtml(timeText) + '</span>' +
          '<span class="pooja-main-event">' + title + '</span>' +
          '</div>';
      }).join('');
      var countClass = 'pooja-main-card--count-' + Math.min(todayEvents.length, 5);
      mainHtml = '<div class="pooja-main-header">' +
        '<div class="pooja-main-title">TODAY\'S EVENTS</div>' +
        '</div>' +
        '<div class="pooja-main-card ' + countClass + '">' +
        '<div class="pooja-card-accent pooja-card-accent--tr"></div>' +
        '<div class="pooja-card-accent pooja-card-accent--bl"></div>' +
        '<div class="pooja-main-items">' + itemsHtml + '</div>' +
        '</div>';
    } else {
      mainHtml = '<div class="pooja-main-header">' +
        '<div class="pooja-main-title">TODAY\'S EVENTS</div>' +
        '</div>' +
        '<div class="pooja-main-card">' +
        '<div class="pooja-card-accent pooja-card-accent--tr"></div>' +
        '<div class="pooja-card-accent pooja-card-accent--bl"></div>' +
        '<div class="pooja-main-items"><div class="pooja-main-item">' +
        '<span class="pooja-main-time">—</span>' +
        '<span class="pooja-main-event">No events today</span>' +
        '</div></div></div>';
    }

    var upcomingCardsHtml = upcomingItems.map(function(item) {
      var p = item.pooja;
      var displayDate = item.displayDate;
      var title = escapeHtml(p.title || 'Event');
      var dayName = formatDayName(displayDate);
      var dateText = formatDateSchedule(displayDate, displayDate);
      var startFormatted = formatTimeDisplay(p.startTime);
      var endFormatted = formatTimeDisplay(p.endTime);
      var timeText = startFormatted ? (startFormatted + (endFormatted ? ' - ' + endFormatted : '')) : (endFormatted || '');
      if (!timeText) timeText = '\u2014';
      var dayDateBadge = (dayName && dateText) ? escapeHtml(dayName) + ', ' + escapeHtml(dateText) : escapeHtml(dateText);
      var dateTimeText = timeText ? escapeHtml(timeText) : '\u2014';
      return '<div class="pooja-upcoming-card">' +
        '<div class="pooja-upcoming-card-inner">' +
        '<span class="pooja-upcoming-badge">' + dayDateBadge + '</span>' +
        '<div class="pooja-card-accent pooja-card-accent--tr"></div>' +
        '<div class="pooja-card-accent pooja-card-accent--bl"></div>' +
        '<div class="pooja-upcoming-row">' +
        '<span class="pooja-upcoming-info">' + dateTimeText + '</span>' +
        '<span class="pooja-upcoming-title">' + title + '</span>' +
        '</div>' +
        '</div></div>';
    }).join('');

    var upcomingHtml = '';
    if (upcomingItems.length > 0) {
      upcomingHtml = '<div class="pooja-upcoming-section">' +
        '<h3 class="pooja-upcoming-heading">UPCOMING SEVAS</h3>' +
        '<div class="pooja-upcoming-wrap" id="poojaUpcomingWrap">' +
        '<div class="pooja-upcoming-inner" id="poojaUpcomingInner">' + upcomingCardsHtml + '</div>' +
        '</div></div>';
    }

    container.className = 'pooja-cards-section';
    container.innerHTML = '<div class="pooja-main-wrap">' + mainHtml + '</div>' + upcomingHtml;

    if (upcomingItems.length > 0) {
      setTimeout(function() {
        startUpcomingSlider(upcomingItems.length);
      }, 50);
    }
  }

  function loadPoojas() {
    fetch(API)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var poojas = (data.poojas || []).filter(function(p) { return p.isActive !== false; });
        renderPoojas(poojas);
      })
      .catch(function() {
        renderPoojas([]);
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

  loadPoojas();
  setInterval(loadPoojas, 60000);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") {
      loadPoojas();
    }
  });
  (function scheduleMidnightRefresh() {
    var now = new Date();
    var tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    var msUntilMidnight = tomorrow - now;
    setTimeout(function() {
      loadPoojas();
      scheduleMidnightRefresh();
    }, msUntilMidnight);
  })();
  initOmBackground();
})();
