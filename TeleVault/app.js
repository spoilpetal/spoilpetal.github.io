(() => {
'use strict';

const THEME_KEY = 'tele-vault-theme';
const THEMES = ['dark','light','ocean','forest'];

function applyTheme(name){
  if(!THEMES.includes(name)) name = 'dark';
  document.documentElement.setAttribute('data-theme', name);
  try { localStorage.setItem(THEME_KEY, name); } catch(e){}
  document.querySelectorAll('.theme-swatch').forEach(el => {
    el.classList.toggle('active', el.dataset.swatch === name);
  });
}
function initTheme(){
  let saved = 'dark';
  try { saved = localStorage.getItem(THEME_KEY) || 'dark'; } catch(e){}
  applyTheme(saved);
}

const state = {
  chats: [],
  myProfile: {
    name: 'You', userId: null, username: null, phone: null, bio: null,
    birthday: null, avatar: null, stories: [], profileMusic: []
  },
  mediaMap: new Map(),
  blobCache: new Map(),
  domCache: new Map(),
  activeChatId: null,
  viewerList: [],
  viewerIndex: -1,
  loadToken: 0,
  chatSearchQuery: '',
  inApp: false,
};

const $ = id => document.getElementById(id);
const isMobile = () => window.matchMedia('(max-width:860px)').matches;

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  wireLanding();
  wireApp();
  wireMenu();
  wireDrawers();
  wireLightbox();
  wireSwipeBack();
  wireHistory();
  boot();
});

function showLanding(){
  const landing = $('landing');
  const app = $('app');
  if(landing) landing.style.display = 'flex';
  if(app) app.hidden = true;
  state.inApp = false;
}

function showApp(){
  const landing = $('landing');
  const app = $('app');
  if(landing) landing.style.display = 'none';
  if(app) app.hidden = false;
  state.inApp = true;
  if(isMobile()){
    const sb = $('sidebar');
    if(sb) sb.classList.remove('hidden');
  }
}

function wireHistory(){
  if(!history.state || !history.state.view){
    history.replaceState({ view: 'landing' }, '', location.pathname + location.search);
  }
  window.addEventListener('popstate', e => {
    const st = e.state || { view: 'landing' };
    if(st.view === 'chat' && st.chatId && state.chats.some(c => c.id === st.chatId)){
      showApp();
      openChat(st.chatId, { skipHistory: true });
    } else if(st.view === 'app'){
      showApp();
      closeAllOverlays();
      if(isMobile()) backToChatList({ skipHistory: true });
    } else {
      closeAllOverlays();
      showLanding();
    }
  });
}

function pushView(view, extra){
  const st = Object.assign({ view }, extra || {});
  history.pushState(st, '', location.pathname + location.search);
}

function closeAllOverlays(){
  window.closeLightbox?.();
  window.closeProfile?.();
  window.closeGallery?.();
  const menu = $('app-menu');
  if(menu) menu.classList.remove('open');
}

function wireLanding(){
  const enter = $('enter-btn');
  if(enter){
    enter.addEventListener('click', () => {
      pushView('app');
      showApp();
    });
  }
}

function backToChatList(opts){
  const skipHistory = opts && opts.skipHistory;
  const sb = $('sidebar');
  if(sb) sb.classList.remove('hidden');
  state.activeChatId = null;
  const header = $('chat-header');
  if(header) header.style.display = 'none';
  const msgs = $('messages');
  if(msgs) msgs.innerHTML = '';
  const pane = $('chat-pane');
  if(pane) pane.classList.add('empty');
  const bar = $('chat-search-bar');
  if(bar) bar.style.display = 'none';
  const csInput = $('chat-search-input');
  if(csInput) csInput.value = '';
  state.chatSearchQuery = '';
  if(!skipHistory && isMobile()){
    // if we are not at "app" state in history, replace it, otherwise leave as-is
    const st = history.state || {};
    if(st.view === 'chat'){
      history.back();
    }
  }
}

function wireSwipeBack(){
  let startX = 0, startY = 0, tracking = false;
  document.addEventListener('touchstart', e => {
    if(e.touches.length !== 1) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    tracking = startX < 40;
  }, { passive: true });
  document.addEventListener('touchend', e => {
    if(!tracking) return;
    tracking = false;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = Math.abs(e.changedTouches[0].clientY - startY);
    if(dx > 70 && dy < 60){
      if($('lightbox')?.classList.contains('show')) { history.back(); return; }
      if($('profile')?.classList.contains('open')) { history.back(); return; }
      if($('gallery')?.classList.contains('open')) { history.back(); return; }
      if(isMobile() && state.activeChatId){ history.back(); }
    }
  }, { passive: true });
}

