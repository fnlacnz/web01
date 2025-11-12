const Momentum = (() => {
  const S = {
    theme: localStorage.getItem('theme') || 'auto',
    identity: localStorage.getItem('identity') || 'I focus on one meaningful task at a time.',
    xp: parseInt(localStorage.getItem('xp')||'0',10),
    level: parseInt(localStorage.getItem('level')||'1',10),
    streak: parseInt(localStorage.getItem('streak')||'0',10),
    lastMarked: localStorage.getItem('lastMarked')||'',
    // Pages
    today: JSON.parse(localStorage.getItem('today')||'{"plan":[],"woop":[],"review":""}'),
    xyz: JSON.parse(localStorage.getItem('xyz')||'{"goal":"","deadline":"","progress":0,"roadmap":[]}'),
    nuclear: JSON.parse(localStorage.getItem('nuclear')||'{"total":0}')
  };

  const save = (k,v) => localStorage.setItem(k, typeof v==='string' ? v : JSON.stringify(v));
  const addXP = (n) => { S.xp = Math.max(0, S.xp + n); save('xp', S.xp); levelCheck(); };
  const levelCheck = () => { const target = 40 * S.level; if(S.xp >= target){ S.level++; save('level', S.level); } };
  const markStreak = () => {
    const today = new Date().toDateString();
    if(S.lastMarked === today) return;
    const diff = S.lastMarked ? Math.round((new Date() - new Date(S.lastMarked))/(1000*60*60*24)) : null;
    S.streak = (!S.lastMarked || diff===1) ? S.streak+1 : 1;
    S.lastMarked = today; save('streak', S.streak); save('lastMarked', S.lastMarked);
  };

  const applyTheme = (mode) => {
    const root = document.documentElement;
    const set = (bg, card, text, border) => {
      root.style.setProperty('--bg', bg);
      root.style.setProperty('--card', card);
      root.style.setProperty('--text', text);
      root.style.setProperty('--border', border);
    };
    if(mode==='auto'){ /* respect system */ }
    if(mode==='dark'){ set('#0b1020','#131733','#e9ecf6','#2b3556'); }
    if(mode==='light'){ set('#f5f7fa','#ffffff','#1a1a1a','#dde2ea'); }
    if(mode==='contrast'){ root.style.setProperty('--primary','#00ffff'); root.style.setProperty('--accent','#ffff00'); }
    S.theme = mode; save('theme', mode);
  };

  // Timer
  const formatClock = (secs) => {
    const m = Math.floor(secs/60).toString().padStart(2,'0');
    const s = (secs%60).toString().padStart(2,'0');
    return `${m}:${s}`;
  };
  const runTimer = (seconds, onTick, onDone) => {
    let secs = seconds;
    const iv = setInterval(()=>{
      secs = Math.max(0, secs-1);
      if(onTick) onTick(secs);
      if(secs===0){ clearInterval(iv); if(onDone) onDone(true); }
    },1000);
    return () => clearInterval(iv); // returns cancel function
  };

  // Home
  const home = () => {
    document.querySelectorAll('.tools .mini').forEach(b=> b.addEventListener('click', ()=>applyTheme(b.dataset.theme)));
    applyTheme(S.theme);
    document.getElementById('homeIdentity').textContent = S.identity;
    document.getElementById('homeIdentitySave').onclick = ()=>{
      const v = document.getElementById('homeIdentityInput').value.trim();
      if(!v) return; S.identity=v; save('identity', v);
      document.getElementById('homeIdentity').textContent = v; addXP(5);
    };
    document.getElementById('homeXP').textContent = S.xp;
    document.getElementById('homeLevel').textContent = S.level;
    document.getElementById('homeStreak').textContent = S.streak;
    const pct = Math.round(((S.xyz.progress||0) + ((S.nuclear.total||0)/120*100))/2);
    document.getElementById('homeProgressBar').style.width = `${pct}%`;
    document.getElementById('homeProgressText').textContent = `${pct}% from missions + points`;
  };

  // Nuke Today
  const nukeToday = () => {
    document.querySelectorAll('.tools .mini').forEach(b=> b.addEventListener('click', ()=>applyTheme(b.dataset.theme)));
    applyTheme(S.theme);

    const nowEl = document.getElementById('ntNow');
    const nextEl = document.getElementById('ntNextEvent');
    const hoursEl = document.getElementById('ntHours');
    document.getElementById('ntCalc').onclick = ()=>{
      const now = nowEl.value, next = nextEl.value;
      if(!now || !next){ hoursEl.textContent = 'Enter times to calculate.'; return; }
      const [nh,nm] = now.split(':').map(Number), [xh,xm] = next.split(':').map(Number);
      const mins = (xh*60+xm) - (nh*60+nm);
      const h = Math.max(0, Math.floor(mins/60)), m = Math.max(0, mins%60);
      hoursEl.textContent = `Hours left: ${h}h ${m}m`;
    };

    const planEl = document.getElementById('ntPlanView');
    const alarmBtn = document.getElementById('ntAlarm');
    const focusBtn = document.getElementById('ntFocus');
    const cancelBtn = document.getElementById('ntCancel');
    const clockEl = document.getElementById('ntClock');
    const barEl = document.getElementById('ntFocusBar');
    const statusEl = document.getElementById('ntStatus');
    let cancelTimer = null;

    const renderPlan = ()=>{
      planEl.innerHTML = '';
      S.today.plan.forEach(p=>{
        const div = document.createElement('div'); div.className='item';
        div.textContent = `⏰ ${p.start} — ${p.mit} for ${p.dur}m`;
        planEl.appendChild(div);
      });
    };

    document.getElementById('ntPlan').onclick = ()=>{
      const mit = document.getElementById('ntMIT').value.trim();
      const start = document.getElementById('ntStart').value;
      const dur = parseInt(document.getElementById('ntDuration').value||'25',10);
      if(!mit || !start){ statusEl.textContent='Define task and start time.'; return; }
      S.today.plan.unshift({mit,start,dur}); save('today', S.today);
      renderPlan(); addXP(5); statusEl.textContent='Planned.';
    };

    alarmBtn.onclick = ()=>{
      const last = S.today.plan[0]; if(!last){ statusEl.textContent='Plan first.'; return; }
      if('Notification' in window){
        Notification.requestPermission().then(p=>{
          if(p==='granted'){ new Notification(`Reminder: ${last.mit} at ${last.start}`); statusEl.textContent='Reminder scheduled.'; }
        });
      } else { statusEl.textContent='Notifications unsupported.'; }
    };

    focusBtn.onclick = ()=>{
      const last = S.today.plan[0]; if(!last){ statusEl.textContent='Plan first.'; return; }
      const totalSecs = last.dur*60;
      let started = totalSecs;
      cancelTimer = runTimer(totalSecs, (secs)=>{
        clockEl.textContent = formatClock(secs);
        const pct = Math.round(((started - secs)/started)*100);
        barEl.style.width = pct + '%';
      }, ()=>{
        clockEl.textContent = '00:00'; barEl.style.width = '100%';
        statusEl.textContent = 'Focus complete. +20 XP';
        addXP(20); markStreak();
      });
      statusEl.textContent = 'Focus started.';
    };

    cancelBtn.onclick = ()=>{
      if(cancelTimer){ cancelTimer(); statusEl.textContent='Focus canceled.'; barEl.style.width='0%'; clockEl.textContent='00:00'; }
    };

    // Queue
    const queueEl = document.getElementById('ntQueue');
    document.getElementById('ntAdd').onclick = ()=>{
      const t = document.getElementById('ntTask').value.trim();
      const cat = document.getElementById('ntCat').value;
      if(!t) return;
      const div = document.createElement('div'); div.className='item';
      div.textContent = `[${cat}] ${t}`;
      queueEl.appendChild(div);
      addXP(1);
    };

    // WOOP
    const woopEl = document.getElementById('ntWOOPView');
    document.getElementById('ntWOOPSave').onclick = ()=>{
      const wish = document.getElementById('ntWish').value.trim();
      const outcome = document.getElementById('ntOutcome').value.trim();
      const obstacle = document.getElementById('ntObstacle').value.trim();
      const planIf = document.getElementById('ntPlanIf').value.trim();
      if(!wish || !outcome || !obstacle || !planIf) return;
      S.today.woop.unshift({wish,outcome,obstacle,planIf,ts:Date.now()});
      save('today', S.today);
      renderWOOP(); addXP(4);
    };

    const renderWOOP = ()=>{
      woopEl.innerHTML='';
      S.today.woop.slice(0,5).forEach(w=>{
        const div = document.createElement('div'); div.className='item';
        div.innerHTML = `<strong>Wish:</strong> ${w.wish}<br><strong>Outcome:</strong> ${w.outcome}<br><strong>Obstacle:</strong> ${w.obstacle}<br><strong>Plan:</strong> If ${w.obstacle} → then ${w.planIf}`;
        woopEl.appendChild(div);
      });
    };

    // Review
    const reviewEl = document.getElementById('ntReviewView');
    document.getElementById('ntReviewSave').onclick = ()=>{
      const txt = document.getElementById('ntReview').value.trim(); if(!txt) return;
      S.today.review = txt; save('today', S.today);
      reviewEl.textContent = txt; addXP(3);
    };

    // Init
    renderPlan(); renderWOOP();
    clockEl.textContent = '00:00';
  };

  return { home, nukeToday };
})();

