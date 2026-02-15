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

  function loadPujas() {
    fetch(API)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var list = document.getElementById('pujaList');
        var pujas = data.pujas || [];
        if (pujas.length === 0) {
          list.innerHTML = '<p style="color:#888;">No pujas yet. Add one above.</p>';
          return;
        }
        list.innerHTML = pujas.map(function(p) {
          var start = (p.startDate || '') + ' ' + (p.startTime || '');
          var end = (p.endDate || '') + ' ' + (p.endTime || '');
          return '<div class="puja-card"><div class="puja-card-info"><h3>' + (p.title || 'Untitled') + '</h3><p>' + start + ' – ' + end + '</p></div><button type="button" class="btn btn-danger" data-id="' + p.id + '">Delete</button></div>';
        }).join('');
        list.querySelectorAll('.btn-danger').forEach(function(btn) {
          btn.addEventListener('click', deletePuja);
        });
      })
      .catch(function() { document.getElementById('pujaList').innerHTML = '<p style="color:#c0392b;">Error loading pujas.</p>'; });
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

  document.getElementById('addForm').addEventListener('submit', function(e) {
    e.preventDefault();
    var details = parseDetails(document.getElementById('details').value);
    var puja = {
      title: document.getElementById('title').value.trim(),
      startDate: document.getElementById('startDate').value,
      startTime: document.getElementById('startTime').value.trim(),
      endDate: document.getElementById('endDate').value,
      endTime: document.getElementById('endTime').value.trim(),
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