function wireApp(){
  const chatListEl = $('chat-list');
  const messagesEl = $('messages');
  const statusEl   = $('status');
  const chatPaneEl = $('chat-pane');
  const chatHeaderEl = $('chat-header');
  const chatTitleEl = $('chat-title-main');
  const chatSubtitle = $('chat-subtitle');
  const chatAvatarEl = $('chat-avatar');
  const myProfileCard = $('my-profile-card');
  const loadingOv = $('loading-overlay');
  const loadingTxt = $('loading-text');

  if(!chatListEl) return;

  $('btn-load-json')?.addEventListener('click', () => { $('json-input').value=''; $('json-input').click(); });
  $('btn-load-folder')?.addEventListener('click', () => { $('folder-input').value=''; $('folder-input').click(); });
  $('search')?.addEventListener('input', e => renderChatList(e.target.value.trim().toLowerCase()));

  $('btn-back')?.addEventListener('click', () => {
    if(isMobile() && state.activeChatId){
      history.back();
    } else {
      backToChatList();
    }
  });

  chatHeaderEl?.addEventListener('click', e => {
    if(e.target.closest('button')) return;
    if(state.activeChatId) openChatProfile(state.activeChatId);
  });
  $('btn-chat-profile')?.addEventListener('click', e => { e.stopPropagation(); if(state.activeChatId) openChatProfile(state.activeChatId); });
  $('btn-gallery')?.addEventListener('click', e => { e.stopPropagation(); if(state.activeChatId) openGallery(state.activeChatId); });
  $('btn-chat-search')?.addEventListener('click', e => {
    e.stopPropagation();
    const bar = $('chat-search-bar');
    bar.style.display = bar.style.display === 'none' ? 'flex' : 'none';
    if(bar.style.display === 'flex') $('chat-search-input').focus();
    else { state.chatSearchQuery=''; $('chat-search-input').value=''; }
  });
  $('btn-chat-search-close')?.addEventListener('click', () => {
    $('chat-search-bar').style.display='none';
    $('chat-search-input').value='';
    state.chatSearchQuery='';
    if(state.activeChatId) rerenderActiveChat();
  });
  $('chat-search-input')?.addEventListener('input', e => {
    state.chatSearchQuery = e.target.value.trim().toLowerCase();
    if(state.activeChatId) rerenderActiveChat();
  });

  myProfileCard?.addEventListener('click', () => openMyProfile());
  $('btn-my-profile')?.addEventListener('click', e => { e.stopPropagation(); openMyProfile(); });

  $('json-input')?.addEventListener('change', async e => {
    const f = e.target.files[0]; if(!f) return;
    const token = ++state.loadToken;
    showLoading('Reading ' + f.name + '…');
    try {
      const text = await f.text();
      if(token !== state.loadToken) return;
      showLoading('Parsing JSON…');
      await new Promise(r => setTimeout(r, 10));
      const data = JSON.parse(text);
      if(token !== state.loadToken) return;
      resetState();
      const result = buildChatsFromJSON(data);
      state.chats = result.chats;
      if(result.me) setMyProfile(result.me);
      if(!state.chats.length){
        const topKeys = Array.isArray(data) ? '[array]' : Object.keys(data);
        setStatus('Parsed but 0 chats. Keys: ' + JSON.stringify(topKeys).slice(0, 200));
        hideLoading();
        return;
      }
      finishLoad();
    } catch(err){
      console.error(err);
      setStatus('JSON error: ' + err.message);
      hideLoading();
    }
  });

  $('folder-input')?.addEventListener('change', async e => {
    const files = e.target.files; if(!files || !files.length) return;
    const token = ++state.loadToken;
    showLoading(`Scanning ${files.length} files…`);
    await new Promise(r => setTimeout(r, 10));
    resetState();

    const jsonCandidates = [];
    const htmlCandidates = [];
    for(const f of files){
      state.mediaMap.set(f.name, f);
      const lower = f.name.toLowerCase();
      const path = (f.webkitRelativePath || f.name).toLowerCase();
      if(lower === 'result.json') jsonCandidates.push(f);
      if(lower.endsWith('.html') && (
          /^messages(\d+)?\.html$/.test(lower) || /\/messages\.html$/.test(path)
      )) htmlCandidates.push(f);
    }
    const depth = f => f.webkitRelativePath ? f.webkitRelativePath.split('/').length : 999;
    jsonCandidates.sort((a,b) => depth(a) - depth(b));
    htmlCandidates.sort((a,b) => (a.webkitRelativePath||a.name).localeCompare(b.webkitRelativePath||b.name, undefined, {numeric:true}));
    const jsonFile = jsonCandidates[0] || null;

    if(!jsonFile && !htmlCandidates.length){
      setStatus('No result.json or messages*.html found in folder');
      hideLoading();
      return;
    }

    try {
      if(jsonFile){
        showLoading('Parsing result.json…');
        await new Promise(r => setTimeout(r, 10));
        const data = JSON.parse(await jsonFile.text());
        if(token !== state.loadToken) return;
        const result = buildChatsFromJSON(data);
        state.chats = result.chats;
        if(result.me) setMyProfile(result.me);
        if(htmlCandidates.length){
          const existing = new Set(state.chats.map(c => c.name));
          for(let i=0;i<htmlCandidates.length;i++){
            if(token !== state.loadToken) return;
            showLoading(`Parsing HTML ${i+1}/${htmlCandidates.length}…`);
            await new Promise(r => setTimeout(r, 5));
            const hf = htmlCandidates[i];
            const chats = buildChatsFromHTML(await hf.text());
            chats.forEach(c => {
              if(!existing.has(c.name)){ state.chats.push(c); existing.add(c.name); }
            });
          }
        }
      } else {
        const all = [];
        let guessedMe = null;
        for(let i=0;i<htmlCandidates.length;i++){
          if(token !== state.loadToken) return;
          showLoading(`Parsing HTML ${i+1}/${htmlCandidates.length}…`);
          await new Promise(r => setTimeout(r, 5));
          const hf = htmlCandidates[i];
          const chats = buildChatsFromHTML(await hf.text());
          chats.forEach(c => {
            if(!c.name || c.name === 'Telegram export'){
              c.name = (hf.webkitRelativePath||hf.name).replace(/^.*\//,'').replace(/\.html$/i,'');
            }
            if(!guessedMe){
              const out = c.messages.find(m => m.out && m.from);
              if(out && out.from) guessedMe = out.from;
            }
            all.push(c);
          });
        }
        state.chats = all;
        if(guessedMe) setMyProfile({ name: guessedMe, userId: null, username: null, phone: null });
      }
      if(token !== state.loadToken) return;
      if(!state.chats.length){ setStatus('Parsed files but 0 chats'); hideLoading(); return; }
      finishLoad();
    } catch(err){
      console.error(err);
      setStatus('Parse error: ' + err.message);
      hideLoading();
    }
  });

  function renderChatList(filter){
    chatListEl.innerHTML = '';
    const list = state.chats.filter(c => !filter || c.name.toLowerCase().includes(filter));
    if(!list.length){
      const d = document.createElement('div');
      d.style.cssText = 'padding:24px 16px;color:var(--muted);font-size:12.5px;text-align:center;line-height:1.5';
      d.textContent = state.chats.length ? 'No chats match your search'
        : 'No chats loaded yet. Use Load JSON or Load Folder.';
      chatListEl.appendChild(d);
      return;
    }
    const frag = document.createDocumentFragment();
    list.forEach(chat => {
      const item = document.createElement('div');
      item.className = 'chat-item' + (chat.id === state.activeChatId ? ' active' : '');
      item.dataset.chatId = chat.id;
      item.addEventListener('click', () => openChat(chat.id, { fromTop: true }));
      const av = document.createElement('div');
      av.className = 'avatar avatar-sm';
      av.style.background = avatarColor(chat.name);
      av.textContent = initial(chat.name);
      const meta = document.createElement('div');
      meta.className = 'chat-meta';
      const title = document.createElement('div');
      title.className = 'chat-title'; title.textContent = chat.name;
      const prev = document.createElement('div');
      prev.className = 'chat-preview'; prev.textContent = chatPreview(chat.messages);
      meta.appendChild(title); meta.appendChild(prev);
      item.appendChild(av); item.appendChild(meta);
      frag.appendChild(item);
    });
    chatListEl.appendChild(frag);
  }

  function openChat(chatId, opts){
    const skipHistory = opts && opts.skipHistory;
    const chat = state.chats.find(c => c.id === chatId);
    if(!chat){ setStatus('Chat not found: ' + chatId); return; }
    state.activeChatId = chatId;
    state.chatSearchQuery = '';
    $('chat-search-input').value = '';
    $('chat-search-bar').style.display = 'none';
    chatListEl.querySelectorAll('.chat-item').forEach(el => {
      el.classList.toggle('active', el.dataset.chatId === chatId);
    });
    chatPaneEl.classList.remove('empty');
    chatHeaderEl.style.display = 'flex';
    chatTitleEl.textContent = chat.name;
    chatSubtitle.textContent = `${chat.messages.length} message${chat.messages.length === 1 ? '' : 's'}`;
    chatAvatarEl.style.background = avatarColor(chat.name);
    chatAvatarEl.textContent = initial(chat.name);
    if(isMobile()) $('sidebar').classList.add('hidden');
    if(!skipHistory){
      pushView('chat', { chatId });
    }
    if(state.domCache.has(chatId)){
      messagesEl.innerHTML = '';
      messagesEl.appendChild(state.domCache.get(chatId));
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return;
    }
    renderChatChunked(chat);
  }
  window._tvOpenChat = openChat;

  function rerenderActiveChat(){
    const chat = state.chats.find(c => c.id === state.activeChatId);
    if(!chat) return;
    state.domCache.delete(chat.id);
    messagesEl.innerHTML = '';
    renderChatChunked(chat);
  }

  function renderChatChunked(chat){
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '2px';
    messagesEl.innerHTML = '';
    messagesEl.appendChild(container);

    const viewerList = [];
    chat.messages.forEach(m => {
      const p = m.isHtml ? m.media : (m.photo || m.file);
      if(!p) return;
      const name = basename(p);
      if(!state.mediaMap.has(name)) return;
      const url = getBlobUrl(name);
      const kind = kindOf(state.mediaMap.get(name), m.media_type, m.mime_type);
      if(kind === 'image' || kind === 'video' || kind === 'gif' || kind === 'audio'){
        viewerList.push({ url, kind, name });
      }
    });
    state.viewerList = viewerList;

    const filter = state.chatSearchQuery;
    let i = 0, lastDateKey = null, lastSender = null, prevDateTs = 0;
    const CHUNK = 80;

    function step(){
      const end = Math.min(i + CHUNK, chat.messages.length);
      const frag = document.createDocumentFragment();
      for(; i < end; i++){
        const msg = chat.messages[i];
        if(msg.type === 'service'){
          if(!filter || (msg.text || '').toLowerCase().includes(filter)){
            const s = document.createElement('div');
            s.className = 'service-line';
            s.textContent = msg.text || msg.action || 'Service message';
            frag.appendChild(s);
          }
          lastSender = null;
          continue;
        }
        const body = msg.isHtml ? (msg.text || '').replace(/<[^>]+>/g, '') : jsonBody(msg);
        if(filter && !body.toLowerCase().includes(filter)) continue;

        const dk = dateKey(msg.date);
        if(dk !== lastDateKey && dk !== 'unknown'){
          const sep = document.createElement('div');
          sep.className = 'date-sep';
          sep.textContent = fmtDate(msg.date);
          frag.appendChild(sep);
          lastDateKey = dk; lastSender = null;
        }

        let isOut;
        if(msg.isHtml) isOut = msg.out === true;
        else isOut = msg.out === true
          || (chat.myUserId && msg.from_id === chat.myUserId)
          || (chat.myUserIdNum && msg.from_id === chat.myUserIdNum)
          || (msg.from_id == null && !msg.from);

        const senderName = msg.from || (isOut ? 'You' : chat.name);
        const senderKey = isOut ? '__me__' : senderName;
        const ts = msg.date ? Date.parse(msg.date) : 0;
        const grouped = (senderKey === lastSender) && (ts - prevDateTs < 5*60*1000);
        const firstInGroup = !grouped;

        const row = document.createElement('div');
        row.className = 'bubble-row ' + (isOut ? 'out' : 'in') + (firstInGroup ? ' first-in-group' : '');
        const bubble = document.createElement('div');
        bubble.className = 'bubble ' + (isOut ? 'out' : 'in');

        if(!isOut && firstInGroup && senderName !== chat.name){
          const s = document.createElement('div');
          s.className = 'sender'; s.textContent = senderName;
          bubble.appendChild(s);
        }
        if(body && body.trim()){
          const t = document.createElement('div');
          if(msg.isHtml) t.innerHTML = msg.text; else t.textContent = body;
          bubble.appendChild(t);
        }

        const mediaPath = msg.isHtml ? msg.media : (msg.photo || msg.file);
        if(mediaPath){
          const name = basename(mediaPath);
          const file = state.mediaMap.get(name);
          if(file){
            const url = getBlobUrl(name);
            const kind = kindOf(file, msg.media_type, msg.mime_type);
            if(kind === 'image'){
              const img = document.createElement('img');
              img.className = 'media'; img.src = url; img.alt = name; img.loading = 'lazy';
              img.onclick = () => openViewerByUrl(url);
              bubble.appendChild(img);
            } else if(kind === 'sticker'){
              const img = document.createElement('img');
              img.className = 'sticker'; img.src = url; img.alt = name;
              img.onclick = () => openViewerByUrl(url);
              bubble.appendChild(img);
            } else if(kind === 'gif'){
              const v = document.createElement('video');
              v.className = 'media'; v.src = url;
              v.autoplay = true; v.muted = true; v.loop = true; v.playsInline = true;
              v.onclick = () => openViewerByUrl(url);
              bubble.appendChild(v);
            } else if(kind === 'video'){
              const v = document.createElement('video');
              v.className = 'media'; v.src = url; v.controls = true; v.preload = 'metadata';
              bubble.appendChild(v);
            } else if(kind === 'audio'){
              bubble.appendChild(buildAudioCard(url, name));
            } else {
              const ext = (name.split('.').pop() || '').toUpperCase().slice(0, 4);
              const a = document.createElement('a');
              a.href = url;
              a.download = name;
              a.target = '_blank';
              a.className = 'file-card';
              a.innerHTML =
                '<span class="fc-ico">' + ext + '</span>' +
                '<span class="fc-meta">' +
                  '<span class="fc-name"></span>' +
                  '<span class="fc-sub">Click to download</span>' +
                '</span>';
              a.querySelector('.fc-name').textContent = name;
              bubble.appendChild(a);
            }
          } else {
            const miss = document.createElement('div');
            miss.className = 'missing';
            miss.textContent = '📎 ' + name + ' (not found)';
            bubble.appendChild(miss);
          }
        }

        if(msg.date){
          const t = document.createElement('span');
          t.className = 'time'; t.textContent = fmtTime(msg.date);
          if(isOut){
            const tick = document.createElement('span');
            tick.className = 'tick'; tick.textContent = '✓✓';
            t.appendChild(tick);
          }
          bubble.appendChild(t);
        }
        row.appendChild(bubble);
        frag.appendChild(row);
        lastSender = senderKey; prevDateTs = ts;
      }
      container.appendChild(frag);
      if(i < chat.messages.length) setTimeout(step, 0);
      else {
        state.domCache.set(chat.id, container);
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }
    }
    step();
  }

  function setStatus(t){ if(statusEl) statusEl.textContent = t; }
  function showLoading(t){ if(loadingTxt) loadingTxt.textContent = t || 'Loading…'; if(loadingOv) loadingOv.classList.add('show'); }
  function hideLoading(){ if(loadingOv) loadingOv.classList.remove('show'); }
  function resetState(){
    state.mediaMap = new Map();
    state.blobCache = new Map();
    state.domCache.clear();
    state.chats = [];
    state.activeChatId = null;
    state.viewerList = [];
    state.viewerIndex = -1;
    state.chatSearchQuery = '';
    if(messagesEl) messagesEl.innerHTML = '';
    if(chatHeaderEl) chatHeaderEl.style.display = 'none';
    if(chatPaneEl) chatPaneEl.classList.add('empty');
  }
  function finishLoad(){
    const seen = new Set();
    state.chats.forEach((c,i) => { if(!c.id || seen.has(c.id)) c.id = 'chat_' + i; seen.add(c.id); });
    setStatus(`${state.chats.length} chat(s) · ${state.mediaMap.size} media`);
    hideLoading();

    const searchEl = $('search');
    if(searchEl) searchEl.value = '';

    const sb = $('sidebar');
    if(sb) sb.classList.remove('hidden');      // ALWAYS: force sidebar visible

    renderChatList('');

    const list = $('chat-list');
    if(list){
       void list.offsetHeight;
       list.style.display = 'none';
       void list.offsetHeight;
       list.style.display = '';
    }

   // ALWAYS: if we're not on desktop-wide, don't open a chat — leave the list visible
    if(window.matchMedia('(min-width:861px)').matches){
      if(state.chats[0]) openChat(state.chats[0].id);
    } else {
      // Ensure chat pane is empty so nothing overlays the list
      const pane = $('chat-pane');
      if(pane) pane.classList.add('empty');
      const header = $('chat-header');
      if(header) header.style.display = 'none';
      const msgs = $('messages');
      if(msgs) msgs.innerHTML = '';
    }
  }

  function openMyProfile(){
    const p = state.myProfile;
    renderAvatarInto($('profile-avatar'), p.name, p.avatar);
    $('profile-name').textContent = p.name;
    $('profile-status').textContent =
      (p.username ? '@' + p.username + ' · ' : '') +
      (p.userId ? 'id ' + p.userId : 'local account');

    const stats = $('profile-stats');
    stats.innerHTML = '';
    const totalMsgs = state.chats.reduce((n,c) => n + c.messages.length, 0);
    const mediaMsgs = state.chats.reduce((n,c) => n + c.messages.filter(m => m.media||m.photo||m.file).length, 0);
    const rows = [
      ['Chats loaded', state.chats.length],
      ['Total messages', totalMsgs],
      ['Media items', mediaMsgs],
    ];
    if(p.userId) rows.push(['User ID', p.userId]);
    if(p.username) rows.push(['Username', '@' + p.username]);
    if(p.phone) rows.push(['Phone', p.phone]);
    if(p.bio) rows.push(['Bio', p.bio]);
    if(p.birthday) rows.push(['Birthday', p.birthday]);
    rows.forEach(([k,v]) => {
      const r = document.createElement('div');
      r.className = 'row';
      r.innerHTML = '<span>' + k + '</span><b>' + v + '</b>';
      stats.appendChild(r);
    });

    const extra = $('profile-extra');
    extra.innerHTML = '';

    if(p.stories && p.stories.length){
      p.stories.forEach((s, idx) => {
        const card = document.createElement('div');
        card.className = 'card';
        const mediaFile = s.media || s.photo || s.file || null;
        const blobUrl = mediaFile ? getBlobUrl(basename(mediaFile)) : null;
        const label = s.expires ? 'Expires ' + s.expires : 'Active';
        card.innerHTML = '<div class="ico">📖</div><div><strong>Story ' + (idx+1) + '</strong><small>' + label + '</small></div>';
        if(blobUrl){
          card.style.cursor = 'pointer';
          card.onclick = () => openViewerByUrl(blobUrl);
        }
        extra.appendChild(card);
      });
    }

    if(p.profileMusic && p.profileMusic.length){
      p.profileMusic.forEach(m => {
        const card = document.createElement('div');
        card.className = 'card';
        const blobUrl = m.file ? getBlobUrl(basename(m.file)) : null;
        const name = m.file_name || basename(m.file || '') || 'Profile music';
        const dur = m.duration_seconds ? fmtDuration(m.duration_seconds) : '';
        
        if(blobUrl){
          const audioWrap = document.createElement('div');
          audioWrap.style.width = '100%';
          const player = buildAudioCard(blobUrl, name);
          audioWrap.appendChild(player);
          card.innerHTML = '<div class="ico">🎵</div><div style="flex:1;min-width:0;"><strong></strong><small></small></div>';
          card.querySelector('strong').textContent = name;
          card.querySelector('small').textContent = dur ? dur + ' .profile music' : 'Profile music';
          card.appendChild(audioWrap);
          card.style.flexWrap = 'wrap';
        } else {
          card.innerHTML = '<div class="ico">🎵</div><div><strong>' + name + '</strong><small>' + (dur || 'Profile music') + ' .file not loaded</small></div>';
        }
        extra.appendChild(card);
      });
    }

    if(p.birthday){
      const bdayCard = document.createElement('div');
      bdayCard.className = 'card';
      bdayCard.innerHTML = '<div class="ico">🎂</div><div><strong>Birthday</strong><small>' + p.birthday + '</small></div>';
      extra.appendChild(bdayCard);
    }

    openProfileDrawer();
    pushView('overlay', { overlay: 'profile' });
  }
  window._tvOpenMyProfile = openMyProfile;

  function openChatProfile(chatId){
    const chat = state.chats.find(c => c.id === chatId);
    if(!chat) return;
    const mediaCount = chat.messages.filter(m => m.media || m.photo || m.file).length;
    let typeLabel = 'Chat';
    if(chat.type === 'personal_chat') typeLabel = 'Private chat';
    else if(chat.type === 'private_group' || chat.type === 'public_group') typeLabel = 'Group chat';
    else if(chat.type === 'private_supergroup' || chat.type === 'public_supergroup') typeLabel = 'Supergroup';
    else if(chat.type === 'private_channel' || chat.type === 'public_channel') typeLabel = 'Channel';
    else if(chat.type === 'saved_messages') typeLabel = 'Saved messages';
    else if(chat.type === 'bot_chat') typeLabel = 'Bot';

    renderAvatarInto($('profile-avatar'), chat.name, null);
    $('profile-name').textContent = chat.name;
    $('profile-status').textContent = typeLabel;

    const stats = $('profile-stats');
    stats.innerHTML = '';
    const rows = [
      ['Messages', chat.messages.length],
      ['Media', mediaCount],
    ];
    if(chat.peerKey) rows.push(['Peer', chat.peerKey]);
    if(chat.participants){
      const n = Array.isArray(chat.participants) ? chat.participants.length : (chat.participants.length || 0);
      if(n) rows.push(['Participants', n]);
    }
    rows.forEach(([k,v]) => {
      const r = document.createElement('div');
      r.className = 'row';
      r.innerHTML = '<span>' + k + '</span><b>' + v + '</b>';
      stats.appendChild(r);
    });

    const extra = $('profile-extra');
    extra.innerHTML = '';
    openProfileDrawer();
    pushView('overlay', { overlay: 'profile' });
  }

  function openGallery(chatId){
    const chat = state.chats.find(c => c.id === chatId);
    if(!chat) return;
    const galleryGrid = $('gallery-grid');
    $('gallery-title').textContent = 'Media in “' + chat.name + '”';
    galleryGrid.innerHTML = '';
    const items = [];
    chat.messages.forEach(m => {
      const p = m.isHtml ? m.media : (m.photo || m.file);
      if(!p) return;
      const name = basename(p);
      if(!state.mediaMap.has(name)) return;
      const url = getBlobUrl(name);
      const kind = kindOf(state.mediaMap.get(name), m.media_type, m.mime_type);
      if(kind === 'image' || kind === 'video' || kind === 'gif' || kind === 'audio'){
        items.push({ url, kind, name });
      }
    });
    if(!items.length){
      const empty = document.createElement('div');
      empty.className = 'tile empty';
      empty.textContent = 'No media in this chat';
      galleryGrid.appendChild(empty);
    } else {
      items.forEach(item => {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.onclick = () => openViewerByUrl(item.url);
        if(item.kind === 'video' || item.kind === 'gif'){
          const v = document.createElement('video');
          v.src = item.url; v.muted = true; v.playsInline = true; v.preload = 'metadata';
          tile.appendChild(v);
          const badge = document.createElement('span');
          badge.className = 'badge';
          badge.textContent = item.kind === 'gif' ? 'GIF' : '▶';
          tile.appendChild(badge);
        } else if(item.kind === 'image' || item.kind === 'sticker'){
          const img = document.createElement('img');
          img.src = item.url; img.alt = item.name; img.loading = 'lazy';
          tile.appendChild(img);
        } else {
          const badge = document.createElement('span');
          badge.className = 'badge';
          badge.textContent = item.kind === 'audio' ? '♪' : '📎';
          tile.appendChild(badge);
        }
        galleryGrid.appendChild(tile);
      });
    }
    state.viewerList = items;
    state.viewerIndex = -1;
    openGalleryDrawer();
    pushView('overlay', { overlay: 'gallery' });
  }
  window._tvOpenGallery = openGallery;
}

function wireMenu(){
  const appMenuEl = $('app-menu');
  const btnMenu = $('btn-menu');
  if(!btnMenu || !appMenuEl) return;
  btnMenu.addEventListener('click', e => {
    e.stopPropagation();
    appMenuEl.classList.toggle('open');
  });
  document.addEventListener('click', e => {
    if(!appMenuEl.contains(e.target) && e.target !== btnMenu) appMenuEl.classList.remove('open');
  });
  $('menu-my-profile')?.addEventListener('click', () => { appMenuEl.classList.remove('open'); window._tvOpenMyProfile?.(); });
  $('menu-media')?.addEventListener('click', () => { appMenuEl.classList.remove('open'); if(state.activeChatId) window._tvOpenGallery?.(state.activeChatId); });
  $('menu-load-json')?.addEventListener('click', () => { appMenuEl.classList.remove('open'); $('json-input').value=''; $('json-input').click(); });
  $('menu-load-folder')?.addEventListener('click', () => { appMenuEl.classList.remove('open'); $('folder-input').value=''; $('folder-input').click(); });
  document.querySelectorAll('.theme-swatch').forEach(el => {
    el.addEventListener('click', () => {
      applyTheme(el.dataset.swatch);
    });
  });
}

function wireDrawers(){
  const profileEl = $('profile');
  const profileBack = $('profile-backdrop');
  const galleryEl = $('gallery');
  const galleryBack = $('gallery-backdrop');
  window.openProfileDrawer = () => { profileEl?.classList.add('open'); profileBack?.classList.add('open'); };
  window.openGalleryDrawer = () => { galleryEl?.classList.add('open'); galleryBack?.classList.add('open'); };
  function closeProfile(){ profileEl?.classList.remove('open'); profileBack?.classList.remove('open'); }
  function closeGallery(){ galleryEl?.classList.remove('open'); galleryBack?.classList.remove('open'); }
  window.closeProfile = closeProfile;
  window.closeGallery = closeGallery;
  $('btn-profile-close')?.addEventListener('click', closeProfile);
  profileBack?.addEventListener('click', closeProfile);
  $('btn-gallery-close')?.addEventListener('click', closeGallery);
  galleryBack?.addEventListener('click', closeGallery);
}

function wireLightbox(){
  const lightbox = $('lightbox');
  const lbContent = $('lb-content');
  const lbCaption = $('lb-caption');
  if(!lightbox) return;
  lightbox.addEventListener('click', e => { if(e.target === lightbox) closeLightbox(); });
  $('lb-close')?.addEventListener('click', closeLightbox);
  $('lb-prev')?.addEventListener('click', e => { e.stopPropagation(); navViewer(-1); });
  $('lb-next')?.addEventListener('click', e => { e.stopPropagation(); navViewer(1); });
  $('lb-download')?.addEventListener('click', e => {
    e.stopPropagation();
    const cur = state.viewerList[state.viewerIndex]; if(!cur) return;
    const a = document.createElement('a');
    a.href = cur.url; a.download = cur.name || 'file';
    document.body.appendChild(a); a.click(); a.remove();
  });
  $('lb-sound')?.addEventListener('click', e => {
    e.stopPropagation();
    const v = lbContent.querySelector('video');
    if(v){ v.muted = !v.muted; $('lb-sound').textContent = v.muted ? '🔇' : '🔊'; }
  });
  document.addEventListener('keydown', e => {
    if(e.key === 'Escape'){
      $('app-menu')?.classList.remove('open');
      if(lightbox.classList.contains('show')) { closeLightbox(); return; }
      if($('profile')?.classList.contains('open')) { window.closeProfile?.(); return; }
      if($('gallery')?.classList.contains('open')) { window.closeGallery?.(); return; }
    }
    if(!lightbox.classList.contains('show')) return;
    if(e.key === 'ArrowLeft') navViewer(-1);
    if(e.key === 'ArrowRight') navViewer(1);
  });

  function openViewerByUrl(url){
    const idx = state.viewerList.findIndex(v => v.url === url);
    if(idx < 0) return;
    state.viewerIndex = idx;
    showViewer();
    pushView('overlay', { overlay: 'lightbox' });
  }
  window.openViewerByUrl = openViewerByUrl;

  function showViewer(){
    const cur = state.viewerList[state.viewerIndex];
    if(!cur){ closeLightbox(); return; }
    lbContent.innerHTML = '';
    if(cur.kind === 'video' || cur.kind === 'gif'){
      const v = document.createElement('video');
      v.src = cur.url; v.controls = true; v.autoplay = true;
      v.muted = cur.kind === 'gif'; v.loop = cur.kind === 'gif';
      lbContent.appendChild(v);
      $('lb-sound').style.display = cur.kind === 'video' ? 'inline-block' : 'none';
      $('lb-sound').textContent = v.muted ? '🔇' : '🔊';
    } else if(cur.kind === 'audio'){
      const a = document.createElement('audio');
      a.src = cur.url; a.controls = true; a.autoplay = true;
      a.style.width = '340px';
      lbContent.appendChild(a);
      $('lb-sound').style.display = 'none';
    } else {
      const img = document.createElement('img');
      img.src = cur.url; img.alt = cur.name;
      lbContent.appendChild(img);
      $('lb-sound').style.display = 'none';
    }
    lbCaption.textContent = cur.name + '  (' + (state.viewerIndex + 1) + '/' + state.viewerList.length + ')';
    const multi = state.viewerList.length > 1;
    $('lb-prev').style.display = multi ? 'grid' : 'none';
    $('lb-next').style.display = multi ? 'grid' : 'none';
    lightbox.classList.add('show');
  }
  function navViewer(dir){
    if(!state.viewerList.length) return;
    state.viewerIndex = (state.viewerIndex + dir + state.viewerList.length) % state.viewerList.length;
    showViewer();
  }
  function closeLightbox(){
    lightbox.classList.remove('show');
    lbContent.innerHTML = '';
    lbCaption.textContent = '';
  }
  window.navViewer = navViewer;
  window.closeLightbox = closeLightbox;
}

function boot(){
  const myAvatarEl = $('my-avatar');
  const myNameEl = $('my-name');
  const myStatusEl = $('my-status-text');
  if(myAvatarEl){
    myAvatarEl.textContent = '?';
    myAvatarEl.style.background = avatarColor('You');
  }
  if(myNameEl) myNameEl.textContent = 'Not loaded';
  if(myStatusEl) myStatusEl.textContent = 'offline';
  showLanding();
}

function renderAvatarInto(el, name, avatarPath){
  if(!el) return;
  if(avatarPath){
    const blobUrl = getBlobUrl(basename(avatarPath));
    if(blobUrl){
      el.textContent = '';
      el.style.background = 'transparent';
      el.innerHTML = '<img src="' + blobUrl + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
      return;
    }
  }
  el.innerHTML = '';
  el.textContent = initial(name);
  el.style.background = avatarColor(name);
}

function setMyProfile(me){
  const cleanUser = me.username ? String(me.username).replace(/^@+/, '') : null;
  state.myProfile.name = me.name || 'You';
  state.myProfile.userId = me.userId || null;
  state.myProfile.username = cleanUser;
  state.myProfile.phone = me.phone || null;
  state.myProfile.bio = me.bio || null;
  state.myProfile.birthday = me.birthday || null;
  state.myProfile.avatar = me.avatar || null;
  state.myProfile.stories = Array.isArray(me.stories) ? me.stories : [];
  state.myProfile.profileMusic = Array.isArray(me.profileMusic) ? me.profileMusic : [];

  renderAvatarInto($('my-avatar'), state.myProfile.name, state.myProfile.avatar);
  const myNameEl = $('my-name');
  const myStatusEl = $('my-status-text');
  if(myNameEl) myNameEl.textContent = state.myProfile.name;
  if(myStatusEl) myStatusEl.textContent = 'online';
}

function byDate(a,b){
  const ta = a.date_unixtime ? +a.date_unixtime : (a.date ? Date.parse(a.date)/1000 : 0);
  const tb = b.date_unixtime ? +b.date_unixtime : (b.date ? Date.parse(b.date)/1000 : 0);
  return (isNaN(ta)?0:ta) - (isNaN(tb)?0:tb);
}

function peerKeyFromId(pid){
  if(pid == null) return null;
  if(typeof pid === 'number') return String(pid);
  if(typeof pid === 'string'){
    const m = pid.match(/^(user|chat|channel)(\d+)$/i);
    if(m) return m[1].toLowerCase() + m[2];
    if(/^\d+$/.test(pid)) return pid;
    return pid;
  }
  if(typeof pid === 'object'){
    if(pid.user_id != null) return 'user' + pid.user_id;
    if(pid.chat_id != null) return 'chat' + pid.chat_id;
    if(pid.channel_id != null) return 'channel' + pid.channel_id;
    if(pid._) return String(pid._);
  }
  return null;
}

function extractMe(data){
  const me = {
    name: 'You', userId: null, username: null, phone: null, bio: null,
    birthday: null, avatar: null, stories: [], profileMusic: []
  };
  if(!data) return me;

  const pi = data.personal_information;
  if(pi){
    const fn = pi.first_name || '';
    const ln = pi.last_name || '';
    const full = (fn + ' ' + ln).trim();
    if(full) me.name = full;
    else if(pi.name) me.name = pi.name;
    else if(pi.username) me.name = pi.username;
    me.userId = pi.user_id || null;
    me.username = pi.username || null;
    me.phone = pi.phone || pi.phone_number || pi.phoneNumber || null;
    me.bio = pi.bio || null;
    me.birthday = pi.birthday || null;
  }

  if(Array.isArray(data.profile_pictures) && data.profile_pictures.length){
    const latest = data.profile_pictures[data.profile_pictures.length - 1];
    if(latest && latest.photo) me.avatar = latest.photo;
  }

  if(Array.isArray(data.stories)) me.stories = data.stories;
  if(Array.isArray(data.profile_music)) me.profileMusic = data.profile_music;

  return me;
}

function normalizeChat(ch, index, me, forcedPeerKey){
  const messages = Array.isArray(ch.messages) ? ch.messages.slice().sort(byDate) : [];
  return {
    id: 'json_' + index,
    name: ch.name || ch.title || ('Chat ' + (index + 1)),
    type: ch.type || 'personal_chat',
    messages,
    peerKey: forcedPeerKey || peerKeyFromId(ch.id) || peerKeyFromId(ch.peer_id) || null,
    myUserId: me.userId ? 'user' + me.userId : null,
    myUserIdNum: me.userId || null,
    participants: ch.participants || null,
  };
}

function buildChatsFromJSON(data){
  const me = extractMe(data);

  if(Array.isArray(data)){
    const chats = data.filter(c => c && Array.isArray(c.messages)).map((c,i) => normalizeChat(c, i, me));
    return { chats, me };
  }

  if(data && data.chats){
    let chatList = [];
    if(Array.isArray(data.chats)) chatList = data.chats;
    else if(Array.isArray(data.chats.list)) chatList = data.chats.list;
    else if(data.chats.list && typeof data.chats.list === 'object'){
      chatList = Object.entries(data.chats.list).map(([k,v]) => ({ ...v, __peerKey: k }));
    }

    if(chatList.length && chatList.every(ch => Array.isArray(ch.messages))){
      const chats = chatList.map((ch,i) => normalizeChat(ch, i, me, ch.__peerKey));
      return { chats, me };
    }

    if(Array.isArray(data.messages)){
      const metaByPeer = new Map();
      chatList.forEach(ch => {
        const pk = ch.__peerKey || peerKeyFromId(ch.id) || peerKeyFromId(ch.peer_id);
        if(pk) metaByPeer.set(pk, ch);
      });
      const groups = new Map();
      data.messages.forEach(m => {
        let pk = peerKeyFromId(m.peer_id) || peerKeyFromId(m.from_id);
        if(!pk) pk = 'unknown';
        if(pk === 'unknown' && chatList.length === 1){
          pk = chatList[0].__peerKey || peerKeyFromId(chatList[0].id) || 'unknown';
        }
        if(!groups.has(pk)) groups.set(pk, []);
        groups.get(pk).push(m);
      });
      const chats = [];
      let i = 0;
      groups.forEach((msgs, pk) => {
        const meta = metaByPeer.get(pk);
        let name = (meta && (meta.name || meta.title));
        if(!name) name = pk === 'unknown' ? 'Chat (unknown)' : 'Chat ' + pk;
        const type = (meta && meta.type) || 'personal_chat';
        chats.push({
          id: 'json_' + i++,
          name, type,
          messages: msgs.slice().sort(byDate),
          peerKey: pk,
          myUserId: me.userId ? 'user' + me.userId : null,
          myUserIdNum: me.userId || null,
          participants: (meta && meta.participants) || null,
        });
      });
      chats.sort((a,b) => {
        if(a.type === 'saved_messages' && b.type !== 'saved_messages') return -1;
        if(b.type === 'saved_messages' && a.type !== 'saved_messages') return 1;
        return a.name.localeCompare(b.name);
      });
      return { chats, me };
    }

    const chats = chatList.map((ch,i) => normalizeChat(ch, i, me, ch.__peerKey));
    return { chats: chats.filter(c => c.messages.length > 0), me };
  }

  if(data && Array.isArray(data.messages)){
    const chats = [normalizeChat(data, 0, me)];
    return { chats, me };
  }

  return { chats: [], me };
}

function buildChatsFromHTML(htmlText){
  const doc = new DOMParser().parseFromString(htmlText, 'text/html');
  const walker = doc.createTreeWalker(doc.body || doc, NodeFilter.SHOW_ELEMENT, {
    acceptNode(node){
      if(node.classList.contains('page_header')) return NodeFilter.FILTER_ACCEPT;
      if(node.classList.contains('message')) return NodeFilter.FILTER_ACCEPT;
      return NodeFilter.FILTER_SKIP;
    }
  });
  const chats = [];
  let current = null, node;
  while((node = walker.nextNode())){
    if(node.classList.contains('page_header')){
      const titleEl = node.querySelector('.text') || node;
      const rawName = titleEl.textContent.trim() || 'Chat ' + (chats.length + 1);
      current = {
        id: 'html_' + chats.length,
        name: rawName,
        type: /saved messages/i.test(rawName) ? 'saved_messages' : 'personal_chat',
        messages: []
      };
      chats.push(current);
      continue;
    }
    if(node.classList.contains('message')){
      if(!current){ current = { id:'html_0', name:'Telegram export', messages:[] }; chats.push(current); }
      const isService = node.classList.contains('service') && !node.querySelector('.text');
      const isOut = node.classList.contains('out');
      const fromEl = node.querySelector('.from_name');
      const textEl = node.querySelector('.text');
      const dateEl = node.querySelector('.date');
      const mediaA = node.querySelector('a.photo_wrap, a.video_file_wrap, a.audio_file_wrap, a.roundvideo_wrap, a.sticker_wrap, a.document_wrap');
      const dateStr = dateEl ? (dateEl.getAttribute('title') || dateEl.textContent.trim()) : null;
      if(isService){
        current.messages.push({ type:'service', text: node.textContent.trim(), date: dateStr, out:false });
      } else {
        const cls = mediaA ? mediaA.className : '';
        current.messages.push({
          type:'message', out:isOut,
          from: fromEl ? fromEl.textContent.trim() : null,
          text: textEl ? textEl.innerHTML : '',
          isHtml: true,
          media: mediaA ? mediaA.getAttribute('href') : null,
          media_type: /sticker_wrap/.test(cls) ? 'sticker'
                    : /video_file_wrap|roundvideo_wrap/.test(cls) ? 'video_file'
                    : /audio_file_wrap/.test(cls) ? 'audio_file'
                    : /document_wrap/.test(cls) ? 'document'
                    : 'photo',
          date: dateStr,
        });
      }
    }
  }
  return chats.filter(c => c.messages.length > 0);
}

function buildAudioCard(url, name){
  const wrap = document.createElement('div'); wrap.className = 'audio-card';
  const btn = document.createElement('button'); btn.className = 'play-btn'; btn.textContent = '▶';
  const wave = document.createElement('div'); wave.className = 'wave';
  const dur = document.createElement('div'); dur.className = 'duration'; dur.textContent = '0:00 / 0:00';
  const audio = document.createElement('audio'); audio.src = url; audio.preload = 'metadata';
  wrap.appendChild(btn); wrap.appendChild(wave); wrap.appendChild(dur); wrap.appendChild(audio);

  const BAR_COUNT = 40;
  const bars = [];
  for(let i = 0; i < BAR_COUNT; i++){
    const bar = document.createElement('span');
    bar.style.height = (4 + Math.random() * 14) + 'px';
    bar.style.opacity = '0.55';
    wave.appendChild(bar);
    bars.push(bar);
  }

  let seeking = false;

  function paintProgress(){
    const d = audio.duration || 0;
    const t = audio.currentTime || 0;
    const ratio = d ? t / d : 0;
    const upTo = Math.floor(ratio * BAR_COUNT);
    for(let i = 0; i < BAR_COUNT; i++){
      bars[i].style.opacity = i <= upTo ? '1' : '0.55';
    }
    dur.textContent = fmtDuration(t) + ' / ' + fmtDuration(d);
  }

  audio.addEventListener('loadedmetadata', paintProgress);
  audio.addEventListener('timeupdate', () => { if(!seeking) paintProgress(); });
  audio.addEventListener('ended', () => { btn.textContent = '▶'; paintProgress(); });

  btn.onclick = () => {
    if(audio.paused){ audio.play(); btn.textContent = '⏸'; }
    else { audio.pause(); btn.textContent = '▶'; }
  };

  function seekFromEvent(ev){
    if(!audio.duration) return;
    const rect = wave.getBoundingClientRect();
    const x = (ev.touches ? ev.touches[0].clientX : ev.clientX) - rect.left;
    const ratio = Math.min(1, Math.max(0, x / rect.width));
    audio.currentTime = ratio * audio.duration;
    paintProgress();
  }

  wave.addEventListener('mousedown', ev => { seeking = true; seekFromEvent(ev); });
  window.addEventListener('mousemove', ev => { if(seeking) seekFromEvent(ev); });
  window.addEventListener('mouseup', () => { seeking = false; });
  wave.addEventListener('touchstart', ev => { ev.preventDefault(); seeking = true; seekFromEvent(ev); }, { passive: false });
  window.addEventListener('touchmove', ev => { if(seeking) seekFromEvent(ev); }, { passive: true });
  window.addEventListener('touchend', () => { seeking = false; });

  return wrap;
}

function basename(p){ return p ? String(p).split(/[/\\]/).pop() : ''; }
function extractText(t){
  if(t == null) return '';
  if(typeof t === 'string') return t;
  if(Array.isArray(t)){
    return t.map(p => {
      if(typeof p === 'string') return p;
      if(p && typeof p === 'object' && typeof p.text === 'string') return p.text;
      return '';
    }).join('');
  }
  return String(t);
}
function jsonBody(msg){
  let s = extractText(msg.text);
  if(!s && Array.isArray(msg.text_entities)) s = msg.text_entities.map(e => e.text || '').join('');
  if(!s && typeof msg.caption === 'string') s = msg.caption;
  if(!s && typeof msg.sticker_emoji === 'string') s = msg.sticker_emoji;
  return s;
}
function kindOf(file, mediaType, mime){
  const mt = String(mediaType || '').toLowerCase();
  const m = String(mime || file.type || '').toLowerCase();
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if(mt === 'animation' || mt === 'gif' || ext === 'gif') return 'gif';
  if(mt === 'sticker') return 'sticker';
  if(mt === 'voice_message' || mt === 'audio_file' || m.startsWith('audio/')) return 'audio';
  if(mt === 'video_file' || mt === 'video_message' || m.startsWith('video/')) return 'video';
  if(mt === 'photo' || m.startsWith('image/')) return 'image';
  if(['mp3','ogg','opus','wav','flac','m4a','aac'].includes(ext)) return 'audio';
  if(['mp4','webm','mov','mkv','m4v','avi','3gp'].includes(ext)) return 'video';
  if(['jpg','jpeg','png','gif','webp','bmp'].includes(ext)) return 'image';
  return 'other';
}
const AVATAR_COLORS = ['#e17076','#7bc862','#e5ca77','#65aadd','#a695e7',
                       '#ee7aae','#6ec9cb','#faa774','#2ea9c9','#d96ba1'];
function avatarColor(name){
  let h = 0;
  for(const c of (name || '?')) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initial(name){
  const s = (name || '?').trim();
  return s ? s[0].toUpperCase() : '?';
}
function fmtTime(d){ const x = new Date(d); return isNaN(x) ? '' : x.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); }
function fmtDate(d){
  const x = new Date(d); if(isNaN(x)) return '';
  const t = new Date();
  if(x.toDateString() === t.toDateString()) return 'Today';
  const y = new Date(t); y.setDate(t.getDate() - 1);
  if(x.toDateString() === y.toDateString()) return 'Yesterday';
  return x.toLocaleDateString([], {day:'numeric', month:'long', year:'numeric'});
}
function dateKey(d){ const x = new Date(d); return isNaN(x) ? 'unknown' : x.toDateString(); }
function fmtDuration(s){ if(!isFinite(s)) return '0:00'; const m = Math.floor(s / 60), r = Math.floor(s % 60); return m + ':' + String(r).padStart(2, '0'); }
function getBlobUrl(name){
  if(state.blobCache.has(name)) return state.blobCache.get(name);
  const file = state.mediaMap.get(name);
  if(!file) return null;
  const url = URL.createObjectURL(file);
  state.blobCache.set(name, url);
  return url;
}
function chatPreview(msgs){
  if(!msgs || !msgs.length) return '';
  const last = msgs[msgs.length - 1];
  if(last.type === 'service') return last.text || 'Service message';
  const t = last.isHtml ? (last.text || '').replace(/<[^>]+>/g, '').trim() : jsonBody(last);
  if(t) return t;
  if(last.media || last.photo || last.file) return '📎 Media';
  return '';
}

window.addEventListener('storage', e => {
  if(e.key === THEME_KEY && e.newValue) applyTheme(e.newValue);
});

})();
