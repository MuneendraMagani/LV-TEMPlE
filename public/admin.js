(function() {
  const API = '/api/poojas';
  const LOGIN_API = '/api/login';
  const ADMINS_API = '/api/admins';
  const TOKEN_KEY = 'pooja_admin_token';
  const ROLE_KEY = 'pooja_admin_role';
  const USERNAME_KEY = 'pooja_admin_username';

  function getToken() { return sessionStorage.getItem(TOKEN_KEY); }
  function setToken(token) { sessionStorage.setItem(TOKEN_KEY, token); }
  function clearToken() { sessionStorage.removeItem(TOKEN_KEY); }
  function getRole() { return sessionStorage.getItem(ROLE_KEY); }
  function setRole(role) { if (role) sessionStorage.setItem(ROLE_KEY, role); else sessionStorage.removeItem(ROLE_KEY); }
  function getUsername() { return sessionStorage.getItem(USERNAME_KEY); }
  function setUsername(name) { if (name) sessionStorage.setItem(USERNAME_KEY, name); else sessionStorage.removeItem(USERNAME_KEY); }
  function authHeaders() {
    const t = getToken();
    return t ? { 'Authorization': 'Bearer ' + t } : {};
  }

  function showLogin() {
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('adminContent').style.display = 'none';
    document.querySelector('.admin-container').classList.remove('logged-in');
  }

  function showAdmin() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('adminContent').style.display = 'block';
    document.getElementById('loginError').style.display = 'none';
    document.querySelector('.admin-container').classList.add('logged-in');
    switchTab('add');
    loadPoojas();
    var name = getUsername() || 'Admin';
    var nameEl = document.getElementById('adminUserName');
    var avatarEl = document.getElementById('adminUserAvatar');
    if (nameEl) nameEl.textContent = name;
    if (avatarEl) avatarEl.textContent = (name.charAt(0) || 'A').toUpperCase();
    closeUserDropdown();
    var role = getRole();
    var tabUsers = document.getElementById('tabUsers');
    if (tabUsers) {
      tabUsers.style.display = role === 'SUPER_ADMIN' ? '' : 'none';
      if (role === 'SUPER_ADMIN') loadAdmins();
    }
  }

  function openUserDropdown() {
    var menu = document.getElementById('adminUserMenu');
    var dropdown = document.getElementById('adminUserDropdown');
    var trigger = document.getElementById('adminUserTrigger');
    if (menu) menu.classList.add('open');
    if (dropdown) { dropdown.removeAttribute('hidden'); }
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
  }
  function closeUserDropdown() {
    var menu = document.getElementById('adminUserMenu');
    var dropdown = document.getElementById('adminUserDropdown');
    var trigger = document.getElementById('adminUserTrigger');
    if (menu) menu.classList.remove('open');
    if (dropdown) dropdown.setAttribute('hidden', '');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  }
  function toggleUserDropdown() {
    var dropdown = document.getElementById('adminUserDropdown');
    var isOpen = !dropdown || !dropdown.hasAttribute('hidden');
    if (isOpen) closeUserDropdown();
    else openUserDropdown();
  }

  function closeEditPoojaModal() {
    document.getElementById('editPoojaModal').style.display = 'none';
    document.getElementById('editPoojaForm').reset();
    document.getElementById('editPoojaMessage').style.display = 'none';
  }

  function closeChangePasswordModal() {
    document.getElementById('changePasswordModal').style.display = 'none';
    document.getElementById('changePasswordForm').reset();
    document.getElementById('changePasswordMessage').style.display = 'none';
  }

  function switchTab(tabId) {
    document.querySelectorAll('.admin-tab').forEach(function(t) {
      var isActive = t.dataset.tab === tabId;
      t.classList.toggle('active', isActive);
      t.setAttribute('aria-selected', isActive);
    });
    document.querySelectorAll('.admin-tab-panel').forEach(function(p) {
      p.classList.toggle('active', p.dataset.tab === tabId);
    });
  }

  function loadAdmins() {
    fetch(ADMINS_API, { headers: authHeaders() })
      .then(function(r) {
        if (r.status === 403 || r.status === 401) return [];
        return r.json();
      })
      .then(function(list) {
        var el = document.getElementById('adminList');
        if (!el) return;
        if (!Array.isArray(list) || list.length === 0) {
          el.innerHTML = '<p style="color:#888;">No other users yet.</p>';
          return;
        }
        el.innerHTML = list.map(function(a) {
          var badge = a.role === 'SUPER_ADMIN' ? '<span class="role-badge super">Super Admin</span>' : '<span class="role-badge">Admin</span>';
          var delBtn = a.role === 'SUPER_ADMIN' || a.id === 'super' ? '' : '<button type="button" class="btn btn-danger btn-sm" data-id="' + a.id + '">Remove</button>';
          return '<div class="admin-row"><span class="admin-name">' + (a.username || '') + '</span>' + badge + delBtn + '</div>';
        }).join('');
        el.querySelectorAll('.btn-danger').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var id = btn.dataset.id;
            if (!id || !confirm('Remove this user\'s access?')) return;
            fetch(ADMINS_API + '/' + id, { method: 'DELETE', headers: authHeaders() })
              .then(function(r) { if (r.status === 401) showLogin(); else if (r.ok) loadAdmins(); else alert('Failed to remove.'); })
              .catch(function() { alert('Failed.'); });
          });
        });
      })
      .catch(function() {});
  }

  function parseDetails(text) {
    if (!text || !text.trim()) return [];
    return text.split('\n').map(function(line) {
      line = line.trim();
      if (!line) return null;
      var sep = line.indexOf('|');
      if (sep >= 0) return { time: line.slice(0, sep).trim(), name: line.slice(sep + 1).trim() };
      return { time: '', name: line };
    }).filter(Boolean);
  }

  var poojasCache = [];
  function loadPoojas() {
    var tableWrap = document.querySelector('.pooja-table-wrap');
    var tbody = document.getElementById('poojaList');
    var emptyEl = document.getElementById('poojaListEmpty');
    var errorEl = document.getElementById('poojaListError');
    if (!tbody) return;
    fetch(API)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        poojasCache = data.poojas || [];
        if (tableWrap) tableWrap.style.display = poojasCache.length > 0 ? '' : 'none';
        if (emptyEl) emptyEl.style.display = poojasCache.length === 0 ? 'block' : 'none';
        if (errorEl) errorEl.style.display = 'none';
        if (poojasCache.length === 0) {
          tbody.innerHTML = '';
          return;
        }
        tbody.innerHTML = poojasCache.map(function(p) {
          var startTime = emptyIfNull(p.startTime);
          var endTime = emptyIfNull(p.endTime);
          var startTimeDisp = startTime ? toTime12(startTime) : '—';
          var endTimeDisp = endTime ? toTime12(endTime) : '—';
          return '<tr>' +
            '<td class="pooja-title">' + escapeHtml(p.title || 'Untitled') + '</td>' +
            '<td class="pooja-date">' + escapeHtml(formatDateDisplay(p.startDate)) + '</td>' +
            '<td class="pooja-date">' + escapeHtml(formatDateDisplay(p.endDate)) + '</td>' +
            '<td class="pooja-time">' + escapeHtml(startTimeDisp) + '</td>' +
            '<td class="pooja-time">' + escapeHtml(endTimeDisp) + '</td>' +
            '<td class="pooja-actions">' +
            '<button type="button" class="btn btn-edit" data-id="' + escapeHtml(String(p.id)) + '">Edit</button>' +
            '<button type="button" class="btn btn-danger" data-id="' + escapeHtml(String(p.id)) + '">Delete</button>' +
            '</td></tr>';
        }).join('');
        tbody.querySelectorAll('.btn-edit').forEach(function(btn) {
          btn.addEventListener('click', openEditPooja);
        });
        tbody.querySelectorAll('.btn-danger').forEach(function(btn) {
          btn.addEventListener('click', deletePooja);
        });
      })
      .catch(function() {
        if (tableWrap) tableWrap.style.display = 'none';
        if (emptyEl) emptyEl.style.display = 'none';
        if (errorEl) { errorEl.style.display = 'block'; errorEl.textContent = 'Error loading poojas.'; }
        tbody.innerHTML = '';
      });
  }

  function toTime12(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return timeStr || '';
    var s = timeStr.trim();
    if (/am|pm/i.test(s)) return s;
    var m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (!m) return s;
    var h = parseInt(m[1], 10);
    var min = m[2] || '00';
    var hour12 = h % 12 || 12;
    var ampm = h < 12 ? 'AM' : 'PM';
    return hour12 + ':' + min + ' ' + ampm;
  }

  function formatDateDisplay(dateStr) {
    if (!dateStr || String(dateStr).toLowerCase() === 'null') return '—';
    var s = String(dateStr).trim();
    if (!s) return '—';
    var parts = s.split(/[-/]/);
    if (parts.length < 3) return s;
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var y = parts[0];
    var m = parseInt(parts[1], 10) - 1;
    var d = parts[2];
    if (isNaN(m) || m < 0 || m > 11) return s;
    return months[m] + ' ' + d + ', ' + y;
  }

  function formatDetailsForTextarea(details) {
    if (!Array.isArray(details)) return '';
    return details.map(function(d) {
      var t = (d.time || '').trim();
      if (t && !/am|pm/i.test(t)) {
        var parts = t.split(/\s*-\s*/);
        t = parts.map(toTime12).join(' - ');
      }
      return t + (t && d.name ? ' | ' : '') + (d.name || '');
    }).join('\n');
  }

  function escapeHtml(s) {
    if (s == null) return '';
    var div = document.createElement('div');
    div.textContent = String(s);
    return div.innerHTML;
  }

  function emptyIfNull(v) {
    if (v == null || v === '') return '';
    var s = String(v).trim();
    return (s.toLowerCase() === 'null' || s === '') ? '' : v;
  }

  function openEditPooja(e) {
    var id = e.target.dataset.id;
    if (!id) return;
    var p = poojasCache.find(function(x) { return String(x.id) === String(id); });
    if (!p) return;
    document.getElementById('editPoojaId').value = emptyIfNull(p.id);
    document.getElementById('editTitle').value = emptyIfNull(p.title);
    document.getElementById('editStartDate').value = (emptyIfNull(p.startDate) || '').slice(0, 10);
    document.getElementById('editEndDate').value = (emptyIfNull(p.endDate) || '').slice(0, 10);
    document.getElementById('editStartTime').value = toTime12(emptyIfNull(p.startTime) || '');
    document.getElementById('editEndTime').value = toTime12(emptyIfNull(p.endTime) || '');
    document.getElementById('editDetails').value = formatDetailsForTextarea(p.details);
    document.getElementById('editPoojaMessage').style.display = 'none';
    document.getElementById('editPoojaModal').style.display = 'flex';
    document.getElementById('editTitle').focus();
  }

  function deletePooja(e) {
    var id = e.target.dataset.id;
    if (!id || !confirm('Delete this pooja?')) return;
    fetch(API + '/' + id, { method: 'DELETE', headers: authHeaders() })
      .then(function(r) { if (r.status === 401) { showLogin(); return; } if (r.ok) loadPoojas(); else alert('Delete failed.'); })
      .catch(function() { alert('Delete failed.'); });
  }

  document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    var username = document.getElementById('loginUsername').value.trim();
    var pw = document.getElementById('loginPassword').value;
    document.getElementById('loginError').style.display = 'none';
    fetch(LOGIN_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: username, password: pw }) })
      .then(function(r) {
        if (!r.ok) {
          document.getElementById('loginError').textContent = r.status === 401 ? 'Invalid username or password. Try again.' : 'Login failed.';
          document.getElementById('loginError').style.display = 'block';
          return null;
        }
        return r.json();
      })
      .then(function(data) {
        if (!data) return;
        if (data.token) {
          setToken(data.token);
          setRole(data.role || 'ADMIN');
          setUsername(data.username || document.getElementById('loginUsername').value.trim());
          document.getElementById('loginError').style.display = 'none';
          showAdmin();
          document.getElementById('adminContent').scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          document.getElementById('loginError').textContent = data.error || 'Invalid username or password. Try again.';
          document.getElementById('loginError').style.display = 'block';
        }
      })
      .catch(function() {
        document.getElementById('loginError').textContent = 'Login failed. Check server and try again.';
        document.getElementById('loginError').style.display = 'block';
      });
  });

  function hasAmPm(s) {
    if (!s || typeof s !== 'string') return true;
    return /am|pm/i.test(s);
  }

  function normalizeAmPm(s) {
    if (!s || typeof s !== 'string') return s;
    return s.replace(/am(?=[^a-zA-Z]|$)/gi, 'AM').replace(/pm(?=[^a-zA-Z]|$)/gi, 'PM');
  }

  document.getElementById('addForm').addEventListener('submit', function(e) {
    e.preventDefault();
    var startTime = document.getElementById('startTime').value.trim();
    var endTime = document.getElementById('endTime').value.trim();
    if (startTime && !hasAmPm(startTime)) {
      alert('Start Time must use 12-hour format with AM/PM (e.g. 9:00 AM).');
      return;
    }
    if (endTime && !hasAmPm(endTime)) {
      alert('End Time must use 12-hour format with AM/PM (e.g. 9:30 AM).');
      return;
    }
    var details = parseDetails(document.getElementById('details').value);
    for (var i = 0; i < details.length; i++) {
      if (details[i] && details[i].time && !hasAmPm(details[i].time)) {
        alert('Sub-events must use 12-hour format with AM/PM (e.g. 9:00 AM - 9:30 AM).');
        return;
      }
      if (details[i] && details[i].time) {
        details[i].time = normalizeAmPm(details[i].time);
      }
    }
    var pooja = {
      title: document.getElementById('title').value.trim(),
      startDate: document.getElementById('startDate').value,
      startTime: normalizeAmPm(startTime),
      endDate: document.getElementById('endDate').value,
      endTime: normalizeAmPm(endTime),
      details: details,
      isActive: true
    };
    fetch(API, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()), body: JSON.stringify(pooja) })
      .then(function(r) { if (r.status === 401) { showLogin(); return; } if (r.ok) { document.getElementById('addForm').reset(); loadPoojas(); } else throw new Error(); })
      .catch(function() { alert('Could not add pooja.'); });
  });

  document.getElementById('logoutBtn').addEventListener('click', function() {
    clearToken(); setRole(null); setUsername(null); closeUserDropdown();
    showLogin();
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
  });

  document.getElementById('adminUserTrigger').addEventListener('click', function(e) {
    e.stopPropagation();
    toggleUserDropdown();
  });
  document.addEventListener('click', function() { closeUserDropdown(); });
  document.getElementById('adminUserDropdown').addEventListener('click', function(e) { e.stopPropagation(); });

  document.getElementById('addUserForm').addEventListener('submit', function(e) {
    e.preventDefault();
    var username = document.getElementById('newUsername').value.trim();
    var password = document.getElementById('newPassword').value;
    if (!username || !password) return;
    fetch(ADMINS_API, {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
      body: JSON.stringify({ username: username, password: password })
    })
      .then(function(r) {
        if (r.status === 401) showLogin();
        else if (r.status === 403) alert('Only super admin can add users.');
        else if (r.ok) {
          document.getElementById('addUserForm').reset();
          loadAdmins();
        } else return r.json().then(function(d) { alert(d.error || 'Failed'); });
      })
      .catch(function() { alert('Failed to add user.'); });
  });

  document.getElementById('closeEditModalBtn').addEventListener('click', closeEditPoojaModal);
  document.getElementById('cancelEditModalBtn').addEventListener('click', closeEditPoojaModal);
  document.getElementById('editPoojaModal').addEventListener('click', function(e) {
    if (e.target === this) closeEditPoojaModal();
  });
  document.getElementById('editPoojaForm').addEventListener('submit', function(e) {
    e.preventDefault();
    var id = document.getElementById('editPoojaId').value;
    if (!id) return;
    var startTime = document.getElementById('editStartTime').value.trim();
    var endTime = document.getElementById('editEndTime').value.trim();
    if (startTime && !hasAmPm(startTime)) {
      document.getElementById('editPoojaMessage').textContent = 'Start Time must use 12-hour format with AM/PM (e.g. 9:00 AM).';
      document.getElementById('editPoojaMessage').style.display = 'block';
      return;
    }
    if (endTime && !hasAmPm(endTime)) {
      document.getElementById('editPoojaMessage').textContent = 'End Time must use 12-hour format with AM/PM (e.g. 9:30 AM).';
      document.getElementById('editPoojaMessage').style.display = 'block';
      return;
    }
    var details = parseDetails(document.getElementById('editDetails').value);
    for (var i = 0; i < details.length; i++) {
      if (details[i] && details[i].time && !hasAmPm(details[i].time)) {
        document.getElementById('editPoojaMessage').textContent = 'Sub-events must use 12-hour format with AM/PM.';
        document.getElementById('editPoojaMessage').style.display = 'block';
        return;
      }
      if (details[i] && details[i].time) details[i].time = normalizeAmPm(details[i].time);
    }
    var pooja = {
      _update: true,
      id: id,
      title: document.getElementById('editTitle').value.trim(),
      startDate: document.getElementById('editStartDate').value,
      startTime: normalizeAmPm(startTime),
      endDate: document.getElementById('editEndDate').value,
      endTime: normalizeAmPm(endTime),
      details: details
    };
    fetch(API, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()), body: JSON.stringify(pooja) })
      .then(function(r) {
        if (r.status === 401) { showLogin(); closeEditPoojaModal(); return; }
        if (r.ok) { closeEditPoojaModal(); loadPoojas(); return; }
        return r.json().catch(function() { return {}; }).then(function(d) {
          document.getElementById('editPoojaMessage').textContent = d.error || ('Update failed (status ' + r.status + ')');
          document.getElementById('editPoojaMessage').style.display = 'block';
        });
      })
      .catch(function(err) {
        document.getElementById('editPoojaMessage').textContent = 'Update failed. ' + (err.message || '');
        document.getElementById('editPoojaMessage').style.display = 'block';
      });
  });

  document.getElementById('changePasswordBtn').addEventListener('click', function() {
    closeUserDropdown();
    document.getElementById('changePasswordModal').style.display = 'flex';
    document.getElementById('currentPassword').focus();
  });

  document.getElementById('closeModalBtn').addEventListener('click', closeChangePasswordModal);
  document.getElementById('cancelModalBtn').addEventListener('click', closeChangePasswordModal);
  document.getElementById('changePasswordModal').addEventListener('click', function(e) {
    if (e.target === this) closeChangePasswordModal();
  });

  document.getElementById('changePasswordForm').addEventListener('submit', function(e) {
    e.preventDefault();
    var current = document.getElementById('currentPassword').value;
    var newPass = document.getElementById('newPasswordChange').value;
    var confirm = document.getElementById('confirmPassword').value;
    var msgEl = document.getElementById('changePasswordMessage');
    
    if (newPass !== confirm) {
      msgEl.textContent = 'New passwords do not match!';
      msgEl.style.display = 'block';
      msgEl.style.color = '#c0392b';
      return;
    }
    
    if (newPass.length < 4) {
      msgEl.textContent = 'Password must be at least 4 characters long.';
      msgEl.style.display = 'block';
      msgEl.style.color = '#c0392b';
      return;
    }
    
    fetch('/api/change-password', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
      body: JSON.stringify({ currentPassword: current, newPassword: newPass })
    }).then(function(r) {
        if (r.status === 401) {
          msgEl.textContent = 'Current password is incorrect.';
          msgEl.style.display = 'block';
          msgEl.style.color = '#c0392b';
        } else if (r.ok) {
          msgEl.textContent = 'Password changed successfully!';
          msgEl.style.display = 'block';
          msgEl.style.color = '#27ae60';
          document.getElementById('changePasswordForm').reset();
          setTimeout(function() {
            closeChangePasswordModal();
            msgEl.style.display = 'none';
          }, 2000);
        } else {
          return r.json().then(function(d) {
            msgEl.textContent = d.error || 'Failed to change password.';
            msgEl.style.display = 'block';
            msgEl.style.color = '#c0392b';
          });
        }
      })
      .catch(function() {
        msgEl.textContent = 'Failed to change password.';
        msgEl.style.display = 'block';
        msgEl.style.color = '#c0392b';
      });
  });

  document.getElementById('requestPassword').addEventListener('click', function(e) {
    e.preventDefault();
    alert('Please contact the temple administrator to reset your password.');
  });

  document.addEventListener('click', function(e) {
    var tab = e.target.closest('.admin-tab');
    if (tab && tab.dataset.tab) switchTab(tab.dataset.tab);
  });

  if (getToken()) showAdmin();
  else showLogin();
})();
