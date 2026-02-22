(function() {
  const API = '/api/pujas';
  const LOGIN_API = '/api/login';
  const ADMINS_API = '/api/admins';
  const TOKEN_KEY = 'puja_admin_token';
  const ROLE_KEY = 'puja_admin_role';
  const USERNAME_KEY = 'puja_admin_username';

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
    loadPujas();
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

  var pujasCache = [];
  function loadPujas() {
    fetch(API)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var list = document.getElementById('pujaList');
        pujasCache = data.pujas || [];
        if (pujasCache.length === 0) {
          list.innerHTML = '<p style="color:#888;">No pujas yet. Add one above.</p>';
          return;
        }
        list.innerHTML = pujasCache.map(function(p) {
          var start = (p.startDate || '') + ' ' + (p.startTime || '');
          var end = (p.endDate || '') + ' ' + (p.endTime || '');
          return '<div class="puja-card"><div class="puja-card-info"><h3>' + escapeHtml(p.title || 'Untitled') + '</h3><p>' + escapeHtml(start) + ' – ' + escapeHtml(end) + '</p></div><button type="button" class="btn btn-edit" data-id="' + escapeHtml(String(p.id)) + '">Edit</button><button type="button" class="btn btn-danger" data-id="' + escapeHtml(String(p.id)) + '">Delete</button></div>';
        }).join('');
        list.querySelectorAll('.btn-edit').forEach(function(btn) {
          btn.addEventListener('click', openEditPuja);
        });
        list.querySelectorAll('.btn-danger').forEach(function(btn) {
          btn.addEventListener('click', deletePuja);
        });
      })
      .catch(function() { document.getElementById('pujaList').innerHTML = '<p style="color:#c0392b;">Error loading pujas.</p>'; });
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

  function openEditPuja(e) {
    var id = e.target.dataset.id;
    if (!id) return;
    var p = pujasCache.find(function(x) { return String(x.id) === String(id); });
    if (!p) return;
    document.getElementById('editPujaId').value = p.id || '';
    document.getElementById('editTitle').value = p.title || '';
    document.getElementById('editStartDate').value = (p.startDate || '').slice(0, 10);
    document.getElementById('editEndDate').value = (p.endDate || '').slice(0, 10);
    document.getElementById('editStartTime').value = toTime12(p.startTime || '');
    document.getElementById('editEndTime').value = toTime12(p.endTime || '');
    document.getElementById('editDetails').value = formatDetailsForTextarea(p.details);
    document.getElementById('editPujaMessage').style.display = 'none';
    document.getElementById('editPujaModal').style.display = 'flex';
    document.getElementById('editTitle').focus();
  }

  function deletePuja(e) {
    var id = e.target.dataset.id;
    if (!id || !confirm('Delete this puja?')) return;
    fetch(API + '/' + id, { method: 'DELETE', headers: authHeaders() })
      .then(function(r) { if (r.status === 401) { showLogin(); return; } if (r.ok) loadPujas(); else alert('Delete failed.'); })
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
    var puja = {
      title: document.getElementById('title').value.trim(),
      startDate: document.getElementById('startDate').value,
      startTime: normalizeAmPm(startTime),
      endDate: document.getElementById('endDate').value,
      endTime: normalizeAmPm(endTime),
      details: details,
      isActive: true
    };
    fetch(API, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()), body: JSON.stringify(puja) })
      .then(function(r) { if (r.status === 401) { showLogin(); return; } if (r.ok) { document.getElementById('addForm').reset(); loadPujas(); } else throw new Error(); })
      .catch(function() { alert('Could not add puja.'); });
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

  document.getElementById('closeEditModalBtn').addEventListener('click', function() {
    document.getElementById('editPujaModal').style.display = 'none';
    document.getElementById('editPujaForm').reset();
    document.getElementById('editPujaMessage').style.display = 'none';
  });
  document.getElementById('cancelEditModalBtn').addEventListener('click', function() {
    document.getElementById('editPujaModal').style.display = 'none';
    document.getElementById('editPujaForm').reset();
    document.getElementById('editPujaMessage').style.display = 'none';
  });
  document.getElementById('editPujaModal').addEventListener('click', function(e) {
    if (e.target === this) {
      this.style.display = 'none';
      document.getElementById('editPujaForm').reset();
      document.getElementById('editPujaMessage').style.display = 'none';
    }
  });
  document.getElementById('editPujaForm').addEventListener('submit', function(e) {
    e.preventDefault();
    var id = document.getElementById('editPujaId').value;
    if (!id) return;
    var startTime = document.getElementById('editStartTime').value.trim();
    var endTime = document.getElementById('editEndTime').value.trim();
    if (startTime && !hasAmPm(startTime)) {
      document.getElementById('editPujaMessage').textContent = 'Start Time must use 12-hour format with AM/PM (e.g. 9:00 AM).';
      document.getElementById('editPujaMessage').style.display = 'block';
      return;
    }
    if (endTime && !hasAmPm(endTime)) {
      document.getElementById('editPujaMessage').textContent = 'End Time must use 12-hour format with AM/PM (e.g. 9:30 AM).';
      document.getElementById('editPujaMessage').style.display = 'block';
      return;
    }
    var details = parseDetails(document.getElementById('editDetails').value);
    for (var i = 0; i < details.length; i++) {
      if (details[i] && details[i].time && !hasAmPm(details[i].time)) {
        document.getElementById('editPujaMessage').textContent = 'Sub-events must use 12-hour format with AM/PM.';
        document.getElementById('editPujaMessage').style.display = 'block';
        return;
      }
      if (details[i] && details[i].time) details[i].time = normalizeAmPm(details[i].time);
    }
    var puja = {
      _update: true,
      id: id,
      title: document.getElementById('editTitle').value.trim(),
      startDate: document.getElementById('editStartDate').value,
      startTime: normalizeAmPm(startTime),
      endDate: document.getElementById('editEndDate').value,
      endTime: normalizeAmPm(endTime),
      details: details
    };
    fetch(API, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()), body: JSON.stringify(puja) })
      .then(function(r) {
        if (r.status === 401) { showLogin(); document.getElementById('editPujaModal').style.display = 'none'; return; }
        if (r.ok) { document.getElementById('editPujaModal').style.display = 'none'; loadPujas(); return; }
        return r.json().catch(function() { return {}; }).then(function(d) {
          document.getElementById('editPujaMessage').textContent = d.error || ('Update failed (status ' + r.status + ')');
          document.getElementById('editPujaMessage').style.display = 'block';
        });
      })
      .catch(function(err) {
        document.getElementById('editPujaMessage').textContent = 'Update failed. ' + (err.message || '');
        document.getElementById('editPujaMessage').style.display = 'block';
      });
  });

  document.getElementById('changePasswordBtn').addEventListener('click', function() {
    closeUserDropdown();
    document.getElementById('changePasswordModal').style.display = 'flex';
    document.getElementById('currentPassword').focus();
  });

  document.getElementById('closeModalBtn').addEventListener('click', function() {
    document.getElementById('changePasswordModal').style.display = 'none';
    document.getElementById('changePasswordForm').reset();
    document.getElementById('changePasswordMessage').style.display = 'none';
  });

  document.getElementById('cancelModalBtn').addEventListener('click', function() {
    document.getElementById('changePasswordModal').style.display = 'none';
    document.getElementById('changePasswordForm').reset();
    document.getElementById('changePasswordMessage').style.display = 'none';
  });

  // Close modal on outside click
  document.getElementById('changePasswordModal').addEventListener('click', function(e) {
    if (e.target === this) {
      this.style.display = 'none';
      document.getElementById('changePasswordForm').reset();
      document.getElementById('changePasswordMessage').style.display = 'none';
    }
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
            document.getElementById('changePasswordModal').style.display = 'none';
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
