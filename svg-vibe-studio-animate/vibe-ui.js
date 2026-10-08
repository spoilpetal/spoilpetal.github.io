(function(){
  // Shared Studio UI: themes, backgrounds, menus, feedback, and small page-wide helpers live here.
  const root=document.documentElement;
  // Keep the user's appearance choices between visits.
  const KEY='svg-vibe-ui-theme';
  const BG='svg-vibe-ui-background';
  const themes=['light','dark','retro','lavender','ocean','forest','sunset','mono'];
  const SCENE='svg-vibe-ui-scene';
  const scenes=['dreamy','rain','snow','air','nature','clouds'];
  const savedScene=localStorage.getItem(SCENE)||'dreamy';
  root.dataset.vibeScene=scenes.includes(savedScene)?savedScene:'dreamy';
  const saved=localStorage.getItem(KEY)||'dark';
  root.dataset.vibeTheme=themes.includes(saved)?saved:'light';
  if(localStorage.getItem(BG)==='off') root.classList.add('vibe-no-bg');
  function $(s){return document.querySelector(s)}
  function toast(title,detail,anchor){
    let t=$('.vibe-toast');
    if(!t){t=document.createElement('div');t.className='vibe-toast';document.body.appendChild(t)}
    t.classList.remove('vibe-toast-anchored');
    t.innerHTML='<strong>'+escapeHtml(title)+'</strong>'+(detail?'<span>'+escapeHtml(detail)+'</span>':'');
    if(anchor&&anchor.getBoundingClientRect){
      const r=anchor.getBoundingClientRect();
      t.classList.add('vibe-toast-anchored');
      const gap=8, width=Math.min(390,Math.max(220,window.innerWidth-28));
      let left=Math.max(14,Math.min(r.left,window.innerWidth-width-14));
      let top=r.bottom+gap;
      if(top+80>window.innerHeight)top=Math.max(14,r.top-80-gap);
      t.style.left=left+'px';t.style.top=top+'px';t.style.right='auto';t.style.bottom='auto';t.style.maxWidth=width+'px';
    }else{
      t.style.left='';t.style.top='';t.style.right='';t.style.bottom='';t.style.maxWidth='';
    }
    t.classList.add('show');clearTimeout(t._timer);t._timer=setTimeout(()=>{t.classList.remove('show');t.classList.remove('vibe-toast-anchored')},1900)
  }
  function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
  window.vibeToast=toast;
  // Build the decorative scene once; the selected scene controls which layer is visible.
  function addBackground(){if($('.vibe-bg'))return;const b=document.createElement('div');b.className='vibe-bg vibe-ui-layer';let rain='',snow='',air='',nature='',forest='',clouds='';for(let i=0;i<72;i++){const x=(i*37)%101,d=(i%17)*-.34,len=26+(i%7)*9;rain+=`<i class="vibe-rain-drop" style="left:${x}%;height:${len}px;animation-delay:${d}s;animation-duration:${1.15+(i%9)*.11}s"></i>`;snow+=`<i class="vibe-snow-flake" style="left:${(i*29)%101}%;animation-delay:${d}s"></i>`;air+=`<i class="vibe-air-wisp" style="top:${6+(i*23)%88}%;animation-delay:${d}s;width:${18+(i%6)*9}%"></i>`;nature+=`<i class="vibe-firefly" style="left:${(i*31)%101}%;top:${12+(i*17)%76}%;animation-delay:${d}s"></i>`}for(let i=0;i<18;i++)nature+=`<i class="vibe-leaf" style="left:${(i*43)%101}%;animation-delay:${(i%8)*-.65}s"></i>`;for(let i=0;i<13;i++)forest+=`<i class="vibe-tree" style="left:${(i*29)%104 - 2}%;height:${105+(i%5)*28}px;animation-delay:${(i%7)*-.7}s"></i>`;for(let i=0;i<4;i++)forest+=`<i class="vibe-deer" style="left:${12+i*25}%;animation-delay:${i*-.9}s"></i>`;for(let i=0;i<7;i++)clouds+=`<i class="vibe-cloud" style="left:${i*17-5}%;top:${8+(i%4)*16}%;animation-delay:${i*-.9}s;transform:scale(${.72+(i%3)*.18})"></i>`;b.innerHTML='<div class="vibe-orb o1"></div><div class="vibe-orb o2"></div><div class="vibe-orb o3"></div><div class="vibe-ribbon r1"></div><div class="vibe-ribbon r2"></div><div class="vibe-ribbon r3"></div><div class="vibe-creature c1"></div><div class="vibe-creature c2"></div><div class="vibe-creature c3"></div><div class="vibe-creature c4"></div><div class="vibe-creature c5"></div><div class="vibe-dust d1"></div><div class="vibe-dust d2"></div><div class="vibe-dust d3"></div><div class="vibe-dust d4"></div><div class="vibe-dust d5"></div><div class="vibe-scene-layer vibe-rain-layer">'+rain+'</div><div class="vibe-scene-layer vibe-snow-layer">'+snow+'</div><div class="vibe-scene-layer vibe-air-layer">'+air+'</div><div class="vibe-scene-layer vibe-nature-layer">'+nature+'</div><div class="vibe-scene-layer vibe-forest-layer"><div class="vibe-forest-ground"></div>'+forest+'</div><div class="vibe-scene-layer vibe-clouds-layer">'+clouds+'</div>';const host=document.body.dataset.page==='Studio'?document.body:document.documentElement;host.prepend(b)}
  // Pages get the same footer links so navigation stays consistent everywhere.
  function addFooter(){if($('.vibe-footer'))return;const b=location.pathname.includes('/guides/')?'../':'./';const f=document.createElement('footer');f.className='vibe-footer';f.innerHTML='<div class="vibe-footer-nav"><a href="'+b+'index.html">Studio</a><a href="'+b+'guides/index.html">Guides</a><a href="'+b+'status.html">Status</a><a href="'+b+'donation.html">Support</a><a href="'+b+'contact.html">Contact</a><a href="'+b+'privacy.html">Privacy</a><a href="'+b+'copyright.html">Copyright</a></div><div class="vibe-copy">© 2026 SVG Vibe Studio · Generated SVG output is separate from the Studio source code.</div>';document.body.appendChild(f)}
  // The Appearance menu owns both theme and background choices.
  function addMenu(){
    if($('.vibe-menu'))return;
    const m=document.createElement('div');
    m.className='vibe-menu';
    m.id='vibeMenu';
    m.innerHTML='<h3>Studio appearance</h3><div class="small vibe-menu-note">These settings change the interface only. They do not change SVG rendering or tool behavior.</div><div class="vibe-menu-label">Theme</div><div class="vibe-menu-row" id="vibeThemes"></div><div class="vibe-menu-label">Background scene</div><div class="vibe-menu-row" id="vibeScenes"></div><div class="vibe-menu-row"><button class="vibe-choice" id="vibeBgToggle" type="button"></button></div>';
    document.body.appendChild(m);
    const holder=m.querySelector('#vibeThemes');
    themes.forEach(x=>{
      const b=document.createElement('button');
      b.className='vibe-choice';b.type='button';b.textContent=x[0].toUpperCase()+x.slice(1);b.dataset.theme=x;
      b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();setTheme(x)});
      holder.appendChild(b);
    });
    m.querySelector('#vibeBgToggle').addEventListener('click',e=>{
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      const off=!root.classList.contains('vibe-no-bg');
      root.classList.toggle('vibe-no-bg',off);localStorage.setItem(BG,off?'off':'on');updateMenu();
      toast(off?'Background animation paused':'Background animation playing');
    });
    const sceneHolder=m.querySelector('#vibeScenes');
    scenes.forEach(x=>{const b=document.createElement('button');b.className='vibe-choice';b.type='button';b.textContent=x[0].toUpperCase()+x.slice(1);b.dataset.scene=x;b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();setScene(x)});sceneHolder.appendChild(b)});
    updateMenu();
  }
  // Theme changes are interface-only and never touch generated SVG output.
  function setTheme(x){root.dataset.vibeTheme=x;localStorage.setItem(KEY,x);updateMenu();toast('Theme changed',x[0].toUpperCase()+x.slice(1)+' appearance')}
  // Background scenes are purely decorative and are safe to swap at any time.
  function setScene(x){root.dataset.vibeScene=x;localStorage.setItem(SCENE,x);updateMenu();toast('Background scene changed',x[0].toUpperCase()+x.slice(1))}
  function updateMenu(){document.querySelectorAll('.vibe-choice[data-theme]').forEach(b=>b.classList.toggle('active',b.dataset.theme===root.dataset.vibeTheme));document.querySelectorAll('.vibe-choice[data-scene]').forEach(b=>b.classList.toggle('active',b.dataset.scene===root.dataset.vibeScene));const b=$('#vibeBgToggle');if(b)b.textContent=root.classList.contains('vibe-no-bg')?'Play background animation':'Pause background animation'}
  let appearanceButton=null;
  let appearanceRoot=null;
  function closeAppearance(){
    const m=document.getElementById('vibeMenu');
    if(m)m.classList.remove('open');
    if(appearanceButton)appearanceButton.setAttribute('aria-expanded','false');
  }
  function toggleMenu(){
    const m=document.getElementById('vibeMenu');
    if(!m)return;
    const open=!m.classList.contains('open');
    m.classList.toggle('open',open);
    if(appearanceButton)appearanceButton.setAttribute('aria-expanded',open?'true':'false');
  }
  // Keep Appearance independent from each page's own header markup.
  function addNav(){
    // Isolated, page-independent Appearance layer. No header, footer, page overlay,
    // or document click handler is involved in opening/closing this control.
    document.querySelectorAll('#vibeAppearanceRoot,[data-vibe-appearance],.vibe-floating-appearance').forEach(x=>x.remove());
    appearanceRoot=document.createElement('div');
    appearanceRoot.id='vibeAppearanceRoot';
    appearanceRoot.innerHTML='<button type="button" id="vibeAppearanceButton" aria-label="Open appearance settings" aria-expanded="false">Appearance</button>';
    document.body.appendChild(appearanceRoot);
    appearanceButton=appearanceRoot.querySelector('#vibeAppearanceButton');
    const menu=document.getElementById('vibeMenu');
    if(menu)appearanceRoot.appendChild(menu);
    appearanceButton.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();toggleMenu()});
    if(menu)menu.addEventListener('click',e=>e.stopPropagation());
    document.addEventListener('click',e=>{if(appearanceRoot && !appearanceRoot.contains(e.target))closeAppearance()});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAppearance()});
  }
  // The loader is only shown on the main Studio workspace.
  function loader(){if(document.body.dataset.page!=='Studio')return;let l=$('.vibe-loader');if(!l){l=document.createElement('div');l.className='vibe-loader';l.innerHTML='<div class="vibe-loader-card"><div class="vibe-loader-logo">SVG Vibe Studio</div><div class="vibe-loader-scene"><i class="shape loader-a"></i><i class="shape loader-b"></i><i class="shape loader-c"></i></div><div class="vibe-loader-sub">Preparing your workspace</div><div class="vibe-loader-progress"></div><div class="vibe-loader-hint">building a quiet place to make SVGs</div></div>';document.body.prepend(l)}const done=()=>l.classList.add('done');window.addEventListener('load',()=>setTimeout(done,3000),{once:true});setTimeout(done,3000)}
  document.addEventListener('click',e=>{const target=e.target.closest('button,a,.vibe-choice');if(target&&!target.closest('.vibe-menu')&&!target.matches('input,select,textarea')){const r=document.createElement('span');r.className='vibe-ripple';r.style.left=(e.clientX-8)+'px';r.style.top=(e.clientY-8)+'px';document.body.appendChild(r);setTimeout(()=>r.remove(),500)}});
  document.addEventListener('click',e=>{if($('#vibeMenu')?.classList.contains('open')&&!e.target.closest('#vibeMenu')&&!e.target.closest('#vibeAppearanceButton')){ $('#vibeMenu').classList.remove('open'); if(appearanceButton)appearanceButton.setAttribute('aria-expanded','false'); }});
  document.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;const txt=(t.textContent||'').trim().toLowerCase();if(txt==='copied'||txt.includes('address copied'))toast('Copied','The value is ready to paste.');if(t.id==='copyEmail')setTimeout(()=>toast('Email copied','spoilpetal@proton.me is ready to paste.'),80)});

  // Show one calm recovery message instead of allowing a raw browser error to confuse users.
  let scriptErrorShown=false;
  function showScriptError(){if(scriptErrorShown)return;scriptErrorShown=true;const box=document.createElement('div');box.className='vibe-script-error';box.setAttribute('role','alert');box.innerHTML='<strong>Studio script error</strong><span>Part of the Studio could not run correctly. Reload the page. If the problem continues, clear the page cache and reload.</span><button type="button" aria-label="Close">×</button>';document.body.appendChild(box);box.querySelector('button').onclick=()=>box.remove()}
  window.addEventListener('error',showScriptError);window.addEventListener('unhandledrejection',showScriptError);
  // Start the shared UI after the document is ready.
  function init(){if(document.body.dataset.page!=='Studio')document.documentElement.classList.add('vibe-support-page');addBackground();addMenu();addNav();addFooter();loader();updateMenu();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
