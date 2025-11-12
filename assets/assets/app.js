const Momentum = (() => {
  const S = {
    xp: parseInt(localStorage.getItem('xp')||'0',10),
    level: parseInt(localStorage.getItem('level')||'1',10),
    streak: parseInt(localStorage.getItem('streak')||'0',10),
    lastMarked: localStorage.getItem('lastMarked')||'',
    identity: localStorage.getItem('identity')||'You are the kind of person who executes the most important thing first.',
    theme: localStorage.getItem('theme')||'dark',
    newMe: JSON.parse(localStorage.getItem('newMe')||'{"entries":[],"links":[],"prevent":[],"identity":""}'),
    nukeToday: JSON.parse(localStorage.getItem('nukeToday')||'{"plan":[],"mitDone":false}'),
    nukeXYZ: JSON.parse(localStorage.getItem('nukeXYZ')||'{"goal":"","deadline":"","progress":0,"roadmap":[]}'),
    nuclear: JSON.parse(localStorage.getItem('nuclear')||'{"total":0,"review":""}')
  };

  const save = (k,v) => localStorage.setItem(k, typeof v==='string' ? v : JSON.stringify(v));
  const addXP = (n) => { S.xp = Math.max(0, S.xp + n); save('xp', S.xp); levelCheck(); };
  const levelCheck = () => { const target = 50 * S.level; if(S.xp >= target){ S.level++; save('level', S.level); } };
  const markStreak = () => {
    const today = new Date().toDateString();
    if(S.lastMarked === today) return;
    if(!S.lastMarked){ S.streak = 1; }
    else {
      const diff = Math.round((new Date() - new Date(S.lastMarked))/(1000*60*60*24));
      S.streak = diff===1 ? S.streak+1 : 1;
    }
    S.lastMarked = today;
    save('streak', S.streak); save('lastMarked', S.lastMarked);
  };
  const applyTheme = (mode) => {
    const root = document.documentElement;
    if(mode==='dark'){ root.style.setProperty('--bg','#0e1320'); root.style.setProperty('--card','#141a2e'); root.style.setProperty('--primary','#5ac8fa'); }
    if(mode==='light'){ root.style.setProperty('--bg','#f5f7fa'); root.style.setProperty('--card','#ffffff'); root.style.setProperty('--primary','#0078d7'); }
    if(mode==='neon'){ root.style.setProperty('--bg','#000'); root.style.setProperty('--card','#111'); root.style.setProperty('--primary','#ff00ff'); }
    if(mode==='minimal'){ root.style.setProperty('--bg','#fafafa'); root.style.setProperty('--card','#f0f0f0'); root.style.setProperty('--primary','#333'); }
    S.theme = mode; save('theme', mode);
  };

  // Timer helper
  const runTimer = (seconds, tick, done) => {
    let secs = seconds;
    const iv = setInterval(()=>{
      secs--;
      if(tick) tick(secs);
      if(secs<=0){ clearInterval(iv); if(done) done(true); }
    },1000);
    return iv;
  };

  // Rewards
  const renderRewards = (id, items) => {
    const el = document.getElementById(id); if(!el) return;
    el.innerHTML='';
    items.forEach(t=>{ const d=document.createElement('div'); d.className='reward'; d.textContent=t; el.appendChild(d); });
  };

  // Home
  const initHome = () => {
    applyTheme(S.theme);
    document.querySelectorAll('.tools .mini').forEach(b=>b.addEventListener('click', () => applyTheme(b.dataset.theme)));
    document.getElementById('identity').textContent = S.identity;
    document.getElementById('identitySave').onclick = () => {
      const v = document.getElementById('identityInput').value.trim();
      if(!v) return;
      S.identity = v; save('identity', v);
      document.getElementById('identity').textContent = v;
      addXP(5);
    };
    document.getElementById('homeXP').textContent = S.xp;
    document.getElementById('homeLevel').textContent = S.level;
    document.getElementById('homeStreak').textContent = S.streak;
    const pct = Math.round(( (S.nukeXYZ.progress||0) + (S.nuclear.total||0)/120*100 ) / 2);
    document.getElementById('homeProgressBar').style.width = `${pct}%`;
    const rw = document.getElementById('homeRewards'); rw.innerHTML = '';
    [30,60,90].forEach(t=>{ if(pct>=t){ const d=document.createElement('div'); d.className='reward'; d.textContent = `Unlocked @${t}% → Momentum boost activated.`; rw.appendChild(d); } });
  };

  // New Me
  const initNewMe = () => {
    applyTheme(S.theme);
    document.getElementById('jmAdd').onclick = () => {
      const text = document.getElementById('jmEntry').value.trim();
      const tag = document.getElementById('jmTag').value;
      if(!text) return;
      S.newMe.entries.push({text, tag, ts: Date.now()});
      save('newMe', S.newMe); renderNewMe(); addXP(2);
    };
    document.getElementById('jmLink').onclick = () => {
      const tr = document.getElementById('jmTrigger').value.trim();
      const ac = document.getElementById('jmAction').value.trim();
      if(!tr || !ac) return;
      S.newMe.links.push({tr, ac}); save('newMe', S.newMe); renderNewMe(); addXP(3);
    };
    document.getElementById('jmIdentitySave').onclick = () => {
      const idt = document.getElementById('jmIdentity').value.trim();
      if(!idt) return;
      S.newMe.identity = idt; save('newMe', S.newMe);
      document.getElementById('jmIdentityView').textContent = idt; addXP(5);
    };
    renderNewMe();
  };
  const renderNewMe = () => {
    const list = document.getElementById('jmList'); list.innerHTML='';
    S.newMe.entries.slice().reverse().forEach(e=>{
      const d = document.createElement('div'); d.className='item';
      d.textContent = `[${e.tag}] ${e.text}`; list.appendChild(d);
    });
    const counts = {}; S.newMe.entries.forEach(e=> counts[e.tag]=(counts[e.tag]||0)+1 );
    const pat = document.getElementById('jmPatterns'); pat.innerHTML='';
    Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5).forEach(([tag,n])=>{
      const c = document.createElement('div'); c.className='chip'; c.textContent = `${tag} ×${n}`; pat.appendChild(c);
    });
    const prev = document.getElementById('jmPrevent'); prev.innerHTML='';
    Object.keys(counts).forEach(tag=>{
      const i = document.createElement('div'); i.className='item';
      i.textContent = `If ${tag} rises → then: 25m focus + notifications off + prep tools.`; prev.appendChild(i);
    });
    document.getElementById('jmIdentityView').textContent = S.newMe.identity||'';
  };

  // Nuke Today
  const initNukeToday = () => {
    applyTheme(S.theme);
    document.getElementById('ntCalc').onclick = () => {
      const now = document.getElementById('ntNow').value;
      const next = document.getElementById('ntNextEvent').value;
      if(!now || !next) return;
      const [nh, nm] = now.split(':').map(Number);
      const [xh, xm] = next.split(':').map(Number);
      const mins = (xh*60+xm) - (nh*60+nm);
      const hours = Math.max(0, Math.floor(mins/60));
      document.getElementById('ntHours').textContent = `Hours left: ${hours}h`;
    };
    document.getElementById('ntPlan').onclick = () => {
      const mit = document.getElementById('ntMIT').value.trim();
      const start = document.getElementById('ntStart').value;
      const dur = parseInt(document.getElementById('ntDuration').value||'25',10);
      if(!mit || !start) return;
      S.nukeToday.plan.unshift({mit, start, dur});
      save('nukeToday', S.nukeToday); renderNukeToday(); addXP(5);
    };
    document.getElementById('ntAlarm').onclick = () => {
      const last = S.nukeToday.plan[0]; if(!last) return;
      if('Notification' in window){
        Notification.requestPermission().then(p=>{
          if(p==='granted'){ new Notification(`Alarm: ${last.mit} at ${last.start}`); }
        });
      }
    };
    document.getElementById('ntFocus').onclick = () => {
      const last = S.nukeToday.plan[0]; if(!last) return;
      const secs = last.dur*60;
      runTimer(secs, (s)=>{}, (done)=> {
        document.getElementById('ntStatus').textContent = `Focus done → +20 XP`;
        S.nukeToday.mitDone = true; save('nukeToday', S.nukeToday);
        addXP(20); markStreak();
        renderRewards('ntRewards', ['Focus boost unlocked','Phone disappears mode','Momentum carryover']);
      });
    };
    document.getElementById('ntAdd').onclick = () => {
      const t = document.getElementById('ntTask').value.trim();
      const cat = document.getElementById('ntCat').value;
      if(!t) return;
      const q = document.getElementById('ntQueue'); const d = document.createElement('div');
      d.className='item'; d.textContent = `[${cat}] ${t}`; q.appendChild(d); addXP(1);
    };
    renderNukeToday();
  };
  const renderNukeToday = () => {
    const v = document.getElementById('ntPlanView'); v.innerHTML='';
    S.nukeToday.plan.forEach(p=>{
      const d = document.createElement('div'); d.className='item';
      d.textContent = `⏰ ${p.start} → ${p.mit} for ${p.dur}m`; v.appendChild(d);
    });
  };

  // Nuke XYZ
  let nxTimer = null, nxSecs = 25*60;
  const initNukeXYZ = () => {
    applyTheme(S.theme);
    document.getElementById('nxSave').onclick = () => {
      const goal = document.getElementById('nxGoal').value.trim();
      const dl = document.getElementById('nxDeadline').value;
      if(!goal || !dl) return;
      S.nukeXYZ.goal = goal; S.nukeXYZ.deadline = dl; save('nukeXYZ', S.nukeXYZ);
      document.getElementById('nxView').textContent = `Mission: ${goal} → Deadline: ${dl}`; addXP(5);
    };
    document.querySelectorAll('[data-win]').forEach(b=> b.onclick = () => {
      const inc = parseInt(b.getAttribute('data-win'),10);
      S.nukeXYZ.progress = Math.min(100, Math.max(0, (S.nukeXYZ.progress||0) + inc));
      save('nukeXYZ', S.nukeXYZ); renderNukeXYZ(); addXP(inc);
    });
    document.getElementById('nxReset').onclick = () => { S.nukeXYZ.progress = 0; save('nukeXYZ', S.nukeXYZ); renderNukeXYZ(); };
    document.getElementById('nxStart').onclick = () => {
      const v = parseInt(document.getElementById('nxSession').value,10);
      nxSecs = v*60; renderNXClock();
      if(nxTimer) return;
      nxTimer = runTimer(nxSecs, (s)=>{ nxSecs=s; renderNXClock(); }, (done)=> {
        addXP(20); document.getElementById('nxFocusStatus').textContent = `Focus done → +20 XP`;
        nxTimer = null; renderNXClock();
      });
    };
    document.getElementById('nxStop').onclick = () => { if(nxTimer){ clearInterval(nxTimer); nxTimer=null; renderNXClock(); } };
    document.getElementById('nxAdd').onclick = () => {
      const step = document.getElementById('nxTask').value.trim(); if(!step) return;
      S.nukeXYZ.roadmap.push({step, done:false}); save('nukeXYZ', S.nukeXYZ); renderRoadmap(); addXP(2);
    };
    renderNukeXYZ(); renderRoadmap();
    document.getElementById('nxView').textContent = S.nukeXYZ.goal ? `Mission: ${S.nukeXYZ.goal} → Deadline: ${S.nukeXYZ.deadline}` : '';
  };
  const renderNukeXYZ = () => {
    const pct = S.nukeXYZ.progress||0;
    document.getElementById('nxBar').style.width = `${pct}%`;
    document.getElementById('nxPct').textContent = `${pct}%`;
    const tips = document.getElementById('nxTips'); tips.innerHTML='';
    [[30,'Reduce friction: prep tools night before'],[60,'Guard mornings: one hard win before messages'],[90,'Sprint: 3 focus blocks, then ship']].forEach(([t,m])=>{
      if(pct>=t){ const d=document.createElement('div'); d.className='item'; d.textContent = `Unlocked @${t}% → ${m}`; tips.appendChild(d); }
    });
  };
  const renderNXClock = () => {
    const m = Math.floor(nxSecs/60).toString().padStart(2,'0');
    const s = (nxSecs%60).toString().padStart(2,'0');
    document.getElementById('nxClock').textContent = `${m}:${s}`;
  };
  const renderRoadmap = () => {
    const r = document.getElementById('nxRoadmap'); r.innerHTML='';
    S.nukeXYZ.roadmap.forEach((st,i)=>{
      const d = document.createElement('div'); d.className='item';
      d.innerHTML = `<label><input type="checkbox" ${st.done?'checked':''}> ${st.step}</label>`;
      const cb = d.querySelector('input'); cb.onchange = (e)=> {
        st.done = e.target.checked; save('nukeXYZ', S.nukeXYZ);
        addXP(e.target.checked?5:-5);
      };
      r.appendChild(d);
    });
  };

  // Nuclear System
  const initNuclearSystem = () => {
    applyTheme(S.theme);
    const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const categories = ['Exam','Skill','Project','Health','Learning'];
    const container = document.getElementById('nsWeek'); container.innerHTML='';
    days.forEach(d=>{
      const day = document.createElement('div'); day.className='day';
      day.innerHTML = `<h3>${d} (20 pts)</h3>`;
      for(let i=0;i<2;i++){
        const row = document.createElement('div'); row.className='row';
        row.innerHTML = `
          <select class="nsCat">${categories.map(c=>`<option>${c}</option>`).join('')}</select>
          <input class="nsHard" type="range" min="1" max="10" value="5" />
          <span class="chip">hardness</span>
          <input class="nsUrg" type="range" min="1" max="10" value="5" />
          <span class="chip">urgency</span>
          <span class="chip nsPts">0 pts</span>
          <label><input class="nsDone" type="checkbox" /> done</label>
        `;
        day.appendChild(row);
      }
      container.appendChild(day);
    });

    const recalc = () => {
      let total = 0;
      document.querySelectorAll('.day').forEach(day=>{
        let dayPts = 0;
        const dones = day.querySelectorAll('.nsDone');
        const ptsEls = day.querySelectorAll('.nsPts');
        const hard = day.querySelectorAll('.nsHard');
        const urg = day.querySelectorAll('.nsUrg');
        for(let i=0;i<dones.length;i++){
          const h = parseInt(hard[i].value,10);
          const u = parseInt(urg[i].value,10);
          const pts = Math.min(20, Math.round((h*u)/10)); // behavior-weighted points
          ptsEls[i].textContent = `${pts} pts`;
          if(dones[i].checked) dayPts += pts;
        }
        dayPts = Math.min(20, dayPts); total += dayPts; // daily cap
      });
      S.nuclear.total = total; save('nuclear', S.nuclear);
      document.getElementById('nsTotal').textContent = total;
      document.getElementById('nsStatus').textContent = total>=70 ? '✅ Goal achieved!' : '⚠ Keep going!';
      if(total>=70){ addXP(30); markStreak(); renderBadges(); }
    };
    document.getElementById('nsReset').onclick = () => {
      S.nuclear.total = 0; save('nuclear', S.nuclear);
      document.getElementById('nsTotal').textContent = 0;
      document.querySelectorAll('.nsDone').forEach(cb=>cb.checked=false);
      document.getElementById('nsStatus').textContent='Reset';
    };
    document.addEventListener('input', (e)=> {
      if(e.target.classList.contains('nsDone') || e.target.classList.contains('nsHard') || e.target.classList.contains('nsUrg')) recalc();
    });

    document.getElementById('nsSaveReview').onclick = () => {
      const txt = document.getElementById('nsReview').value.trim(); if(!txt) return;
      S.nuclear.review = txt; save('nuclear', S.nuclear);
      document.getElementById('nsReviewView').textContent = txt; addXP(5);
    };
    renderBadges();
  };
  const renderBadges = () => {
    const b = document.getElementById('nsBadges'); if(!b) return;
    b.innerHTML='';
    const badges = [];
    if(S.streak>=3) badges.push('🔥 3‑day streak');
    if(S.level>=3) badges.push('🏅 Level 3');
    if((S.nuclear.total||0)>=90) badges.push('🚀 Weekly 75%+');
    badges.forEach(t=>{ const c=document.createElement('div'); c.className='chip'; c.textContent = t; b.appendChild(c); });
  };

  return { initHome, initNewMe, initNukeToday, initNukeXYZ, initNuclearSystem };
})();
