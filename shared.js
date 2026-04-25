/* ================================================================
   shared.js — JHC ADV AGRO — Funções compartilhadas
   Carregado por todos os portais e pelo login
   ================================================================ */

// ── SUPABASE CONFIG ───────────────────────────────────────────
var SB_URL = 'https://vmiwrzneiygxasivajlq.supabase.co';
var SB_KEY = 'sb_publishable_3H_REMx510mA078xybR0dQ_64jLXsdl';
var sb     = null;
var SB_OK  = false;

function initSB() {
  try {
    var m = (typeof supabase !== 'undefined') ? supabase : null;
    if (!m || !m.createClient) return false;
    sb    = m.createClient(SB_URL, SB_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });
    SB_OK = true;
    return true;
  } catch (e) { console.error('SB init error:', e); return false; }
}

function q(fn) {
  if (!SB_OK && !initSB())
    return Promise.reject(new Error('Sem conexão com o banco de dados.'));
  try {
    return Promise.resolve(fn(sb)).catch(function (e) {
      throw (e && e.message && e.message.indexOf('fetch') > -1)
        ? new Error('Erro de rede. Verifique sua internet.')
        : e;
    });
  } catch (e) { return Promise.reject(e); }
}

// ── DOM ───────────────────────────────────────────────────────
function g(id) { return document.getElementById(id); }

function shAl(id, msg, t) {
  var el = g(id); if (!el) return;
  var cls = { e: 'al-e', s: 'al-s', w: 'al-w', i: 'al-i' }[t] || 'al-i';
  el.innerHTML = msg ? '<div class="al ' + cls + '">' + msg + '</div>' : '';
  if (t === 's') setTimeout(function () { if (el) el.innerHTML = ''; }, 7000);
}
function clrAl(id) { var el = g(id); if (el) el.innerHTML = ''; }

function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fdate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('pt-BR'); } catch (e) { return '—'; }
}
function fdatefull(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('pt-BR',
      { day: '2-digit', month: 'long', year: 'numeric' });
  } catch (e) { return fdate(d); }
}

function mCPF(inp) {
  var v = inp.value.replace(/\D/g, '').substring(0, 11);
  v = v.replace(/(\d{3})(\d)/, '$1.$2')
       .replace(/(\d{3})(\d)/, '$1.$2')
       .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  inp.value = v;
}

// ── STATUS BADGES ─────────────────────────────────────────────
var SLBL = { pending: 'Pendente', in_review: 'Em análise', active: 'Ativo',
             paused: 'Pausado', concluded: 'Concluído', archived: 'Arquivado' };
var SCLS = { pending: 'bp', in_review: 'br', active: 'ba',
             paused: 'bpa', concluded: 'bc', archived: 'bc' };
function sbdg(s) {
  return '<span class="bdg ' + (SCLS[s] || 'bp') + '">' + (SLBL[s] || esc(s)) + '</span>';
}

// ── MODAL ─────────────────────────────────────────────────────
function oM(id) { var el = g(id); if (el) el.classList.add('open'); }
function cM(id) { var el = g(id); if (el) el.classList.remove('open'); }
document.addEventListener('click', function (e) {
  if (e.target && e.target.classList && e.target.classList.contains('mo'))
    e.target.classList.remove('open');
});

// ── SECTION SWITCH (sidebar navigation) ───────────────────────
function showS(n) {
  var all = document.querySelectorAll('[data-s]');
  for (var i = 0; i < all.length; i++) all[i].classList.remove('act');
  var el = document.querySelector('[data-s="' + n + '"]');
  if (el) el.classList.add('act');
  var links = document.querySelectorAll('.sb-nav a');
  for (var j = 0; j < links.length; j++) links[j].classList.remove('act');
  var active = document.querySelector('.sb-nav a[data-p="' + n + '"]');
  if (active) active.classList.add('act');
  // Auto-close mobile sidebar
  var sbEl = g('sb'), ov = g('sb-overlay');
  if (sbEl && window.innerWidth <= 768) {
    sbEl.classList.remove('open');
    if (ov) ov.classList.remove('open');
  }
}

// ── SIDEBAR TOGGLE (mobile) ────────────────────────────────────
function toggleSb() {
  var sbEl = g('sb'), ov = g('sb-overlay');
  if (sbEl) sbEl.classList.toggle('open');
  if (ov)   ov.classList.toggle('open');
}

// ── ACTIVITY LOG ─────────────────────────────────────────────
function lgAct(type, detail, role) {
  if (!SB_OK) return;
  var aid = (window.CU && window.CU.id) || (window.CS && window.CS.id) || null;
  var anm = (window.CP && window.CP.full_name) || (window.CS && window.CS.staff_name)
          || (window.CU && window.CU.email) || 'Sistema';
  q(function (s) {
    return s.from('activity_logs').insert({
      actor_id: aid, actor_name: anm,
      actor_role: role || 'system',
      action_type: type, action_detail: String(detail)
    });
  }).catch(function () {});
}

// ── FILE UPLOAD ───────────────────────────────────────────────
var selFiles = [];

function hFiles(files) {
  var arr = Array.prototype.slice.call(files || []);
  for (var i = 0; i < arr.length; i++)
    if (arr[i].size <= 20 * 1024 * 1024) selFiles.push(arr[i]);
  rFL();
}

function hDrop(e) {
  e.preventDefault();
  var dr = g('fdr'); if (dr) dr.classList.remove('ov');
  hFiles(e.dataTransfer ? e.dataTransfer.files : []);
}

function rmFile(i) { selFiles.splice(i, 1); rFL(); }

function rFL() {
  var el = g('fli'); if (!el) return;
  el.innerHTML = selFiles.map(function (f, i) {
    return '<div class="fit"><span>📄</span><span class="fnm">' + esc(f.name) + '</span>'
         + '<span style="font-size:.69rem;color:var(--muted)">' + (f.size / 1024).toFixed(0) + 'KB</span>'
         + '<span class="frm" onclick="rmFile(' + i + ')">✕</span></div>';
  }).join('');
}

function uploadFiles(caseId, uploaderName, uploaderId) {
  if (!selFiles.length) return Promise.resolve();
  var done = selFiles.map(function (f) {
    var fn = Date.now() + '_' + f.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    return q(function (s) { return s.storage.from('case-files').upload(fn, f); })
      .then(function () {
        return q(function (s) { return s.storage.from('case-files').getPublicUrl(fn); });
      }).then(function (r) {
        var url = r && r.data ? r.data.publicUrl : null;
        return q(function (s) {
          return s.from('case_files').insert({
            case_id: caseId, file_name: f.name, file_url: url,
            file_type: f.type, file_size: f.size,
            uploaded_by: uploaderId, uploaded_by_name: uploaderName
          });
        });
      }).catch(function (e) { console.warn('Upload erro:', f.name, e.message); });
  });
  return Promise.all(done).then(function () { selFiles = []; rFL(); });
}
