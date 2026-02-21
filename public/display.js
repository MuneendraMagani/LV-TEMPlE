(function() {
  const API = '/api/pujas';

  function formatDateSchedule(startDateStr, endDateStr) {
    if (!startDateStr) return '';
    const start = new Date(startDateStr + 'T12:00:00');
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const month = months[start.getMonth()];
    const startDay = start.getDate();
    if (endDateStr && endDateStr !== startDateStr) {
      const end = new Date(endDateStr + 'T12:00:00');
      const endDay = end.getDate();
      return startDay + '-' + endDay + ' ' + month;
    }
    return startDay + ' ' + month;
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

  function getEventStatus(puja) {
    var now = new Date();
    var startDate = puja.startDate;
    if (!startDate) return 'upcoming';
    var eventDate = puja.endDate || startDate;
    var eventTime = puja.endTime || puja.startTime || '23:59';
    var startTime = puja.startTime || '00:00';
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

  function buildScheduleRow(puja, status) {
    const title = escapeHtml(puja.title || 'Event');
    const dateText = formatDateSchedule(puja.startDate, puja.endDate);
    const startFormatted = formatTimeDisplay(puja.startTime);
    const endFormatted = formatTimeDisplay(puja.endTime);
    var timeText = startFormatted ? (startFormatted + (endFormatted ? ' - ' + endFormatted : '')) : (endFormatted || '');
    if (!timeText) timeText = '\u2014';
    const isLive = status === 'live';
    const rowClass = 'schedule-row' + (isLive ? ' schedule-row--live' : '');
    const badgeClass = 'status-badge status-badge--' + status;
    const statusText = status === 'live' ? 'LIVE' : (status === 'completed' ? 'COMPLETED' : 'UPCOMING');
    const badgeHtml = isLive
      ? '<span class="' + badgeClass + '"><span class="status-dot"></span>' + statusText + '</span>'
      : '<span class="' + badgeClass + '">' + statusText + '</span>';
    return '<div class="' + rowClass + '">' +
      '<div class="schedule-cell schedule-date">' + escapeHtml(dateText) + '</div>' +
      '<div class="schedule-cell schedule-event">' + title + '</div>' +
      '<div class="schedule-cell schedule-time">' + escapeHtml(timeText) + '</div>' +
      '<div class="schedule-cell schedule-status">' + badgeHtml + '</div>' +
    '</div>';
  }

  var ROWS_PER_PAGE = 7;
  var PAGE_INTERVAL_MS = 10000;
  var currentPujas = [];
  var currentPageIndex = 0;
  var pageIntervalId = null;

  function renderPujas(pujas) {
    const container = document.getElementById('pujaCards');
    if (!container) return;

    currentPujas = pujas || [];
    currentPageIndex = 0;
    if (pageIntervalId) {
      clearInterval(pageIntervalId);
      pageIntervalId = null;
    }

    if (!currentPujas.length) {
      container.className = 'schedule-section no-events';
      container.innerHTML = '<div class="puja-placeholder">No upcoming pujas</div>';
      return;
    }

    renderCurrentPage();
    var totalPages = Math.ceil(currentPujas.length / ROWS_PER_PAGE);
    if (totalPages > 1) {
      pageIntervalId = setInterval(function() {
        currentPageIndex = (currentPageIndex + 1) % totalPages;
        renderCurrentPage();
      }, PAGE_INTERVAL_MS);
    }
  }

  function renderCurrentPage() {
    const container = document.getElementById('pujaCards');
    if (!container || !currentPujas.length) return;

    var start = currentPageIndex * ROWS_PER_PAGE;
    var pagePujas = currentPujas.slice(start, start + ROWS_PER_PAGE);
    var rowsHtml = pagePujas.map(function(p) {
      return buildScheduleRow(p, getEventStatus(p));
    }).join('');
    var html = '<h2 class="schedule-title">DAILY SCHEDULE &amp; UPCOMING SEVAS</h2>' +
      '<div class="schedule-table-wrap">' +
      '<div class="schedule-header">' +
      '<div class="schedule-cell schedule-date">DATE</div>' +
      '<div class="schedule-cell schedule-event">EVENT / SEVA</div>' +
      '<div class="schedule-cell schedule-time">TIME</div>' +
      '<div class="schedule-cell schedule-status">STATUS</div>' +
      '</div>' +
      '<div class="schedule-table">' + rowsHtml + '</div></div>';

    container.className = 'schedule-section';
    container.innerHTML = html;
  }

  function sortPujasTodayFirst(pujas) {
    var today = new Date().toISOString().slice(0, 10);
    function isToday(p) { return (p.startDate || '') === today; }
    function key(p) { return (p.startDate || '').replace(/-/g, '') + String(parseTimeToMinutes(p.startTime) || 0).padStart(4, '0'); }
    return pujas.slice().sort(function(a, b) {
      if (isToday(a) && !isToday(b)) return -1;
      if (!isToday(a) && isToday(b)) return 1;
      return key(a).localeCompare(key(b));
    });
  }

  function loadPujas() {
    fetch(API)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var pujas = (data.pujas || []).filter(function(p) { return p.isActive !== false; });
        renderPujas(sortPujasTodayFirst(pujas));
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

  loadPujas();
  setInterval(loadPujas, 60000);
  initOmBackground();
})();
