const K = (k)=>'rud_os_'+k;
const save = (k,v)=>localStorage.setItem(K(k),JSON.stringify(v));
const load = (k,d)=>{ try{ const v=localStorage.getItem(K(k)); return v?JSON.parse(v):d; }catch{ return d; }};

// ── CLOCK & DATE ──
function updateClock(){
  const n=new Date();
  const days=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  const months=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const t=n.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  const sbClock = document.getElementById('sb-clock');
  const sbDay = document.getElementById('sb-day');
  const sbMonth = document.getElementById('sb-month');
  const hojeSub = document.getElementById('hoje-sub');
  const monthTitle = document.getElementById('month-title');

  if(sbClock) sbClock.textContent=t;
  if(sbDay) sbDay.textContent=n.getDate();
  if(sbMonth) sbMonth.textContent=days[n.getDay()]+', '+months[n.getMonth()];
  if(hojeSub) hojeSub.textContent=days[n.getDay()]+' · '+n.toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});
  const mn=months[n.getMonth()]+' '+n.getFullYear();
  if(monthTitle) monthTitle.innerHTML=mn.split(' ')[0]+' <em>'+mn.split(' ')[1]+'</em>';
}
// Don't call updateClock here - will be called from initializeRud()
// updateClock();
// setInterval(updateClock,15000);

// ── PAGE NAV ──
function goPage(id,el){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.sbi').forEach(s=>s.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  if(el) el.classList.add('active');
  else { document.querySelectorAll('.sbi').forEach(s=>{ if(s.getAttribute('onclick')&&s.getAttribute('onclick').includes("'"+id+"'")) s.classList.add('active'); }); }
  window.scrollTo({top:0});
  renderAll();
}

// ── TASKS ──
let tasks = load('tasks',[
  {id:1,text:'Verificar contas Meta Ads',cat:'w',done:false,ts:Date.now()},
  {id:2,text:'Enviar relatório semanal',cat:'w',done:false,ts:Date.now()},
  {id:3,text:'Treino do dia',cat:'h',done:false,ts:Date.now()},
  {id:4,text:'Leitura 30 minutos',cat:'p',done:false,ts:Date.now()},
  {id:5,text:'Responder mensagens pendentes',cat:'w',done:false,ts:Date.now()},
]);
const CAT={w:{l:'Trabalho',c:'t-w'},p:{l:'Pessoal',c:'t-p'},h:{l:'Saúde',c:'t-h'},u:{l:'Urgente',c:'t-u'}};
function saveTasks(){ save('tasks',tasks); }
function addTask(){
  const v=document.getElementById('t-inp').value.trim(); if(!v) return;
  const c=document.getElementById('t-cat').value;
  tasks.push({id:Date.now(),text:v,cat:c,done:false,ts:Date.now()});
  document.getElementById('t-inp').value='';
  saveTasks(); renderAll();
}
function toggleTask(id){ const t=tasks.find(t=>t.id===id); if(t){ t.done=!t.done; saveTasks(); renderAll(); } }
function delTask(id){ tasks=tasks.filter(t=>t.id!==id); saveTasks(); renderAll(); }
function renderTasks(){
  const pend=tasks.filter(t=>!t.done), done=tasks.filter(t=>t.done);
  const mkItem=(t,c)=>{ const cm=CAT[t.cat]||CAT.w; const el=document.createElement('div'); el.className='ti'+(t.done?' done':''); el.innerHTML=`<div class="tcb"></div><div class="tt">${t.text}</div><span class="tbadge ${cm.c}">${cm.l}</span><span class="tdel" onclick="event.stopPropagation();delTask(${t.id})">✕</span>`; el.onclick=()=>toggleTask(t.id); c.appendChild(el); };
  ['tasks-pend','tasks-done'].forEach(id=>{ const el=document.getElementById(id); if(el){ el.innerHTML=''; if(id==='tasks-pend'){ if(!pend.length){ el.innerHTML='<div class="empty"><div class="empty-ico">🎉</div><div class="empty-txt">Tudo feito!</div></div>'; } else pend.forEach(t=>mkItem(t,el)); } else { if(!done.length){ el.innerHTML='<div class="empty"><div class="empty-ico">✅</div><div class="empty-txt">Nenhuma concluída ainda</div></div>'; } else done.forEach(t=>mkItem(t,el)); } } });
  const ht=document.getElementById('hoje-tasks'); if(ht){ ht.innerHTML=''; pend.slice(0,5).forEach(t=>{ const cm=CAT[t.cat]||CAT.w; const el=document.createElement('div'); el.className='ti'; el.innerHTML=`<div class="tcb"></div><div class="tt">${t.text}</div><span class="tbadge ${cm.c}">${cm.l}</span>`; el.onclick=()=>{ t.done=true; saveTasks(); renderAll(); }; ht.appendChild(el); }); if(!pend.length) ht.innerHTML='<div class="empty"><div class="empty-ico">✅</div><div class="empty-txt">Tudo feito hoje!</div></div>'; }
  const sp=document.getElementById('st-pend'); if(sp) sp.textContent=pend.length;
  const sd=document.getElementById('st-done2'); if(sd) sd.textContent=done.length+' feitas';
  const bt=document.getElementById('badge-t'); if(bt) bt.textContent=pend.length;
  const dc=document.getElementById('done-ct'); if(dc) dc.textContent=done.length;
  const total=tasks.length, doneN=done.length, pct=total?Math.round(doneN/total*100):0;
  const tpb=document.getElementById('t-pb'); if(tpb) tpb.style.width=pct+'%';
  const tlbl=document.getElementById('t-lbl'); if(tlbl) tlbl.textContent=`${doneN} de ${total}`;
  const spt=document.getElementById('sp-tasks'); if(spt) spt.style.width=pct+'%';
  ['w','p','h','u'].forEach(k=>{ const el=document.getElementById('ct-'+k); if(el){ const n=tasks.filter(t=>t.cat===k).length; el.textContent=n+' '+(CAT[k]?.l||k); } });
}

// ── WATER ──
let water = load('water',0);
function renderWater(){
  ['wc-hoje','wc-hab'].forEach(id=>{ const el=document.getElementById(id); if(!el) return; el.innerHTML=''; for(let i=0;i<8;i++){ const c=document.createElement('div'); c.className='wc'+(i<water?' done':''); c.onclick=()=>{ water=i<water?i:i+1; save('water',water); renderWater(); updateStats(); }; el.appendChild(c); } });
  const ap=document.getElementById('agua-pill'); if(ap) ap.textContent=water+'/8';
  const ah=document.getElementById('ag-pill-hab'); if(ah) ah.textContent=water+'/8';
  const stag=document.getElementById('st-ag'); if(stag) stag.textContent=water+'/8';
}

// ── MOOD ──
function setMood(el){ document.querySelectorAll('.mood-btn').forEach(b=>b.classList.remove('selected')); el.classList.add('selected'); }

// ── HABITS ──
let habits = load('habits',['Acordar 6:30','Treino (CrossFit/Academia/Jiu)','Inglês 30min','Beber 2L água','Sem redes até 9h','Leitura 20min','Leitura Bíblia','Dormir até 23h','Inbox zerado','Rotina 100%']);
let habitState = load('habitState',{});
function saveHabits(){ save('habits',habits); save('habitState',habitState); }
function addHabit(){
  const n=prompt('Nome do hábito:'); if(!n||!n.trim()) return;
  habits.push(n.trim()); saveHabits(); renderHabits();
}
function renderHabits(){
  const grid=document.getElementById('hab-grid'); if(!grid) return;
  const labels=document.getElementById('hab-day-labels'); if(labels) labels.innerHTML='';
  const today=new Date(), dn=['D','S','T','Q','Q','S','S'];
  const days7=[]; for(let i=6;i>=0;i--){ const d=new Date(today); d.setDate(today.getDate()-i); days7.push(d); }
  if(labels) days7.forEach(d=>{ const s=document.createElement('span'); s.textContent=dn[d.getDay()]; s.style.cssText='width:24px;text-align:center;font-size:10px;font-weight:600;color:var(--ink4);flex-shrink:0;'; labels.appendChild(s); });
  grid.innerHTML=''; let todayDone=0;
  habits.forEach((h,hi)=>{
    const row=document.createElement('div'); row.className='hb-row';
    const nm=document.createElement('div'); nm.className='hb-name'; nm.textContent=h; nm.title='Clique duplo para editar'; nm.ondblclick=()=>{ const nv=prompt('Editar hábito:',h); if(nv&&nv.trim()){ habits[hi]=nv.trim(); saveHabits(); renderHabits(); } };
    const dots=document.createElement('div'); dots.className='hb-dots';
    days7.forEach((d,di)=>{
      const key=h+'_'+d.toISOString().slice(0,10);
      const state=habitState[key]; // 0/undefined=empty, 1=done, -1=skip
      let className='hb-dot';
      if(state===1) className+=' done'; // green checkmark
      else if(state===-1) className+=' skip'; // red X
      const dot=document.createElement('div'); dot.className=className;
      if(state===1&&di===6) todayDone++;
      dot.onclick=()=>{
        // Cycle: empty -> done -> skip -> empty
        const curr=habitState[key]||0;
        habitState[key]=curr===0?1:(curr===1?-1:0);
        saveHabits(); renderHabits(); updateStats();
      };
      dot.title=state===1?'✓ Feito':state===-1?'✗ Não feito':'';
      dots.appendChild(dot);
    });
    const del=document.createElement('span'); del.className='hb-del'; del.textContent='✕'; del.onclick=()=>{ if(confirm('Remover hábito "'+h+'"?')){ habits.splice(hi,1); saveHabits(); renderHabits(); } };
    row.appendChild(nm); row.appendChild(dots); row.appendChild(del);
    grid.appendChild(row);
  });
  const pct=habits.length?Math.round(todayDone/habits.length*100):0;
  const pb=document.getElementById('hab-pb'); if(pb) pb.style.width=pct+'%';
  const lbl=document.getElementById('hab-today-lbl'); if(lbl) lbl.textContent=todayDone+' de '+habits.length+' hábitos';
  const sth=document.getElementById('st-hab'); if(sth) sth.textContent=todayDone+'/'+habits.length;
  const sph=document.getElementById('sp-hab'); if(sph) sph.style.width=pct+'%';
}

// ── ROUTINE ──
const ENGLISH_DEADLINE='2026-07-10';
function isBeforeEngDeadline(){ return new Date().toISOString().slice(0,10)<=ENGLISH_DEADLINE; }
function daysUntilEng(){ return Math.max(0,Math.ceil((new Date(ENGLISH_DEADLINE)-new Date())/(1000*60*60*24))); }

const ENGLISH_BLOCKS=[
  {time:'07:00',title:'🇺🇸 Inglês — Vocabulário',desc:'15 min flashcards / Anki. Revisar palavras do dia anterior.',badge:'p-bl',isEnglish:true},
  {time:'12:30',title:'🇺🇸 Inglês — Listening',desc:'Podcast ou vídeo em inglês durante o almoço. 15-20 min.',badge:'p-bl',isEnglish:true},
  {time:'21:00',title:'🇺🇸 Inglês — Reading/Speaking',desc:'20 min leitura em inglês ou prática de conversação.',badge:'p-bl',isEnglish:true},
];

// Update English countdown in sidebar
function updateEngCountdown(){
  const el=document.getElementById('eng-countdown');
  if(el){
    if(isBeforeEngDeadline()){ el.style.display='flex'; el.querySelector('.sst-n').textContent=daysUntilEng(); }
    else { el.style.display='none'; }
  }
}

const ROUTINE_DAYS_DATA = [
  {name:'Segunda',focus:'Meta Ads + Relatórios',blocks:[
    {time:'06:30',title:'🏋️ Treino — CrossFit/Academia',desc:'Treino pesado. Sem celular. Foco total no exercício.',badge:'p-gr'},
    {time:'08:00',title:'Verificar notificações Meta Ads',desc:'Alertas, contas com restrição, anúncios reprovados, gastos fora do padrão. 20 contas.',badge:'p-bl'},
    {time:'08:30',title:'Revisar todas as contas (20 clientes)',desc:'Gasto, CPL, frequência, CTR de CADA cliente. Anotar quem está fora da meta. Priorizar os 5 piores.',badge:'p-bl'},
    {time:'09:30',title:'Identificar alertas críticos',desc:'CPL +30% → marcar otimização. Reprovados → resolver HOJE. Budgets estourando → ajustar.',badge:'p-re'},
    {time:'10:30',title:'Relatórios pendentes (Acqua, etc)',desc:'Montar e enviar relatórios que ficaram da semana anterior. Acqua é prioridade.',badge:'p-am'},
    {time:'11:30',title:'Responder mensagens de clientes',desc:'WhatsApp + e-mail. SLA: 2h úteis. Todos os 20 clientes.',badge:'p-gr'},
    {time:'14:00',title:'Otimizações urgentes',desc:'Campanhas que estão sangrando dinheiro → pausar/ajustar AGORA.',badge:'p-re'},
    {time:'15:00',title:'Projetos paralelos — ZENITH / Desenvolvimento',desc:'1h dedicada a projetos em desenvolvimento. GoTech, Apple, GHL.',badge:'p-vi'},
    {time:'16:00',title:'Planejamento da semana',desc:'Atualizar tasks, priorizar entregas, definir o que é urgente vs importante.',badge:'p-gy'},
    {time:'18:00',title:'🥋 Jiu-Jitsu',desc:'Voltar pro tatame. Consistência > intensidade. Ir mesmo cansado.',badge:'p-gr'},
  ]},
  {name:'Terça',focus:'Criativos + Conteúdo',blocks:[
    {time:'06:30',title:'🏋️ Treino — Academia',desc:'Treino de força. Upper body ou o que estiver no plano.',badge:'p-gr'},
    {time:'08:00',title:'Exportar relatório de criativos (20 contas)',desc:'Últimos 7 dias. CTR, CPM, CPL, Frequência. Identificar padrões.',badge:'p-bl'},
    {time:'08:30',title:'Classificar vencedores vs pausar',desc:'CTR > 2% + CPL ok = vencedor → escalar. CTR < 1% + gasto > R$30 = pausar.',badge:'p-gr'},
    {time:'09:30',title:'Criativos novos necessários',desc:'Clientes sem vencedor há 14 dias → urgente. Frequência > 2,5 → troca. Mapear os 20.',badge:'p-am'},
    {time:'10:30',title:'Solicitar materiais aos clientes',desc:'Mensagem específica pedindo foto/vídeo/oferta. Não ser genérico.',badge:'p-bl'},
    {time:'11:30',title:'Roteirizar copies e hooks',desc:'Criar copies pra todos os criativos novos mapeados.',badge:'p-am'},
    {time:'14:00',title:'Produzir criativos',desc:'Montar peças, variações. Foco em volume: 2-3 criativos por cliente que precisa.',badge:'p-bl'},
    {time:'16:00',title:'Campanhas especiais (Gestante SCAC, Direct, Apple)',desc:'Trabalhar nas campanhas específicas: Gestante SCAC, WPP→Direct Ordem Club, Apple.',badge:'p-vi'},
    {time:'18:00',title:'🥋 Jiu-Jitsu',desc:'Treino de Jiu-Jitsu. Mínimo 3x por semana até julho.',badge:'p-gr'},
  ]},
  {name:'Quarta',focus:'Otimizações + Execução',blocks:[
    {time:'06:30',title:'🏋️ Treino — CrossFit',desc:'WOD do dia. Dar o máximo.',badge:'p-gr'},
    {time:'08:00',title:'Executar pausas mapeadas (20 contas)',desc:'Pausar criativos CTR < 1% + gasto > R$30. Um por um, cada conta.',badge:'p-re'},
    {time:'09:00',title:'Escalar criativos vencedores',desc:'+20-30% budget nos winners. Não reiniciar aprendizado. Cuidado.',badge:'p-gr'},
    {time:'10:00',title:'Subir criativos novos',desc:'Hook → dor → solução → CTA. 1+ criativo por cliente que precisa.',badge:'p-am'},
    {time:'11:30',title:'Ajustes de público e segmentação',desc:'Frequência alta → ampliar público. CPM alto → rever segmentação.',badge:'p-bl'},
    {time:'14:00',title:'GHL + Automações (Apple, Nexo)',desc:'Configurar GHL pra Loja Apple, Nexo Apple. Automações de WhatsApp.',badge:'p-vi'},
    {time:'15:30',title:'Documentar todas as mudanças',desc:'O que pausou, escalou, criou. Data e motivo. CADA conta.',badge:'p-gy'},
    {time:'16:30',title:'Responder mensagens pendentes',desc:'Sweep de todas as mensagens não respondidas.',badge:'p-bl'},
  ]},
  {name:'Quinta',focus:'Relatórios + Entregas',blocks:[
    {time:'06:30',title:'🏋️ Treino — Academia',desc:'Legs day ou treino do plano.',badge:'p-gr'},
    {time:'07:30',title:'Exportar dados de TODAS as 20 contas',desc:'Investimento, alcance, frequência, CTR, leads, CPL. Organizar em planilha.',badge:'p-bl'},
    {time:'08:30',title:'Montar relatórios semanais (batch)',desc:'KPIs por cliente. 2 positivos + 2 ações. Personalizar CADA um.',badge:'p-bl'},
    {time:'11:00',title:'Enviar relatórios — WhatsApp',desc:'Mensagem personalizada pra CADA grupo. Nunca copy-paste.',badge:'p-gr'},
    {time:'12:30',title:'Responder dúvidas dos relatórios',desc:'Clientes respondem na quinta. Tom didático. SLA: 2h.',badge:'p-gr'},
    {time:'14:00',title:'Follow-up clientes sem resposta',desc:'Sem resposta em 48h → mensagem curta verificando.',badge:'p-am'},
    {time:'15:00',title:'Feedback lojistas — postar',desc:'Criar e postar feedbacks dos lojistas Apple. Conteúdo social proof.',badge:'p-vi'},
    {time:'16:00',title:'Planejamento de Maio + Anúncios Apple',desc:'Adiantar planejamento do próximo mês. Estruturar anúncios Apple.',badge:'p-am'},
    {time:'18:00',title:'🥋 Jiu-Jitsu',desc:'Treino de Jiu-Jitsu. 3ª sessão da semana.',badge:'p-gr'},
  ]},
  {name:'Sexta',focus:'Comercial + Prospecção',blocks:[
    {time:'06:30',title:'🏋️ Treino — CrossFit/Academia',desc:'Último treino pesado da semana. Dar tudo.',badge:'p-gr'},
    {time:'08:00',title:'Revisar pipeline de prospecção',desc:'Quem está em proposta? Primeiro contato? Definir 2-3 alvos novos.',badge:'p-bl'},
    {time:'08:30',title:'Follow-up de propostas abertas',desc:'Proposta > 3 dias → follow-up direto. Não deixar esfriar.',badge:'p-am'},
    {time:'09:30',title:'Prospecção ativa — 3 contatos mínimo',desc:'Clínicas de estética, harmonização, varejo local, lojas. Mensagem personalizada.',badge:'p-gr'},
    {time:'11:00',title:'Preparar pitch e materiais',desc:'Atualizar deck. Selecionar cases pro nicho do prospect.',badge:'p-bl'},
    {time:'14:00',title:'Finalizar pendências da semana',desc:'O que ficou pra trás? GoTech, Artur, SCAC — resolver AGORA.',badge:'p-re'},
    {time:'15:00',title:'Análise da semana comercial',desc:'Quantos contatos? Respostas? Taxa de conversão? Aprendizados.',badge:'p-am'},
    {time:'16:00',title:'ZENITH Company — desenvolvimento',desc:'Dedicar 1h+ pro projeto ZENITH. Estrutura de vendas.',badge:'p-vi'},
  ]},
  {name:'Sábado',focus:'Revisão + Estudo + Leve',blocks:[
    {time:'08:00',title:'Revisão completa da semana',desc:'O que executou vs planejado? Pendências? O que aprendeu? Anotar TUDO.',badge:'p-gy'},
    {time:'09:00',title:'Atualizar portal e tasks',desc:'Fechar tasks concluídas. Criar tasks da próxima semana.',badge:'p-bl'},
    {time:'09:30',title:'Verificar budgets (20 contas)',desc:'Algum cliente terminando budget? Calcular ritmo e ajustar.',badge:'p-am'},
    {time:'10:00',title:'Planejamento para lojistas Apple',desc:'Planejar estratégia, criativos e campanhas dos lojistas.',badge:'p-vi'},
    {time:'11:00',title:'📚 Estudo — Meta Ads & Marketing',desc:'Jon Loomer (Advantage+), Ben Heath (CBO), Paulo Maccedo (Copy). 1h focada.',badge:'p-gr'},
    {time:'12:00',title:'Descanso ativo',desc:'Sábado à tarde é LIVRE. Máximo 2h de trabalho. Recarregar pro domingo.',badge:'p-gr'},
  ]},
];

// ── INJECT ENGLISH BLOCKS (AFTER DATA IS DEFINED) ──
(function injectEnglishBlocks(){
  if(!isBeforeEngDeadline()) return;
  ROUTINE_DAYS_DATA.forEach(day=>{
    if(!day.blocks.some(b=>b.isEnglish)){
      ENGLISH_BLOCKS.forEach(eb=>{ day.blocks.push({...eb}); });
      day.blocks.sort((a,b)=>a.time.localeCompare(b.time));
    }
  });
})();

// ── RESTORE SAVED CUSTOM BLOCKS ──
(function restoreCustomBlocks(){
  const saved=load('customBlocks',{});
  Object.keys(saved).forEach(di=>{
    const dayIdx=parseInt(di);
    if(ROUTINE_DAYS_DATA[dayIdx]){
      saved[di].forEach(cb=>{
        if(!ROUTINE_DAYS_DATA[dayIdx].blocks.some(b=>b.title===cb.title&&b.time===cb.time)){
          ROUTINE_DAYS_DATA[dayIdx].blocks.push(cb);
        }
      });
      ROUTINE_DAYS_DATA[dayIdx].blocks.sort((a,b)=>a.time.localeCompare(b.time));
    }
  });
})();

// ── RESTORE SAVED EDITS ──
(function restoreRoutineEdits(){
  ROUTINE_DAYS_DATA.forEach((day,di)=>{
    day.blocks.forEach((b,bi)=>{
      const savedTitle=load('routine_edit_'+di+'_'+bi+'_title',null);
      const savedDesc=load('routine_edit_'+di+'_'+bi+'_desc',null);
      if(savedTitle!==null) b.title=savedTitle;
      if(savedDesc!==null) b.desc=savedDesc;
    });
  });
})();

let routineState = load('routineState',{});
let curDay = (()=>{ const d=new Date().getDay(); const m={0:5,1:0,2:1,3:2,4:3,5:4,6:5}; return m[d]??0; })();

function buildRoutine(){
  const cont=document.getElementById('day-panels'); if(!cont) return;
  cont.innerHTML='';
  // tabs
  document.querySelectorAll('.day-tab').forEach((t,i)=>{ t.classList.toggle('active',i===curDay); });
  ROUTINE_DAYS_DATA.forEach((day,di)=>{
    const panel=document.createElement('div');
    panel.className='day-panel'+(di===curDay?' active':'');
    panel.id='dp-'+di;
    panel.innerHTML=`
      <div class="g2">
        <div>
          <div style="margin-bottom:14px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="font-size:10px;color:var(--ink4);font-weight:600;">Progresso</span><span style="font-size:10px;font-weight:700;color:var(--ink);" id="rp-${di}">0/${day.blocks.length}</span></div>
            <div class="pb-wrap"><div class="pb pb-blue" id="rpb-${di}" style="width:0%"></div></div>
          </div>
          <div class="time-blocks" id="tbs-${di}">
            ${day.blocks.map((b,bi)=>`
              <div class="tb-row">
                <div class="tb-time"${b.isEnglish?' style="color:#0891B2;"':''}>${b.time}</div>
                <div class="tb-line"><div class="tb-dot${routineState[di+'-'+bi]?' done':''}" id="td-${di}-${bi}"${b.isEnglish&&!routineState[di+'-'+bi]?' style="border-color:#0891B2;"':''}></div><div class="tb-connector"></div></div>
                <div class="tb-card${routineState[di+'-'+bi]?' done':''}${b.isEnglish?' eng':''}" id="tc-${di}-${bi}" onclick="toggleRoutineBlock(${di},${bi})">
                  <div class="tb-head">
                    <span class="tb-title" contenteditable="true" onclick="event.stopPropagation()" onblur="saveRoutineEdit(${di},${bi},'title',this.textContent)">${b.title}${b.isEnglish?'<span class="eng-tag">até 10/jul</span>':''}</span>
                    <div class="tb-actions">
                      ${!b.isEnglish?`<button class="tb-act-btn" onclick="event.stopPropagation();delRoutineBlock(${di},${bi})" title="Remover">✕</button>`:''}
                    </div>
                    <span class="pill ${b.badge}" style="font-size:9px;">${b.time}</span>
                  </div>
                  <div class="tb-desc" contenteditable="true" onclick="event.stopPropagation()" onblur="saveRoutineEdit(${di},${bi},'desc',this.textContent)">${b.desc}</div>
                </div>
              </div>`).join('')}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:14px;">
          <div class="card">
            <div class="card-t"><div class="card-t-l">🎯 Foco: ${day.focus}</div><button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();addRoutineBlockDay(${di})">+ Bloco</button></div>
            <div class="pb-lbl" style="margin-bottom:4px;">Clique em qualquer texto para editar. Clique no card para marcar como feito.</div>
          </div>
          <div class="card">
            <div class="card-t"><div class="card-t-l">📝 Notas do dia</div></div>
            <textarea class="inp textarea" placeholder="Anotações de ${day.name}..." id="rnotes-${di}" onblur="saveRoutineNotes(${di},this.value)" style="min-height:90px;">${load('rnotes_'+di,'')}</textarea>
          </div>
        </div>
      </div>`;
    cont.appendChild(panel);
    updateRoutineProg(di);
  });
}

function selDay(idx,el){
  curDay=idx;
  document.querySelectorAll('.day-tab').forEach((t,i)=>t.classList.toggle('active',i===idx));
  document.querySelectorAll('.day-panel').forEach((p,i)=>p.classList.toggle('active',i===idx));
}

function toggleRoutineBlock(di,bi){
  const key=di+'-'+bi;
  routineState[key]=!routineState[key];
  save('routineState',routineState);
  const card=document.getElementById('tc-'+di+'-'+bi);
  const dot=document.getElementById('td-'+di+'-'+bi);
  if(card) card.classList.toggle('done',routineState[key]);
  if(dot) dot.classList.toggle('done',routineState[key]);
  updateRoutineProg(di);
}

function updateRoutineProg(di){
  const total=ROUTINE_DAYS_DATA[di].blocks.length;
  const done=Object.keys(routineState).filter(k=>k.startsWith(di+'-')&&routineState[k]).length;
  const el=document.getElementById('rp-'+di); if(el) el.textContent=`${done}/${total}`;
  const pb=document.getElementById('rpb-'+di); if(pb) pb.style.width=(total?Math.round(done/total*100):0)+'%';
}

function saveRoutineEdit(di,bi,field,val){
  ROUTINE_DAYS_DATA[di].blocks[bi][field]=val;
  // persist custom edits
  const key='routine_edit_'+di+'_'+bi+'_'+field;
  save(key,val);
}

function saveRoutineNotes(di,val){ save('rnotes_'+di,val); }

let blockModalDayIdx=0;
let blockModalBadge='p-bl';

function selectBlockBadge(badge,el){
  blockModalBadge=badge;
  document.querySelectorAll('.badge-opt').forEach(b=>{b.style.borderColor='transparent';});
  el.style.borderColor=getComputedStyle(document.documentElement).getPropertyValue(badge==='p-bl'?'--blue':badge==='p-gr'?'--green':badge==='p-am'?'--amber':badge==='p-re'?'--red':'--ink3');
}

function addRoutineBlock(){
  blockModalDayIdx=curDay;
  blockModalBadge='p-bl';
  document.getElementById('block-modal-title').textContent='⚡ Novo Bloco';
  document.getElementById('block-modal-sub').textContent='Adicionar à rotina de '+ROUTINE_DAYS_DATA[curDay].name;
  document.getElementById('b-time').value='09:00';
  document.getElementById('b-title').value='';
  document.getElementById('b-desc').value='';
  document.querySelectorAll('.badge-opt').forEach((b,i)=>{b.style.borderColor=i===0?'var(--blue)':'transparent';});
  document.getElementById('block-modal').classList.add('open');
  setTimeout(()=>document.getElementById('b-title').focus(),200);
}

function addRoutineBlockDay(di){
  blockModalDayIdx=di;
  blockModalBadge='p-bl';
  document.getElementById('block-modal-title').textContent='⚡ Novo Bloco';
  document.getElementById('block-modal-sub').textContent='Adicionar à rotina de '+ROUTINE_DAYS_DATA[di].name;
  document.getElementById('b-time').value='09:00';
  document.getElementById('b-title').value='';
  document.getElementById('b-desc').value='';
  document.querySelectorAll('.badge-opt').forEach((b,i)=>{b.style.borderColor=i===0?'var(--blue)':'transparent';});
  document.getElementById('block-modal').classList.add('open');
  setTimeout(()=>document.getElementById('b-title').focus(),200);
}

function saveBlockFromModal(){
  const title=document.getElementById('b-title').value.trim();
  if(!title){ document.getElementById('b-title').style.borderColor='var(--red)'; setTimeout(()=>document.getElementById('b-title').style.borderColor='',1500); return; }
  const time=document.getElementById('b-time').value||'09:00';
  const desc=document.getElementById('b-desc').value;
  const di=blockModalDayIdx;
  const block={time,title,desc,badge:blockModalBadge,isCustom:true};
  ROUTINE_DAYS_DATA[di].blocks.push(block);
  ROUTINE_DAYS_DATA[di].blocks.sort((a,b)=>a.time.localeCompare(b.time));
  const saved=load('customBlocks',{});
  if(!saved[di]) saved[di]=[];
  saved[di].push(block);
  save('customBlocks',saved);
  closeModal('block-modal');
  buildRoutine();
}

function delRoutineBlock(di,bi){
  if(!confirm('Remover este bloco?')) return;
  const block=ROUTINE_DAYS_DATA[di].blocks[bi];
  ROUTINE_DAYS_DATA[di].blocks.splice(bi,1);
  // Remove from custom blocks if it was custom
  if(block&&block.isCustom){
    const saved=load('customBlocks',{});
    if(saved[di]){
      saved[di]=saved[di].filter(b=>!(b.title===block.title&&b.time===block.time));
      save('customBlocks',saved);
    }
  }
  // Clean up routineState keys for this day (re-index)
  const newState={};
  Object.keys(routineState).forEach(k=>{
    if(!k.startsWith(di+'-')) newState[k]=routineState[k];
  });
  ROUTINE_DAYS_DATA[di].blocks.forEach((_,i)=>{
    const oldKey=di+'-'+(i>=bi?i+1:i);
    if(routineState[oldKey]) newState[di+'-'+i]=routineState[oldKey];
  });
  routineState=newState;
  save('routineState',routineState);
  buildRoutine();
}

// ── MEETINGS ──
let meetings = load('meetings',[]);
const MEET_TYPES = {meet:'📹',zoom:'💻',pres:'🤝',call:'📞',other:'📌'};
function openMeetModal(){ const el=document.getElementById('meet-modal'); el.classList.add('open'); document.getElementById('m-date').value=new Date().toISOString().slice(0,10); }
function saveMeeting(){
  const t=document.getElementById('m-title').value.trim(); if(!t){ alert('Informe o título'); return; }
  meetings.push({ id:Date.now(), title:t, date:document.getElementById('m-date').value, time:document.getElementById('m-time').value, people:document.getElementById('m-people').value, link:document.getElementById('m-link').value.trim(), type:document.getElementById('m-type').value, done:false });
  save('meetings',meetings);
  closeModal('meet-modal');
  ['m-title','m-date','m-time','m-people','m-link'].forEach(id=>document.getElementById(id).value='');
  renderMeetings();
}
function delMeeting(id){ meetings=meetings.filter(m=>m.id!==id); save('meetings',meetings); renderMeetings(); }
function renderMeetings(){
  const now=new Date().toISOString().slice(0,10)+' '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  const up=meetings.filter(m=>((m.date||'')+(m.time?(' '+m.time):''))>=now).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  const past=meetings.filter(m=>((m.date||'')+(m.time?(' '+m.time):''))<now).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
  const mkCard=(m,isPast)=>{
    const el=document.createElement('div'); el.className='meet-card'+(isPast?' past':'');
    const ico=MEET_TYPES[m.type]||'📌';
    const dateStr=m.date?new Date(m.date+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}):'—';
    el.innerHTML=`<div class="meet-time-col"><div class="meet-time">${m.time||'—'}</div><div class="meet-date-lbl">${dateStr}</div></div><div style="width:3px;background:var(--border2);border-radius:2px;flex-shrink:0;min-height:40px;"></div><div class="meet-body"><div class="meet-title">${ico} ${m.title}</div>${m.people?`<div class="meet-meta">👥 ${m.people}</div>`:''}${m.link?`<a class="meet-link-btn" href="${m.link}" target="_blank">🔗 Abrir link</a>`:''}</div><button class="meet-del" onclick="event.stopPropagation();delMeeting(${m.id})">✕</button>`;
    return el;
  };
  const upEl=document.getElementById('meets-upcoming'); if(upEl){ upEl.innerHTML=''; if(!up.length) upEl.innerHTML='<div class="empty"><div class="empty-ico">📅</div><div class="empty-txt">Nenhuma reunião futura</div></div>'; else up.forEach(m=>upEl.appendChild(mkCard(m,false))); }
  const paEl=document.getElementById('meets-past'); if(paEl){ paEl.innerHTML=''; if(!past.length) paEl.innerHTML='<div class="empty"><div class="empty-ico">📋</div><div class="empty-txt">Nenhuma reunião passada</div></div>'; else past.forEach(m=>paEl.appendChild(mkCard(m,true))); }
  // hoje
  const todayStr=new Date().toISOString().slice(0,10);
  const todayMeets=meetings.filter(m=>m.date===todayStr);
  const ht=document.getElementById('hoje-meets'); if(ht){ ht.innerHTML=''; if(!todayMeets.length) ht.innerHTML='<div class="empty"><div class="empty-ico">☀️</div><div class="empty-txt">Sem reuniões hoje</div></div>'; else todayMeets.forEach(m=>{ const el=document.createElement('div'); el.style.cssText='padding:8px 10px;background:var(--blue-lt);border:1px solid var(--blue-md);border-radius:8px;margin-bottom:6px;'; el.innerHTML=`<div style="font-size:12px;font-weight:700;color:var(--blue);">${MEET_TYPES[m.type]||'📅'} ${m.title}</div><div style="font-size:11px;color:var(--ink3);margin-top:2px;">${m.time||''} ${m.link?'· <a href="'+m.link+'" target="_blank" style="color:var(--blue)">Abrir link</a>':''}</div>`; ht.appendChild(el); }); }
  const sm=document.getElementById('st-meet'); if(sm) sm.textContent=todayMeets.length;
  const sn=document.getElementById('st-meet-next'); if(sn) sn.textContent=up.length>0?(up[0].time+' – '+up[0].title).slice(0,28):'Sem próximas';
}

// ── GOOGLE DOCS ──
let docs = load('docs',[]);
const DOC_TYPES={doc:{l:'Google Doc',ico:'📄',bg:'#E8F0FE'},sheet:{l:'Planilha',ico:'📊',bg:'#E6F4EA'},slide:{l:'Slides',ico:'📑',bg:'#FCE8E6'},form:{l:'Formulário',ico:'📋',bg:'#F3E8FF'},drive:{l:'Drive',ico:'📁',bg:'#FFF3E0'}};
const DOC_CATS={bls:'💼 BLS',zenith:'⚡ ZENITH',personal:'🙂 Pessoal',client:'👥 Cliente'};
function openDocsModal(){ document.getElementById('docs-modal').classList.add('open'); }
function saveDoc(){
  const n=document.getElementById('d-name').value.trim(); if(!n){ alert('Informe o nome'); return; }
  const l=document.getElementById('d-link').value.trim(); if(!l){ alert('Informe o link'); return; }
  docs.push({id:Date.now(),name:n,link:l,type:document.getElementById('d-type').value,cat:document.getElementById('d-cat').value});
  save('docs',docs);
  closeModal('docs-modal');
  ['d-name','d-link'].forEach(id=>document.getElementById(id).value='');
  renderDocs();
}
function delDoc(id){ docs=docs.filter(d=>d.id!==id); save('docs',docs); renderDocs(); }
function renderDocs(){
  const docTypes=['doc'];
  const otherTypes=['sheet','slide','form','drive'];
  const mkCard=(d)=>{
    const dt=DOC_TYPES[d.type]||DOC_TYPES.doc;
    const el=document.createElement('div'); el.className='gdoc-card';
    el.innerHTML=`<div class="gdoc-ico" style="background:${dt.bg};">${dt.ico}</div><div style="flex:1;min-width:0;"><div class="gdoc-name">${d.name}</div><div class="gdoc-type">${dt.l} · ${DOC_CATS[d.cat]||d.cat}</div></div><a href="${d.link}" target="_blank" class="gdoc-open">Abrir →</a><button class="gdoc-del" onclick="event.stopPropagation();delDoc(${d.id})">✕</button>`;
    return el;
  };
  const dl=document.getElementById('docs-list'); if(dl){ dl.innerHTML=''; const filtered=docs.filter(d=>d.type==='doc'); if(!filtered.length) dl.innerHTML='<div class="gdoc-empty"><div class="gdoc-empty-ico">📄</div>Nenhum documento vinculado ainda</div>'; else filtered.forEach(d=>dl.appendChild(mkCard(d))); }
  const sl=document.getElementById('sheets-list'); if(sl){ sl.innerHTML=''; const filtered=docs.filter(d=>d.type!=='doc'); if(!filtered.length) sl.innerHTML='<div class="gdoc-empty"><div class="gdoc-empty-ico">📊</div>Nenhuma planilha ou arquivo vinculado</div>'; else filtered.forEach(d=>sl.appendChild(mkCard(d))); }
}

function closeModal(id){ document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('.modal-overlay').forEach(m=>m.addEventListener('click',e=>{ if(e.target===m) m.classList.remove('open'); }));

// ── NOTES ──
const NOTE_THEMES=[
  {id:'white',name:'Branco',bg:'#FFFFFF',text:'#0C0C14',border:'#E2E4EC',dark:false},
  {id:'cream',name:'Creme',bg:'#FFFDF5',text:'#3D3929',border:'#F0EBDF',dark:false},
  {id:'blue',name:'Azul',bg:'#EEF2FF',text:'#1B3A5C',border:'#BAC8FF',dark:false},
  {id:'green',name:'Verde',bg:'#E6FCF5',text:'#064E3B',border:'#96F2D7',dark:false},
  {id:'yellow',name:'Amarelo',bg:'#FFF3BF',text:'#7A5000',border:'#FFE066',dark:false},
  {id:'pink',name:'Rosa',bg:'#FFF0F6',text:'#831843',border:'#FBCFE8',dark:false},
  {id:'lavender',name:'Lilás',bg:'#F3F0FF',text:'#4C1D95',border:'#C4B5FD',dark:false},
  {id:'red',name:'Vermelho',bg:'#FFF5F5',text:'#7F1D1D',border:'#FECACA',dark:false},
  {id:'black',name:'Preto',bg:'#111111',text:'#F0F0F0',border:'#333',dark:true},
  {id:'midnight',name:'Meia-noite',bg:'#0F1729',text:'#CBD5E1',border:'#1E2D4A',dark:true},
];

const NOTE_PRIORITIES={
  none:{label:'',color:'transparent',text:'transparent'},
  low:{label:'BAIXA',color:'#10B981',text:'#fff'},
  medium:{label:'MÉDIA',color:'#F59E0B',text:'#fff'},
  high:{label:'ALTA',color:'#EF4444',text:'#fff'},
  urgent:{label:'URGENTE',color:'#7C3AED',text:'#fff'},
};

let notes = load('notes',[
  {id:1,title:'📋 Foco do mês',body:'Meta: 17-18 clientes\nFechar 3 novas prospecções\nRelatorios em dia toda quinta',color:'blue',priority:'high',pinned:true,ts:Date.now()},
  {id:2,title:'💡 Ideias de conteúdo',body:'Reels sobre bastidores da agência\nCarrossel explicando Meta Ads\nPost sobre cases de sucesso',color:'green',priority:'medium',pinned:false,ts:Date.now()},
  {id:3,title:'📚 Estudar esta semana',body:'Jon Loomer - Advantage+\nBen Heath - CBO avançado\nPaulo Maccedo - Copy',color:'yellow',priority:'none',pinned:false,ts:Date.now()},
]);

let editingNoteId=null;
let noteModalTheme='white';
let noteModalPriority='none';

function saveNotes(){ save('notes',notes); }

function getTheme(id){ return NOTE_THEMES.find(t=>t.id===id)||NOTE_THEMES[0]; }

// Legacy color migration
function migrateNoteColor(n){
  if(n.color&&n.color.startsWith('#')){
    const map={'#FFFFFF':'white','#EEF2FF':'blue','#E6FCF5':'green','#FFF3BF':'yellow','#FFF0F6':'pink','#F3F0FF':'lavender'};
    n.color=map[n.color]||'white';
  }
  if(!n.priority) n.priority='none';
  if(n.pinned===undefined) n.pinned=false;
}

function addNote(){
  editingNoteId=null;
  noteModalTheme='white';
  noteModalPriority='none';
  document.getElementById('note-modal-title').textContent='📝 Nova Nota';
  document.getElementById('n-title').value='';
  document.getElementById('n-body').value='';
  document.getElementById('n-pinned').checked=false;
  buildNoteThemes();
  buildNotePrioritySelect();
  updateNotePreview();
  document.getElementById('note-modal').classList.add('open');
  setTimeout(()=>document.getElementById('n-title').focus(),200);
}

function editNoteModal(id){
  const n=notes.find(x=>x.id===id);
  if(!n) return;
  migrateNoteColor(n);
  editingNoteId=id;
  noteModalTheme=n.color||'white';
  noteModalPriority=n.priority||'none';
  document.getElementById('note-modal-title').textContent='✏️ Editar Nota';
  document.getElementById('n-title').value=n.title;
  document.getElementById('n-body').value=n.body;
  document.getElementById('n-pinned').checked=n.pinned||false;
  buildNoteThemes();
  buildNotePrioritySelect();
  updateNotePreview();
  document.getElementById('note-modal').classList.add('open');
}

function buildNoteThemes(){
  const cont=document.getElementById('note-themes');
  cont.innerHTML=NOTE_THEMES.map(t=>`
    <div class="note-theme ${noteModalTheme===t.id?'active':''}" onclick="selectNoteTheme('${t.id}')" style="background:${t.bg};color:${t.text};border-color:${noteModalTheme===t.id?'var(--blue)':'transparent'};">
      <div class="nt-swatch" style="background:${t.bg};border-color:${t.border};${t.dark?'border-color:#555;':''}"></div>
      ${t.name}
    </div>`).join('');
}

function selectNoteTheme(id){
  noteModalTheme=id;
  buildNoteThemes();
  updateNotePreview();
}

function buildNotePrioritySelect(){
  document.querySelectorAll('.note-priority-opt').forEach(el=>{
    const p=el.dataset.p;
    el.classList.toggle('active',p===noteModalPriority);
    if(p===noteModalPriority&&p!=='none'){
      el.style.background=NOTE_PRIORITIES[p].color;
      el.style.borderColor=NOTE_PRIORITIES[p].color;
      el.style.color='#fff';
    }else{
      el.style.background='';
      el.style.borderColor='';
      el.style.color='';
    }
  });
}

function setNotePriority(p,el){
  noteModalPriority=p;
  buildNotePrioritySelect();
}

function updateNotePreview(){
  const theme=getTheme(noteModalTheme);
  const preview=document.getElementById('note-preview');
  const title=document.getElementById('n-title').value||'Prévia da nota...';
  const body=document.getElementById('n-body').value||'O conteúdo aparece aqui em tempo real';
  preview.style.background=theme.bg;
  preview.style.color=theme.text;
  preview.style.borderColor=theme.border;
  document.getElementById('note-preview-title').textContent=title;
  document.getElementById('note-preview-body').textContent=body.substring(0,120)+(body.length>120?'...':'');
}

function saveNoteFromModal(){
  const title=document.getElementById('n-title').value.trim();
  if(!title){ document.getElementById('n-title').style.borderColor='var(--red)'; setTimeout(()=>document.getElementById('n-title').style.borderColor='',1500); return; }
  const body=document.getElementById('n-body').value;
  const pinned=document.getElementById('n-pinned').checked;

  if(editingNoteId){
    const n=notes.find(x=>x.id===editingNoteId);
    if(n){ n.title=title; n.body=body; n.color=noteModalTheme; n.priority=noteModalPriority; n.pinned=pinned; n.ts=Date.now(); }
  }else{
    notes.unshift({id:Date.now(),title,body,color:noteModalTheme,priority:noteModalPriority,pinned,ts:Date.now()});
  }
  editingNoteId=null;
  saveNotes();
  closeModal('note-modal');
  renderNotes();
}

function toggleNotePin(i){
  notes[i].pinned=!notes[i].pinned;
  saveNotes(); renderNotes();
}

function delNote(id){ if(!confirm('Excluir nota?')) return; notes=notes.filter(n=>n.id!==id); saveNotes(); renderNotes(); }

function renderNotes(){
  const grid=document.getElementById('notes-grid'); if(!grid) return;
  grid.innerHTML='';
  // Migrate old colors
  notes.forEach(n=>migrateNoteColor(n));
  // Sort: pinned first, then by timestamp
  const sorted=[...notes].sort((a,b)=>{
    if(a.pinned&&!b.pinned) return -1;
    if(!a.pinned&&b.pinned) return 1;
    return b.ts-a.ts;
  });
  sorted.forEach((n,sortIdx)=>{
    const realIdx=notes.findIndex(x=>x.id===n.id);
    const theme=getTheme(n.color);
    const prio=NOTE_PRIORITIES[n.priority]||NOTE_PRIORITIES.none;
    const isDark=theme.dark;
    const el=document.createElement('div');
    el.className='note-card'+(isDark?' dark':'');
    el.style.background=theme.bg;
    el.style.borderColor=theme.border;

    el.innerHTML=`
      ${n.pinned?`<div class="note-pin pinned" onclick="event.stopPropagation();toggleNotePin(${realIdx})" title="Desafixar">📌</div>`:`<div class="note-pin" onclick="event.stopPropagation();toggleNotePin(${realIdx})" title="Fixar">📌</div>`}
      ${n.priority&&n.priority!=='none'?`<div class="note-priority" style="background:${prio.color};color:${prio.text};">${prio.label}</div>`:''}
      <input class="note-title-inp" value="${n.title.replace(/"/g,'&quot;')}" oninput="notes[${realIdx}].title=this.value;saveNotes();" placeholder="Título..." style="color:${theme.text};${n.pinned?'padding-left:20px;':''}${n.priority&&n.priority!=='none'?'padding-right:52px;':''}">
      <textarea class="note-body-inp" oninput="notes[${realIdx}].body=this.value;saveNotes();" placeholder="Escreva aqui..." style="color:${isDark?'#ccc':theme.text};opacity:${isDark?'0.85':'1'};">${n.body}</textarea>
      <div class="note-footer">
        <div class="note-color-row">
          ${NOTE_THEMES.slice(0,7).map(t=>`<div class="note-color-dot ${n.color===t.id?'active':''}" style="background:${t.bg};border-color:${n.color===t.id?'var(--blue)':t.border};" onclick="event.stopPropagation();notes[${realIdx}].color='${t.id}';saveNotes();renderNotes();"></div>`).join('')}
          ${NOTE_THEMES.slice(7).map(t=>`<div class="note-color-dot dark-dot ${n.color===t.id?'active':''}" style="background:${t.bg};border-color:${n.color===t.id?'#7CB3FF':t.border};" onclick="event.stopPropagation();notes[${realIdx}].color='${t.id}';saveNotes();renderNotes();"></div>`).join('')}
        </div>
        <div class="note-date">${new Date(n.ts).toLocaleDateString('pt-BR')}</div>
        <div style="display:flex;gap:4px;">
          <button class="note-del" onclick="event.stopPropagation();editNoteModal(${n.id})" style="color:var(--blue);">✏️</button>
          <button class="note-del" onclick="event.stopPropagation();delNote(${n.id})">✕</button>
        </div>
      </div>`;
    grid.appendChild(el);
  });
}

// ── DIET ──
let meals = load('meals',[
  {id:1,icon:'🌅',name:'Café da Manhã',time:'07:00',items:[{name:'Ovos mexidos (3 und)',cal:210},{name:'Pão integral (2 fatias)',cal:160},{name:'Café preto + fruta',cal:80}]},
  {id:2,icon:'☀️',name:'Almoço',time:'12:30',items:[{name:'Frango grelhado (200g)',cal:330},{name:'Arroz integral (100g)',cal:130},{name:'Salada verde + feijão',cal:140}]},
  {id:3,icon:'🌙',name:'Jantar',time:'19:00',items:[{name:'Salmão grelhado (180g)',cal:350},{name:'Batata doce (150g)',cal:130},{name:'Legumes no vapor',cal:80}]},
  {id:4,icon:'🥤',name:'Lanches',time:'10:00 / 16:00',items:[{name:'Whey + banana',cal:280},{name:'Castanhas + iogurte',cal:210}]},
]);
function saveMeals(){ save('meals',meals); }
function addMeal(){
  const n=prompt('Nome da refeição:'); if(!n) return;
  const t=prompt('Horário:','12:00')||'12:00';
  meals.push({id:Date.now(),icon:'🍽️',name:n,time:t,items:[]});
  saveMeals(); renderDiet();
}
function addMealItem(mid){
  const m=meals.find(m=>m.id===mid); if(!m) return;
  const n=prompt('Item:'); if(!n) return;
  const c=parseInt(prompt('Calorias:','0'))||0;
  m.items.push({name:n,cal:c});
  saveMeals(); renderDiet();
}
function delMealItem(mid,ii){ const m=meals.find(m=>m.id===mid); if(!m) return; m.items.splice(ii,1); saveMeals(); renderDiet(); }
function delMeal(mid){ if(!confirm('Remover refeição?')) return; meals=meals.filter(m=>m.id!==mid); saveMeals(); renderDiet(); }
function renderDiet(){
  const list=document.getElementById('meals-list'); if(!list) return;
  list.innerHTML='';
  let totalCal=0;
  meals.forEach(m=>{
    const mCal=m.items.reduce((s,i)=>s+i.cal,0); totalCal+=mCal;
    const el=document.createElement('div'); el.className='meal-block';
    el.innerHTML=`<div class="meal-head"><div style="font-size:18px;">${m.icon}</div><div class="meal-name-t">${m.name}</div><div style="font-size:11px;color:var(--ink4);">${m.time}</div><button class="btn btn-ghost btn-sm" onclick="addMealItem(${m.id})" style="margin-left:auto;">+ Item</button><button class="btn btn-ghost btn-sm" onclick="delMeal(${m.id})" style="color:var(--red);">✕</button></div><div class="meal-items">${m.items.map((it,ii)=>`<div class="meal-item"><span class="meal-item-name">${it.name}</span><span class="meal-item-cal">${it.cal} kcal <span style="cursor:pointer;color:var(--ink4);font-size:10px;" onclick="delMealItem(${m.id},${ii})">✕</span></span></div>`).join('')}</div>${m.items.length?`<div class="meal-total-row"><span class="meal-total-lbl">Total</span><span class="meal-total-val">${mCal} kcal</span></div>`:''}`;
    list.appendChild(el);
  });
  const mc=document.getElementById('mac-cal'); if(mc) mc.textContent=totalCal;
}

// ── WORKOUT ──
let workoutDays = load('workoutDays',[
  {id:1,name:'Segunda — Peito + Tríceps',tag:'Hipertrofia · ~60 min',badge:'p-bl',exercises:[{name:'Supino reto (barra)',sets:'4x 10–12'},{name:'Supino inclinado (halteres)',sets:'3x 12'},{name:'Crossover (cabo)',sets:'3x 15'},{name:'Tríceps pulley (corda)',sets:'4x 12'},{name:'Tríceps testa (barra ez)',sets:'3x 10'},{name:'Mergulho (paralelas)',sets:'3x falha'}]},
  {id:2,name:'Terça — Costas + Bíceps',tag:'Hipertrofia · ~65 min',badge:'p-bl',exercises:[{name:'Puxada frontal (barra)',sets:'4x 10–12'},{name:'Remada curvada',sets:'4x 10'},{name:'Remada unilateral',sets:'3x 12'},{name:'Rosca direta (barra)',sets:'4x 10'},{name:'Rosca concentrada',sets:'3x 12'}]},
  {id:3,name:'Quarta — Descanso Ativo',tag:'Cardio · ~30 min',badge:'p-gy',exercises:[{name:'Caminhada (30 min)',sets:'Ritmo leve'},{name:'Alongamento',sets:'15 min'},{name:'Mobilidade articular',sets:'10 min'}]},
  {id:4,name:'Quinta — Ombros + Abdômen',tag:'Hipertrofia · ~55 min',badge:'p-bl',exercises:[{name:'Desenvolvimento (barra)',sets:'4x 10–12'},{name:'Elevação lateral',sets:'4x 15'},{name:'Elevação frontal',sets:'3x 12'},{name:'Abdominal infra',sets:'4x 15'},{name:'Prancha',sets:'3x 60s'}]},
  {id:5,name:'Sexta — Pernas',tag:'Hipertrofia · ~70 min',badge:'p-bl',exercises:[{name:'Agachamento livre',sets:'4x 10–12'},{name:'Leg press 45°',sets:'4x 12'},{name:'Cadeira extensora',sets:'3x 15'},{name:'Mesa flexora',sets:'3x 12'},{name:'Panturrilha em pé',sets:'4x 20'}]},
  {id:6,name:'Sábado — Full Body / Cardio',tag:'Opcional · ~40 min',badge:'p-gr',exercises:[{name:'HIIT (10 min)',sets:'Tiros'},{name:'Circuito funcional',sets:'3 rounds'},{name:'Foam roller',sets:'20 min'}]},
]);
let exState = load('exState',{});
function saveWorkout(){ save('workoutDays',workoutDays); }
function addWorkoutDay(){
  const n=prompt('Nome do dia de treino:'); if(!n) return;
  const t=prompt('Tipo/duração:','Hipertrofia · ~60 min')||'';
  workoutDays.push({id:Date.now(),name:n,tag:t,badge:'p-bl',exercises:[]});
  saveWorkout(); renderWorkout();
}
function addExercise(wid){
  const w=workoutDays.find(w=>w.id===wid); if(!w) return;
  const n=prompt('Nome do exercício:'); if(!n) return;
  const s=prompt('Séries/reps:','3x 12')||'3x 12';
  w.exercises.push({name:n,sets:s});
  saveWorkout(); renderWorkout();
}
function delExercise(wid,ei){ const w=workoutDays.find(w=>w.id===wid); if(!w) return; w.exercises.splice(ei,1); saveWorkout(); renderWorkout(); }
function delWorkoutDay(wid){ if(!confirm('Remover este dia?')) return; workoutDays=workoutDays.filter(w=>w.id!==wid); saveWorkout(); renderWorkout(); }
function renderWorkout(){
  const list=document.getElementById('workout-list'); if(!list) return;
  list.innerHTML='';
  const grid=document.createElement('div'); grid.className='g2'; list.appendChild(grid);
  workoutDays.forEach(w=>{
    const el=document.createElement('div'); el.className='wo-block';
    el.innerHTML=`<div class="wo-head"><div><div class="wo-label">${w.name}</div><div class="wo-tag">${w.tag}</div></div><span class="pill ${w.badge}" style="margin-left:auto;">${w.exercises.length} exerc.</span><button class="btn btn-ghost btn-sm" onclick="delWorkoutDay(${w.id})" style="color:var(--red);">✕</button></div><div class="ex-list">${w.exercises.map((e,ei)=>`<div class="ex-item${exState[w.id+'-'+ei]?' done':''}" onclick="toggleEx(${w.id},${ei})"><div class="ex-check"></div><div class="ex-n">${ei+1}</div><div class="ex-name">${e.name}</div><div class="ex-sets">${e.sets}</div><span style="font-size:10px;color:var(--ink4);cursor:pointer;margin-left:6px;" onclick="event.stopPropagation();delExercise(${w.id},${ei})">✕</span></div>`).join('')}</div><div class="ex-add-row"><button class="btn btn-ghost btn-sm" style="width:100%;" onclick="addExercise(${w.id})">+ Exercício</button></div>`;
    grid.appendChild(el);
  });
}
function toggleEx(wid,ei){ const k=wid+'-'+ei; exState[k]=!exState[k]; save('exState',exState); renderWorkout(); }

// ── WEEK GOALS ──
let weekGoals = load('weekGoals',[]);
function addWeekGoal(){
  const t=prompt('Objetivo da semana:'); if(!t) return;
  weekGoals.push({id:Date.now(),text:t,done:false});
  save('weekGoals',weekGoals); renderWeekGoals();
}
function renderWeekGoals(){
  const list=document.getElementById('week-goals'); if(!list) return;
  list.innerHTML='';
  if(!weekGoals.length){ list.innerHTML='<div class="empty"><div class="empty-ico">🎯</div><div class="empty-txt">Adicione seus objetivos da semana</div></div>'; }
  weekGoals.forEach((g,i)=>{
    const el=document.createElement('div'); el.className='gi'+(g.done?' done':'');
    el.innerHTML=`<div class="gi-check" onclick="weekGoals[${i}].done=!weekGoals[${i}].done;save('weekGoals',weekGoals);renderWeekGoals();"></div><div class="gi-body"><div class="gi-text">${g.text}</div></div><span class="gi-del" onclick="weekGoals.splice(${i},1);save('weekGoals',weekGoals);renderWeekGoals();">✕</span>`;
    list.appendChild(el);
  });
  const done=weekGoals.filter(g=>g.done).length;
  const total=weekGoals.length;
  const pct=total?Math.round(done/total*100):0;
  const pp=document.getElementById('wg-prog'); if(pp) pp.textContent=done+'/'+total;
  const bar=document.getElementById('wg-bar'); if(bar) bar.style.width=pct+'%';
  const sg=document.getElementById('sp-goals'); if(sg) sg.style.width=pct+'%';
}

// ── MONTH GOALS ──
let monthGoals = load('monthGoals',[
  {id:1,name:'Manter 20 clientes ativos + 2 novos',cat:'BLS Group',icon:'📈',color:'#E8F0FE',pct:80,prog_color:'pb-blue'},
  {id:2,name:'Faturamento +25% até junho',cat:'BLS Group',icon:'💰',color:'#E6F4EA',pct:60,prog_color:'pb-green'},
  {id:3,name:'ZENITH — estrutura de vendas pronta',cat:'ZENITH',icon:'⚡',color:'#F3F0FF',pct:30,prog_color:'pb-violet'},
  {id:4,name:'GHL configurado (Apple + Nexo)',cat:'Projetos',icon:'🔧',color:'#E8F0FE',pct:20,prog_color:'pb-blue'},
  {id:5,name:'Treinar 5x/semana (Cross+Acad+Jiu)',cat:'Saúde',icon:'🏋️',color:'#FCE8E6',pct:70,prog_color:'pb-violet'},
  {id:6,name:'Jiu-Jitsu 3x/semana consistente',cat:'Saúde',icon:'🥋',color:'#FCE8E6',pct:40,prog_color:'pb-violet'},
  {id:7,name:'Inglês B2 antes de julho',cat:'Pessoal',icon:'🇺🇸',color:'#E0F2FE',pct:45,prog_color:'pb-blue'},
  {id:8,name:'Beber 2L água/dia (30 dias)',cat:'Saúde',icon:'💧',color:'#E6FCF5',pct:60,prog_color:'pb-green'},
  {id:9,name:'Seguir plano alimentar 90%',cat:'Saúde',icon:'🥗',color:'#FFF3BF',pct:75,prog_color:'pb-amber'},
  {id:10,name:'Leitura da Bíblia diária',cat:'Pessoal',icon:'📖',color:'#F3F0FF',pct:50,prog_color:'pb-violet'},
  {id:11,name:'Europa 1/jul — tudo organizado',cat:'Pessoal',icon:'✈️',color:'#FFF3BF',pct:15,prog_color:'pb-amber'},
]);
let editingGoal=null;
const GOAL_COLORS=['#E8F0FE','#E6F4EA','#F3F0FF','#FCE8E6','#E6FCF5','#FFF3BF','#FFE4E4','#E4F5FF'];
const GOAL_ICONS=['📈','💰','⚡','🔧','🏋️','🥋','🇺🇸','💧','🥗','📖','✈️','🎯','🎨','💻','🚀','🏆','🎯'];
const PROG_COLORS=['pb-blue','pb-green','pb-violet','pb-amber','pb-red','pb-pink','pb-indigo','pb-teal'];
function openGoalModal(goalId=null){
  editingGoal=goalId?monthGoals.find(g=>g.id===goalId):null;
  const modal=document.getElementById('goal-modal')||createGoalModal();
  const form=modal.querySelector('form');
  const titleEl=modal.querySelector('.goal-modal-title');
  if(editingGoal){
    form.querySelector('[name="name"]').value=editingGoal.name;
    form.querySelector('[name="cat"]').value=editingGoal.cat;
    form.querySelector('[name="pct"]').value=editingGoal.pct;
    form.querySelector('[name="icon"]').value=editingGoal.icon;
    form.querySelector('[name="color"]').value=editingGoal.color;
    form.querySelector('[name="prog_color"]').value=editingGoal.prog_color;
    if(titleEl)titleEl.textContent='Editar Objetivo';
  }else{
    form.reset();
    form.querySelector('[name="icon"]').value='🎯';
    form.querySelector('[name="color"]').value='#F4F4F6';
    form.querySelector('[name="prog_color"]').value='pb-blue';
    form.querySelector('[name="cat"]').value='Pessoal';
    form.querySelector('[name="pct"]').value='0';
    if(titleEl)titleEl.textContent='Novo Objetivo';
  }
  modal.style.display='flex';
  form.querySelector('[name="name"]').focus();
}
function closeGoalModal(){
  const modal=document.getElementById('goal-modal');
  if(modal) modal.style.display='none';
  editingGoal=null;
}
function saveGoalForm(){
  const form=document.getElementById('goal-form');
  const data={
    name:form.querySelector('[name="name"]').value.trim(),
    cat:form.querySelector('[name="cat"]').value.trim(),
    pct:Math.max(0,Math.min(100,parseInt(form.querySelector('[name="pct"]').value)||0)),
    icon:form.querySelector('[name="icon"]').value,
    color:form.querySelector('[name="color"]').value,
    prog_color:form.querySelector('[name="prog_color"]').value,
  };
  if(!data.name){alert('Nome é obrigatório');return;}
  if(editingGoal){
    Object.assign(editingGoal,data);
  }else{
    monthGoals.push({id:Date.now(),...data});
  }
  save('monthGoals',monthGoals);
  closeGoalModal();
  renderMonthGoals();
}
function createGoalModal(){
  const modal=document.createElement('div');
  modal.id='goal-modal';
  modal.style.cssText='display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center;';
  let iconOpts='',colorBtns='';
  GOAL_ICONS.forEach(ic=>{ iconOpts+='<option value="'+ic+'">'+ic+'</option>'; });
  GOAL_COLORS.forEach(c=>{ colorBtns+='<button type="button" onclick="document.querySelector(\'[name=\"color\"]\').value=\''+c+'\';this.parentElement.querySelectorAll(\'button\').forEach(b=>b.style.border=\'1px solid transparent\');this.style.border=\'2px solid var(--ink);\'" style="width:30px;height:30px;border:1px solid var(--border);border-radius:4px;background:'+c+';cursor:pointer;"></button>'; });
  modal.innerHTML=`<div style="background:white;border-radius:12px;padding:24px;width:90%;max-width:500px;box-shadow:0 10px 40px rgba(0,0,0,0.2);">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
      <h3 class="goal-modal-title" style="margin:0;font-size:18px;font-weight:700;color:var(--ink);">Novo Objetivo</h3>
      <button onclick="closeGoalModal();" style="background:none;border:none;font-size:24px;cursor:pointer;color:var(--ink4);">✕</button>
    </div>
    <form id="goal-form" style="display:flex;flex-direction:column;gap:12px;">
      <div>
        <label style="display:block;font-size:12px;font-weight:600;color:var(--ink3);margin-bottom:4px;">Nome do Objetivo</label>
        <input type="text" name="name" placeholder="Ex: Manter 20 clientes ativos..." style="width:100%;border:1px solid var(--border);border-radius:6px;padding:8px 12px;font-size:13px;box-sizing:border-box;">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div>
          <label style="display:block;font-size:12px;font-weight:600;color:var(--ink3);margin-bottom:4px;">Categoria</label>
          <input type="text" name="cat" placeholder="Ex: BLS Group, Saúde..." style="width:100%;border:1px solid var(--border);border-radius:6px;padding:8px 12px;font-size:13px;box-sizing:border-box;">
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:600;color:var(--ink3);margin-bottom:4px;">Progresso (%)</label>
          <input type="number" name="pct" min="0" max="100" value="0" style="width:100%;border:1px solid var(--border);border-radius:6px;padding:8px 12px;font-size:13px;box-sizing:border-box;">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div>
          <label style="display:block;font-size:12px;font-weight:600;color:var(--ink3);margin-bottom:4px;">Ícone</label>
          <select name="icon" style="width:100%;border:1px solid var(--border);border-radius:6px;padding:8px 12px;font-size:13px;box-sizing:border-box;">
            ${iconOpts}
          </select>
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:600;color:var(--ink3);margin-bottom:4px;">Cor de Fundo</label>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            ${colorBtns}
            <input type="hidden" name="color" value="#F4F4F6">
          </div>
        </div>
      </div>
      <div>
        <label style="display:block;font-size:12px;font-weight:600;color:var(--ink3);margin-bottom:4px;">Cor da Barra de Progresso</label>
        <select name="prog_color" style="width:100%;border:1px solid var(--border);border-radius:6px;padding:8px 12px;font-size:13px;box-sizing:border-box;">
          <option value="pb-blue">Azul</option>
          <option value="pb-green">Verde</option>
          <option value="pb-violet">Violeta</option>
          <option value="pb-amber">Âmbar</option>
          <option value="pb-red">Vermelho</option>
          <option value="pb-pink">Rosa</option>
          <option value="pb-indigo">Índigo</option>
          <option value="pb-teal">Teal</option>
        </select>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;">
        <button type="button" onclick="saveGoalForm();" style="flex:1;background:var(--blue);color:white;border:none;border-radius:6px;padding:10px;font-weight:600;cursor:pointer;">Salvar</button>
        <button type="button" onclick="closeGoalModal();" style="flex:1;background:var(--surface);color:var(--ink);border:1px solid var(--border);border-radius:6px;padding:10px;font-weight:600;cursor:pointer;">Cancelar</button>
      </div>
    </form>
  </div>`;
  modal.onclick=(e)=>{if(e.target===modal)closeGoalModal();};
  document.body.appendChild(modal);
  return modal;
}
function duplicateGoal(id){
  const g=monthGoals.find(x=>x.id===id);
  if(!g)return;
  monthGoals.push({...g,id:Date.now(),name:g.name+' (cópia)'});
  save('monthGoals',monthGoals);renderMonthGoals();
}
function deleteGoal(id){
  if(!confirm('Remover este objetivo?'))return;
  monthGoals=monthGoals.filter(g=>g.id!==id);
  save('monthGoals',monthGoals);renderMonthGoals();
}
function addMonthGoal(){
  openGoalModal();
}
function renderMonthGoals(){
  const grid=document.getElementById('month-goals'); if(!grid) return;
  grid.innerHTML='';
  monthGoals.forEach((g)=>{
    const el=document.createElement('div'); el.className='mg-card';
    el.innerHTML=`<div class="mg-head"><div class="mg-icon-w" style="background:${g.color};">${g.icon}</div><div style="text-align:right;"><div style="display:flex;align-items:center;gap:6px;justify-content:flex-end;"><input type="number" value="${g.pct}" min="0" max="100" style="width:52px;background:var(--surface);border:1px solid var(--border2);border-radius:5px;padding:3px 6px;font-size:13px;font-weight:800;color:var(--ink);text-align:center;outline:none;" onchange="monthGoals.find(x=>x.id===${g.id}).pct=Math.max(0,Math.min(100,parseInt(this.value)||0));save('monthGoals',monthGoals);renderMonthGoals();"><span style="font-size:11px;color:var(--ink4);">%</span></div><span style="font-size:9px;color:var(--ink4);">progresso</span></div></div><div class="mg-name">${g.name}</div><div class="mg-cat" style="margin-bottom:8px;">${g.cat}</div><div class="pb-wrap"><div class="pb ${g.prog_color}" style="width:${g.pct}%"></div></div><div class="pb-lbl">${g.pct}% concluído</div><div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">
      <button class="btn btn-ghost btn-sm" onclick="openGoalModal(${g.id});" style="flex:1;background:var(--blue-lt);color:var(--blue);border:1px solid var(--blue-md);border-radius:4px;padding:6px;font-size:11px;font-weight:600;cursor:pointer;">✎ Editar</button>
      <button class="btn btn-ghost btn-sm" onclick="duplicateGoal(${g.id});" style="flex:1;background:var(--surface);color:var(--ink);border:1px solid var(--border);border-radius:4px;padding:6px;font-size:11px;font-weight:600;cursor:pointer;">⎘ Duplicar</button>
      <button class="btn btn-ghost btn-sm" onclick="deleteGoal(${g.id});" style="flex:1;background:#FFE4E4;color:var(--red);border:1px solid #FFB5B5;border-radius:4px;padding:6px;font-size:11px;font-weight:600;cursor:pointer;">✕ Remover</button>
    </div>`;
    grid.appendChild(el);
  });
}

// ── TIMER ──
let timerSecs=25*60, timerTotal=25*60, timerRunning=false, timerInt=null, sessions=[], totalMin=0;
function setTimer(m,btn){ clearInterval(timerInt); timerRunning=false; timerSecs=m*60; timerTotal=m*60; document.querySelectorAll('.timer-pre').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); updTimer(); document.getElementById('t-lbl-timer').textContent='Pronto'; }
function timerStart(){ if(timerRunning) return; timerRunning=true; timerInt=setInterval(()=>{ timerSecs--; updTimer(); if(timerSecs<=0){ clearInterval(timerInt); timerRunning=false; finishSession(); } },1000); document.getElementById('t-lbl-timer').textContent='Focando...'; }
function timerPause(){ clearInterval(timerInt); timerRunning=false; document.getElementById('t-lbl-timer').textContent='Pausado'; }
function timerReset(){ clearInterval(timerInt); timerRunning=false; timerSecs=timerTotal; updTimer(); document.getElementById('t-lbl-timer').textContent='Pronto'; }
function updTimer(){ const m=Math.floor(timerSecs/60),s=timerSecs%60; document.getElementById('t-disp').textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0'); document.getElementById('t-prog').style.width=(100-timerSecs/timerTotal*100)+'%'; }
function playAlarmSound(){
  try{
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    [523.25,659.25,783.99,1046.50,783.99,1046.50].forEach((freq,i)=>{
      const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);
      o.type='sine';o.frequency.value=freq;
      g.gain.setValueAtTime(0,ctx.currentTime+i*.2);
      g.gain.linearRampToValueAtTime(.3,ctx.currentTime+i*.2+.05);
      g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+i*.2+.35);
      o.start(ctx.currentTime+i*.2);o.stop(ctx.currentTime+i*.2+.4);
    });
    setTimeout(()=>{
      const c2=new(window.AudioContext||window.webkitAudioContext)();
      [1046.50,1318.51,1567.98,2093.00].forEach((freq,i)=>{
        const o=c2.createOscillator(),g=c2.createGain();o.connect(g);g.connect(c2.destination);
        o.type='triangle';o.frequency.value=freq;
        g.gain.setValueAtTime(0,c2.currentTime+i*.25);
        g.gain.linearRampToValueAtTime(.25,c2.currentTime+i*.25+.05);
        g.gain.exponentialRampToValueAtTime(.001,c2.currentTime+i*.25+.5);
        o.start(c2.currentTime+i*.25);o.stop(c2.currentTime+i*.25+.55);
      });
    },1400);
  }catch(e){}
}
function finishSession(){ playAlarmSound(); const mins=Math.round(timerTotal/60); sessions.push(mins); totalMin+=mins; save('timerSessions_'+new Date().toISOString().slice(0,10),(sessions||[]).slice()); const sl=document.getElementById('sessions-list'); if(sl){ const el=document.createElement('div'); el.style.cssText='background:var(--blue-lt);border:1px solid var(--blue-md);border-radius:6px;padding:4px 9px;font-size:11px;font-weight:700;color:var(--blue);'; el.textContent='✓ '+mins+'min'; sl.appendChild(el); } const tf=document.getElementById('total-min'); if(tf) tf.textContent=totalMin+' min'; timerSecs=timerTotal; updTimer(); document.getElementById('t-lbl-timer').textContent='Sessão concluída! 🎉'; }

// ── UPDATE STATS ──
function updateStats(){
  renderWater();
  renderTasks();
  renderHabits();
}

// ── QUOTES ──
const QUOTES=[
  {t:'Disciplina é a ponte entre metas e realizações.',a:'Jim Rohn'},
  {t:'O sucesso é a soma de pequenos esforços repetidos dia após dia.',a:'Robert Collier'},
  {t:'Faça o que você tem que fazer até poder fazer o que quer fazer.',a:'Oprah Winfrey'},
  {t:'Você não precisa ser ótimo para começar, mas precisa começar para ser ótimo.',a:'Zig Ziglar'},
  {t:'Grandes realizações são possíveis quando você sabe a diferença entre movimento e ação.',a:'Tony Robbins'},
  {t:'A produtividade nunca é um acidente. É sempre o resultado de um compromisso com a excelência.',a:'Paul J. Meyer'},
  {t:'Cuide do seu corpo. É o único lugar que você tem para morar.',a:'Jim Rohn'},
];
const qi=new Date().getDay()%QUOTES.length;
['q-text','q2-text'].forEach(id=>{ const el=document.getElementById(id); if(el) el.textContent='"'+QUOTES[qi].t+'"'; });
['q-auth','q2-auth'].forEach(id=>{ const el=document.getElementById(id); if(el) el.textContent='— '+QUOTES[qi].a; });

// ── INBOX ──
let inbox=load('inbox',[]);
function saveInbox(){ save('inbox',inbox); }
function addInbox(){
  const inp=document.getElementById('inbox-inp'); const v=inp.value.trim(); if(!v) return;
  inbox.unshift({id:Date.now(),text:v,ts:Date.now()});
  inp.value=''; saveInbox(); renderInbox();
}
function inboxToTask(id){
  const item=inbox.find(x=>x.id===id); if(!item) return;
  // Move to day tasks for today
  const dayIdx=(()=>{const d=new Date().getDay();const m={0:5,1:0,2:1,3:2,4:3,5:4,6:5};return m[d]??0;})();
  const dayNames=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
  dayTasks.push({id:Date.now(),title:item.text,desc:'',day:dayNames[dayIdx],client:'',priority:'normal',done:false,ts:Date.now()});
  inbox=inbox.filter(x=>x.id!==id);
  saveInbox(); saveDayTasks(); renderInbox(); renderDayTasks(); renderWeeklyReview();
}
function delInbox(id){ inbox=inbox.filter(x=>x.id!==id); saveInbox(); renderInbox(); }
function renderInbox(){
  const list=document.getElementById('inbox-list'); if(!list) return;
  const count=document.getElementById('inbox-count');
  if(count) count.textContent=inbox.length;
  list.innerHTML='';
  if(!inbox.length){ list.innerHTML='<div style="text-align:center;padding:10px;color:var(--ink4);font-size:11px;">Inbox vazio — boa! 🎯</div>'; return; }
  inbox.forEach(item=>{
    const el=document.createElement('div');
    el.style.cssText='display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;border:1px solid var(--border);background:var(--white);margin-bottom:3px;';
    el.innerHTML=`<span style="flex:1;font-size:11px;color:var(--ink2);">${item.text}</span>
      <button onclick="inboxToTask(${item.id})" style="background:var(--blue-lt);border:1px solid var(--blue-md);color:var(--blue);border-radius:4px;padding:2px 6px;font-size:9px;font-weight:700;cursor:pointer;" title="Mover para tarefas do dia">→ Dia</button>
      <button onclick="delInbox(${item.id})" style="background:none;border:none;color:var(--ink4);cursor:pointer;font-size:10px;">✕</button>`;
    list.appendChild(el);
  });
}

// ── DAY TASKS (tarefas por dia da semana) ──
let dayTasks=load('dayTasks',[]);
let dtDay='Seg';
let dtPrio='normal';
const DT_PRIO_COLORS={normal:'var(--ink3)',important:'var(--amber)',urgent:'var(--red)'};
const DT_PRIO_BG={normal:'var(--surface)',important:'var(--amber-lt)',urgent:'var(--red-lt)'};

function saveDayTasks(){ save('dayTasks',dayTasks); }

function openDayTaskModal(){
  const dayIdx=(()=>{const d=new Date().getDay();const m={0:5,1:0,2:1,3:2,4:3,5:4,6:5};return m[d]??0;})();
  const dayNames=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
  dtDay=dayNames[dayIdx];
  dtPrio='normal';
  document.getElementById('dt-title').value='';
  document.getElementById('dt-desc').value='';
  document.getElementById('dt-client').value='';
  // Build day select
  const sel=document.getElementById('dt-day-select');
  sel.innerHTML=dayNames.map(d=>`<div onclick="dtDay='${d}';document.querySelectorAll('#dt-day-select>div').forEach(x=>{x.style.borderColor='';x.style.background='';x.style.color='';});this.style.borderColor='var(--blue)';this.style.background='var(--blue-lt)';this.style.color='var(--blue)';" style="flex:1;padding:6px 4px;border-radius:6px;border:1.5px solid ${d===dtDay?'var(--blue)':'var(--border2)'};background:${d===dtDay?'var(--blue-lt)':'var(--white)'};color:${d===dtDay?'var(--blue)':'var(--ink3)'};text-align:center;cursor:pointer;font-size:10px;font-weight:700;">${d}</div>`).join('');
  // Reset prio
  document.querySelectorAll('.dt-prio').forEach(el=>{
    el.style.borderColor=''; el.style.background=''; el.style.color='';
    if(el.dataset.p==='normal'){ el.style.borderColor='var(--blue)'; el.style.background='var(--blue-lt)'; el.style.color='var(--blue)'; }
  });
  document.getElementById('daytask-modal').classList.add('open');
  setTimeout(()=>document.getElementById('dt-title').focus(),200);
}

function setDTPrio(p,el){
  dtPrio=p;
  document.querySelectorAll('.dt-prio').forEach(b=>{
    b.style.borderColor=''; b.style.background=''; b.style.color='';
    if(b.dataset.p===p){ b.style.borderColor='var(--blue)'; b.style.background='var(--blue-lt)'; b.style.color='var(--blue)'; }
  });
}

function saveDayTask(){
  const title=document.getElementById('dt-title').value.trim();
  if(!title){ document.getElementById('dt-title').style.borderColor='var(--red)'; setTimeout(()=>document.getElementById('dt-title').style.borderColor='',1500); return; }
  dayTasks.push({
    id:Date.now(),
    title,
    desc:document.getElementById('dt-desc').value,
    day:dtDay,
    client:document.getElementById('dt-client').value.trim(),
    priority:dtPrio,
    done:false,
    ts:Date.now()
  });
  saveDayTasks();
  closeModal('daytask-modal');
  renderDayTasks();
  renderWeeklyReview();
}

function toggleDayTask(id){
  dayTasks.forEach(t=>{if(t.id===id)t.done=!t.done;});
  saveDayTasks(); renderDayTasks(); renderWeeklyReview();
}

function delDayTask(id){
  dayTasks=dayTasks.filter(t=>t.id!==id);
  saveDayTasks(); renderDayTasks(); renderWeeklyReview();
}

function renderDayTasks(){
  // Today's day tasks
  const dayIdx=(()=>{const d=new Date().getDay();const m={0:5,1:0,2:1,3:2,4:3,5:4,6:5};return m[d]??0;})();
  const dayNames=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
  const today=dayNames[dayIdx];
  const dl=document.getElementById('dt-day-label'); if(dl) dl.textContent=today;

  const list=document.getElementById('day-tasks-list'); if(!list) return;
  list.innerHTML='';
  const todayTasks=dayTasks.filter(t=>t.day===today).sort((a,b)=>{
    const po={urgent:0,important:1,normal:2};
    if(a.done!==b.done) return a.done?1:-1;
    return (po[a.priority]||2)-(po[b.priority]||2);
  });

  if(!todayTasks.length){
    list.innerHTML='<div style="text-align:center;padding:12px;color:var(--ink4);font-size:11px;">Nenhuma tarefa para '+today+' — <a href="#" onclick="event.preventDefault();openDayTaskModal()" style="color:var(--blue);font-weight:600;">adicionar</a></div>';
    return;
  }

  todayTasks.forEach(t=>{
    const el=document.createElement('div');
    el.className='ti'+(t.done?' done':'');
    el.style.cssText='border-left:3px solid '+DT_PRIO_COLORS[t.priority]+';';
    el.innerHTML=`<div class="tcb"></div>
      <div style="flex:1;">
        <div class="tt">${t.title}</div>
        ${t.client?`<span style="font-size:9px;color:var(--ink4);font-weight:600;">📎 ${t.client}</span>`:''}
        ${t.desc?`<div style="font-size:10px;color:var(--ink4);margin-top:1px;">${t.desc}</div>`:''}
      </div>
      <span class="pill" style="background:${DT_PRIO_BG[t.priority]};color:${DT_PRIO_COLORS[t.priority]};font-size:8px;">${t.priority==='urgent'?'🔴 URGENTE':t.priority==='important'?'🟡 IMPORTANTE':''}</span>
      <span class="tdel" onclick="event.stopPropagation();delDayTask(${t.id})">✕</span>`;
    el.onclick=()=>toggleDayTask(t.id);
    list.appendChild(el);
  });
}

// ── GOOGLE CALENDAR EMBED ──
function loadCalEmbed(){
  const calId=load('gcalId','');
  if(calId){
    document.getElementById('gcal-setup').style.display='none';
    document.getElementById('gcal-embed').style.display='block';
    const src='https://calendar.google.com/calendar/embed?src='+encodeURIComponent(calId)+'&ctz=America/Sao_Paulo&mode=WEEK&showTitle=0&showNav=1&showCalendars=0&showTz=0';
    document.getElementById('gcal-iframe').src=src;
  }
  const inp=document.getElementById('gcal-id');
  if(inp) inp.value=calId;
}
function saveCalId(){
  const v=document.getElementById('gcal-id').value.trim();
  if(!v) return;
  save('gcalId',v);
  loadCalEmbed();
}
function resetCalId(){
  save('gcalId','');
  document.getElementById('gcal-setup').style.display='block';
  document.getElementById('gcal-embed').style.display='none';
  document.getElementById('gcal-iframe').src='';
  document.getElementById('gcal-id').value='';
}
function toggleCalEmbed(){
  const el=document.getElementById('gcal-embed');
  const setup=document.getElementById('gcal-setup');
  if(el.style.display==='none'&&load('gcalId','')){ el.style.display='block'; setup.style.display='none'; }
  else{ el.style.display='none'; setup.style.display='block'; }
}

// ── PLAYLIST ──
let playlist=load('playlist',[]);
function savePlaylist(){ save('playlist',playlist); }

function extractYTId(url){
  let m=url.match(/[?&]v=([^&#]+)/); if(m) return {type:'video',id:m[1]};
  m=url.match(/youtu\.be\/([^?&#]+)/); if(m) return {type:'video',id:m[1]};
  m=url.match(/[?&]list=([^&#]+)/); if(m) return {type:'playlist',id:m[1]};
  return null;
}

function openPlaylistModal(){
  document.getElementById('pl-name').value='';
  document.getElementById('pl-url').value='';
  document.getElementById('playlist-modal').classList.add('open');
  setTimeout(()=>document.getElementById('pl-name').focus(),200);
}

function savePlaylistItem(){
  const name=document.getElementById('pl-name').value.trim();
  const url=document.getElementById('pl-url').value.trim();
  if(!name||!url) return;
  const yt=extractYTId(url);
  if(!yt){ alert('Link do YouTube inválido'); return; }
  playlist.push({id:Date.now(),name,url,ytType:yt.type,ytId:yt.id});
  savePlaylist();
  closeModal('playlist-modal');
  renderPlaylist();
}

function delPlaylistItem(id){
  playlist=playlist.filter(p=>p.id!==id);
  savePlaylist();
  renderPlaylist();
}

function playYT(item){
  const wrap=document.getElementById('yt-player-wrap');
  const iframe=document.getElementById('yt-player');
  wrap.style.display='block';
  if(item.ytType==='playlist'){
    iframe.src='https://www.youtube.com/embed/videoseries?list='+item.ytId+'&autoplay=1';
  }else{
    iframe.src='https://www.youtube.com/embed/'+item.ytId+'?autoplay=1';
  }
}

function stopYT(){
  document.getElementById('yt-player-wrap').style.display='none';
  document.getElementById('yt-player').src='';
}

function renderPlaylist(){
  const list=document.getElementById('playlist-items');
  const empty=document.getElementById('playlist-empty');
  if(!list) return;
  list.innerHTML='';
  if(!playlist.length){ if(empty) empty.style.display='block'; return; }
  if(empty) empty.style.display='none';
  playlist.forEach(p=>{
    const el=document.createElement('div');
    el.style.cssText='display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;border:1px solid var(--border);background:var(--white);transition:all 0.14s;';
    el.innerHTML=`
      <button onclick="playYT({ytType:'${p.ytType}',ytId:'${p.ytId}'})" style="background:var(--red);color:white;border:none;border-radius:5px;padding:4px 8px;font-size:10px;font-weight:700;cursor:pointer;">▶</button>
      <span style="flex:1;font-size:11px;font-weight:600;color:var(--ink2);">${p.name}</span>
      <span style="font-size:9px;color:var(--ink4);">${p.ytType==='playlist'?'📋 Playlist':'🎬 Vídeo'}</span>
      <button onclick="delPlaylistItem(${p.id})" style="background:none;border:none;color:var(--ink4);cursor:pointer;font-size:11px;">✕</button>`;
    list.appendChild(el);
  });
  // Add stop button if playing
  const stopBtn=document.createElement('div');
  stopBtn.style.cssText='margin-top:4px;';
  stopBtn.innerHTML='<button onclick="stopYT()" class="btn btn-ghost btn-sm" style="width:100%;">⏹ Parar música</button>';
  list.appendChild(stopBtn);
}

// ── BIG WINS ──
let bigWins=load('bigWins',[]);
let bwImpact='small';
const BW_CATS={negocio:{l:'Negócio',ico:'💼',bg:'var(--blue-lt)',border:'var(--blue-md)'},cliente:{l:'Cliente',ico:'🤝',bg:'var(--green-lt)',border:'#96F2D7'},financeiro:{l:'Financeiro',ico:'💰',bg:'var(--amber-lt)',border:'#FFE066'},pessoal:{l:'Pessoal',ico:'🌟',bg:'var(--violet-lt)',border:'#C4B5FD'},saude:{l:'Saúde',ico:'❤️',bg:'var(--rose-lt)',border:'#FBCFE8'},aprendizado:{l:'Aprendizado',ico:'📚',bg:'var(--blue-lt)',border:'var(--blue-md)'},criativo:{l:'Criativo',ico:'🎨',bg:'var(--amber-lt)',border:'#FFE066'}};
const BW_IMPACTS={small:{l:'Pequena',ico:'⭐',color:'var(--ink3)'},medium:{l:'Média',ico:'🌟',color:'var(--amber)'},big:{l:'Grande',ico:'🚀',color:'var(--blue)'},epic:{l:'Épica',ico:'👑',color:'var(--violet)'}};
const BW_STATUS={planning:{l:'Planejando',color:'var(--amber)',bg:'var(--amber-lt)'},doing:{l:'Em andamento',color:'var(--blue)',bg:'var(--blue-lt)'},done:{l:'Concluído',color:'var(--green)',bg:'var(--green-lt)'},paused:{l:'Pausado',color:'var(--ink3)',bg:'var(--surface)'}};

let bwExpanded={};

function openBigWinModal(){
  bwImpact='small';
  document.getElementById('bw-title').value='';
  document.getElementById('bw-desc').value='';
  document.getElementById('bw-cat').value='negocio';
  document.querySelectorAll('.bw-impact').forEach(el=>{
    el.style.borderColor=el.dataset.v==='small'?'var(--blue)':'';
    el.style.background=el.dataset.v==='small'?'var(--blue-lt)':'';
    el.style.color=el.dataset.v==='small'?'var(--blue)':'';
  });
  document.getElementById('bw-modal').classList.add('open');
  setTimeout(()=>document.getElementById('bw-title').focus(),200);
}

function setBWImpact(v,el){
  bwImpact=v;
  document.querySelectorAll('.bw-impact').forEach(b=>{
    b.style.borderColor=b.dataset.v===v?'var(--blue)':'';
    b.style.background=b.dataset.v===v?'var(--blue-lt)':'';
    b.style.color=b.dataset.v===v?'var(--blue)':'';
  });
}

function saveBigWin(){
  const title=document.getElementById('bw-title').value.trim();
  if(!title){ document.getElementById('bw-title').style.borderColor='var(--red)'; setTimeout(()=>document.getElementById('bw-title').style.borderColor='',1500); return; }
  bigWins.unshift({
    id:Date.now(), title, desc:document.getElementById('bw-desc').value,
    cat:document.getElementById('bw-cat').value, impact:bwImpact,
    status:'planning', steps:[], notes:'',
    date:new Date().toISOString().slice(0,10), ts:Date.now()
  });
  save('bigWins',bigWins);
  closeModal('bw-modal');
  renderBigWins();
}

function delBigWin(id){
  if(!confirm('Remover esta conquista?')) return;
  bigWins=bigWins.filter(w=>w.id!==id);
  save('bigWins',bigWins); renderBigWins();
}

function toggleBWExpand(id){ bwExpanded[id]=!bwExpanded[id]; renderBigWins(); }

function setBWStatus(id,status){
  const w=bigWins.find(x=>x.id===id); if(!w) return;
  w.status=status; save('bigWins',bigWins); renderBigWins();
}

function addBWStep(id){
  const w=bigWins.find(x=>x.id===id); if(!w) return;
  const inp=document.getElementById('bw-step-inp-'+id); if(!inp) return;
  const v=inp.value.trim(); if(!v) return;
  if(!w.steps) w.steps=[];
  w.steps.push({text:v,done:false});
  inp.value='';
  save('bigWins',bigWins); renderBigWins();
}

function toggleBWStep(wid,si){
  const w=bigWins.find(x=>x.id===wid); if(!w||!w.steps[si]) return;
  w.steps[si].done=!w.steps[si].done;
  save('bigWins',bigWins); renderBigWins();
}

function delBWStep(wid,si){
  const w=bigWins.find(x=>x.id===wid); if(!w) return;
  w.steps.splice(si,1);
  save('bigWins',bigWins); renderBigWins();
}

function saveBWNotes(id,val){
  const w=bigWins.find(x=>x.id===id); if(!w) return;
  w.notes=val; save('bigWins',bigWins);
}

function renderBigWins(){
  const list=document.getElementById('bw-list'); if(!list) return;
  list.innerHTML='';

  // Migrate old wins
  bigWins.forEach(w=>{ if(!w.steps) w.steps=[]; if(!w.status) w.status='planning'; if(!w.notes) w.notes=''; });

  // Stats
  const now=new Date(); const thisMonth=now.toISOString().slice(0,7);
  const weekDates=getWeekDates();
  const monthWins=bigWins.filter(w=>w.date&&w.date.startsWith(thisMonth)).length;
  const weekWins=bigWins.filter(w=>weekDates.includes(w.date)).length;
  const cats={}; bigWins.forEach(w=>{cats[w.cat]=(cats[w.cat]||0)+1;});
  const topCat=Object.entries(cats).sort((a,b)=>b[1]-a[1])[0];

  const st=document.getElementById('bw-total'); if(st) st.textContent=bigWins.length;
  const sm=document.getElementById('bw-month'); if(sm) sm.textContent=monthWins;
  const sw=document.getElementById('bw-week'); if(sw) sw.textContent=weekWins;
  const sc=document.getElementById('bw-best-cat'); if(sc) sc.textContent=topCat?BW_CATS[topCat[0]]?.ico+' '+topCat[1]:'—';

  if(!bigWins.length){
    list.innerHTML='<div class="card"><div class="empty"><div class="empty-ico">🚀</div><div class="empty-txt">Registre sua primeira conquista!<br>Ela vira um mini-projeto com checklist e anotações.</div></div></div>';
    return;
  }

  // Group: active first (planning, doing), then done, then paused
  const active=bigWins.filter(w=>w.status==='planning'||w.status==='doing');
  const done=bigWins.filter(w=>w.status==='done');
  const paused=bigWins.filter(w=>w.status==='paused');

  const renderGroup=(wins,label,labelColor)=>{
    if(!wins.length) return;
    const sec=document.createElement('div');
    sec.style.cssText='margin-bottom:20px;';
    sec.innerHTML=`<div style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:${labelColor};margin-bottom:10px;">${label} · ${wins.length}</div>`;

    wins.forEach(w=>{
      const cat=BW_CATS[w.cat]||BW_CATS.pessoal;
      const impact=BW_IMPACTS[w.impact]||BW_IMPACTS.small;
      const sts=BW_STATUS[w.status]||BW_STATUS.planning;
      const expanded=bwExpanded[w.id];
      const stepsDone=w.steps.filter(s=>s.done).length;
      const stepsTotal=w.steps.length;
      const stepsPct=stepsTotal?Math.round(stepsDone/stepsTotal*100):0;
      const borderColor={small:'var(--border2)',medium:'var(--amber)',big:'var(--blue)',epic:'var(--violet)'}[w.impact]||'var(--border2)';

      const card=document.createElement('div');
      card.className='card';
      card.style.cssText='margin-bottom:10px;border-left:3px solid '+borderColor+';cursor:pointer;transition:all 0.14s;';

      card.innerHTML=`
        <div onclick="toggleBWExpand(${w.id})" style="display:flex;align-items:flex-start;gap:12px;">
          <div style="width:36px;height:36px;border-radius:8px;background:${cat.bg};border:1px solid ${cat.border};display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">${cat.ico}</div>
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;flex-wrap:wrap;">
              <span style="font-size:13px;font-weight:700;color:var(--ink);">${w.title}</span>
              <span style="font-size:12px;">${impact.ico}</span>
              <span class="pill" style="background:${sts.bg};color:${sts.color};border:1px solid ${sts.color}22;">${sts.l}</span>
            </div>
            ${w.desc?`<div style="font-size:11px;color:var(--ink3);line-height:1.4;margin-bottom:4px;">${w.desc}</div>`:''}
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <span class="pill" style="background:${cat.bg};color:var(--ink3);border:1px solid ${cat.border};">${cat.l}</span>
              <span style="font-size:10px;color:var(--ink4);">${w.date?new Date(w.date+'T12:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}):''}</span>
              ${stepsTotal?`<span style="font-size:10px;color:var(--ink4);">✓ ${stepsDone}/${stepsTotal}</span>`:''}
            </div>
            ${stepsTotal?`<div class="pb-wrap" style="margin-top:4px;"><div class="pb ${stepsPct>=100?'pb-green':'pb-blue'}" style="width:${stepsPct}%"></div></div>`:''}
          </div>
          <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
            <span style="font-size:16px;color:var(--ink4);transition:transform 0.2s;transform:rotate(${expanded?'180':'0'}deg);">▾</span>
          </div>
        </div>

        ${expanded?`
        <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);" onclick="event.stopPropagation()">
          <!-- Status -->
          <div style="display:flex;gap:5px;margin-bottom:12px;">
            ${Object.entries(BW_STATUS).map(([k,v])=>`<button onclick="event.stopPropagation();setBWStatus(${w.id},'${k}')" class="btn btn-sm" style="background:${w.status===k?v.bg:'var(--white)'};color:${w.status===k?v.color:'var(--ink4)'};border:1px solid ${w.status===k?v.color+'44':'var(--border2)'};font-size:10px;">${v.l}</button>`).join('')}
          </div>

          <!-- Steps / Checklist -->
          <div style="margin-bottom:12px;">
            <div style="font-size:10px;font-weight:700;color:var(--ink4);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:6px;">Próximos passos</div>
            ${w.steps.map((s,si)=>`
              <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border);">
                <div onclick="event.stopPropagation();toggleBWStep(${w.id},${si})" style="width:15px;height:15px;border-radius:4px;border:1.5px solid ${s.done?'var(--green)':'var(--border2)'};background:${s.done?'var(--green)':'white'};cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:8px;color:white;font-weight:800;">${s.done?'✓':''}</div>
                <span style="flex:1;font-size:11px;color:${s.done?'var(--ink4)':'var(--ink2)'};${s.done?'text-decoration:line-through;':''}">${s.text}</span>
                <span onclick="event.stopPropagation();delBWStep(${w.id},${si})" style="font-size:10px;color:var(--ink4);cursor:pointer;opacity:0.5;">✕</span>
              </div>
            `).join('')}
            <div style="display:flex;gap:6px;margin-top:6px;">
              <input class="inp inp-sm" id="bw-step-inp-${w.id}" placeholder="Adicionar passo..." onkeydown="if(event.key==='Enter'){event.stopPropagation();addBWStep(${w.id});}" onclick="event.stopPropagation()">
              <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();addBWStep(${w.id})">+</button>
            </div>
          </div>

          <!-- Notes -->
          <div style="margin-bottom:10px;">
            <div style="font-size:10px;font-weight:700;color:var(--ink4);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;">Anotações</div>
            <textarea class="inp textarea" onclick="event.stopPropagation()" placeholder="Ideias, contexto, links, o que precisa saber..." style="min-height:60px;font-size:11px;" onblur="saveBWNotes(${w.id},this.value)">${w.notes||''}</textarea>
          </div>

          <!-- Actions -->
          <div style="display:flex;gap:6px;justify-content:flex-end;">
            <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();delBigWin(${w.id})" style="color:var(--red);">Remover</button>
          </div>
        </div>
        `:''}
      `;
      sec.appendChild(card);
    });
    list.appendChild(sec);
  };

  renderGroup(active,'🔥 Em andamento','var(--blue)');
  renderGroup(done,'✅ Concluídos','var(--green)');
  renderGroup(paused,'⏸ Pausados','var(--ink4)');
}

// ── CONQUISTAS ──
function renderConquistas(){
  const todayS=new Date().toISOString().slice(0,10);
  const dayIdx=(()=>{ const d=new Date().getDay(); const m={0:5,1:0,2:1,3:2,4:3,5:4,6:5}; return m[d]??0; })();

  // ── TODAY ──
  const dayData=ROUTINE_DAYS_DATA[dayIdx];
  const routineTotal=dayData?dayData.blocks.length:0;
  const routineDone=dayData?Object.keys(routineState).filter(k=>k.startsWith(dayIdx+'-')&&routineState[k]).length:0;
  const tasksDoneToday=tasks.filter(t=>t.done).length;
  const tasksPending=tasks.filter(t=>!t.done).length;
  const habitsTotal=habits.length;
  const habitsDoneToday=habits.filter(h=>habitState[h+'_'+todayS]).length;
  const waterDone=water;
  const todaySessions=load('timerSessions_'+todayS,[]);
  const timerMinToday=Array.isArray(todaySessions)?todaySessions.reduce((a,m)=>a+m,0):0;

  // Today score
  const todayMax=routineTotal+habitsTotal+8+5; // routine + habits + water + tasks baseline
  const todayDone=routineDone+habitsDoneToday+waterDone+tasksDoneToday;
  const todayPct=todayMax>0?Math.min(100,Math.round(todayDone/todayMax*100)):0;

  const ti=document.getElementById('cq-today-items');
  if(ti) ti.innerHTML=`
    <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:11px;"><span style="color:var(--ink3);">📋 Rotina</span><span style="font-weight:700;color:${routineDone===routineTotal&&routineTotal>0?'var(--green)':'var(--ink)'};">${routineDone}/${routineTotal}</span></div>
    <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:11px;"><span style="color:var(--ink3);">✅ Tarefas feitas</span><span style="font-weight:700;">${tasksDoneToday}</span></div>
    <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:11px;"><span style="color:var(--ink3);">🔥 Hábitos</span><span style="font-weight:700;color:${habitsDoneToday===habitsTotal&&habitsTotal>0?'var(--green)':'var(--ink)'};">${habitsDoneToday}/${habitsTotal}</span></div>
    <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:11px;"><span style="color:var(--ink3);">💧 Água</span><span style="font-weight:700;">${waterDone}/8</span></div>
    <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:11px;"><span style="color:var(--ink3);">⏱ Foco</span><span style="font-weight:700;">${timerMinToday} min</span></div>`;
  const tp=document.getElementById('cq-today-pct'); if(tp) tp.textContent=todayPct+'%';
  const tb=document.getElementById('cq-today-bar'); if(tb) tb.style.width=todayPct+'%';

  // ── WEEK ──
  const weekDates=getWeekDates();
  let weekRoutine=0,weekRoutineMax=0,weekTasks=0,weekHabits=0,weekHabitsMax=0,weekTimer=0;
  weekDates.forEach((date,i)=>{
    const dd=ROUTINE_DAYS_DATA[i];
    if(dd){ weekRoutineMax+=dd.blocks.length; weekRoutine+=Object.keys(routineState).filter(k=>k.startsWith(i+'-')&&routineState[k]).length; }
    weekTasks+=tasks.filter(t=>t.done).length>0?1:0; // approximate
    weekHabitsMax+=habitsTotal;
    weekHabits+=habits.filter(h=>habitState[h+'_'+date]).length;
    const ds=load('timerSessions_'+date,[]);
    if(Array.isArray(ds)) weekTimer+=ds.reduce((a,m)=>a+m,0);
  });
  const weekGoalsDone=weekGoals.filter(g=>g.done).length;
  const weekGoalsTotal=weekGoals.length;
  const weekPct=Math.round(((weekRoutineMax?weekRoutine/weekRoutineMax:0)*30+(weekHabitsMax?weekHabits/weekHabitsMax:0)*30+(weekGoalsTotal?weekGoalsDone/weekGoalsTotal:0)*40)/100*100);

  const wi=document.getElementById('cq-week-items');
  if(wi) wi.innerHTML=`
    <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:11px;"><span style="color:var(--ink3);">📋 Blocos rotina</span><span style="font-weight:700;">${weekRoutine}/${weekRoutineMax}</span></div>
    <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:11px;"><span style="color:var(--ink3);">🔥 Hábitos</span><span style="font-weight:700;">${weekHabits}/${weekHabitsMax}</span></div>
    <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:11px;"><span style="color:var(--ink3);">🎯 Metas semana</span><span style="font-weight:700;color:${weekGoalsDone===weekGoalsTotal&&weekGoalsTotal>0?'var(--green)':'var(--ink)'};">${weekGoalsDone}/${weekGoalsTotal}</span></div>
    <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:11px;"><span style="color:var(--ink3);">⏱ Foco total</span><span style="font-weight:700;">${weekTimer} min</span></div>`;
  const wp=document.getElementById('cq-week-pct'); if(wp) wp.textContent=weekPct+'%';
  const wb=document.getElementById('cq-week-bar'); if(wb) wb.style.width=weekPct+'%';

  // ── MONTH ──
  const monthGoalsDone=monthGoals.filter(g=>g.pct>=100).length;
  const monthGoalsTotal=monthGoals.length;
  const monthAvgPct=monthGoalsTotal?Math.round(monthGoals.reduce((a,g)=>a+g.pct,0)/monthGoalsTotal):0;

  const mi=document.getElementById('cq-month-items');
  if(mi) mi.innerHTML=`
    <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:11px;"><span style="color:var(--ink3);">🎯 Objetivos</span><span style="font-weight:700;">${monthGoalsDone}/${monthGoalsTotal} completos</span></div>
    <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:11px;"><span style="color:var(--ink3);">📊 Progresso médio</span><span style="font-weight:700;">${monthAvgPct}%</span></div>
    ${monthGoals.slice(0,3).map(g=>`<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:10px;"><span style="color:var(--ink4);">${g.icon} ${g.name.substring(0,22)}</span><span style="font-weight:700;color:${g.pct>=100?'var(--green)':'var(--ink4)'};">${g.pct}%</span></div>`).join('')}`;
  const mp=document.getElementById('cq-month-pct'); if(mp) mp.textContent=monthAvgPct+'%';
  const mb=document.getElementById('cq-month-bar'); if(mb) mb.style.width=monthAvgPct+'%';

  // ── XP SYSTEM ──
  let xp=routineDone*5+tasksDoneToday*10+habitsDoneToday*8+waterDone*2+Math.floor(timerMinToday/5)*3;
  // Add saved XP from previous days
  const savedXP=load('totalXP',0);
  const todayXP=xp;
  // Only save if today's XP is higher (avoid double counting)
  const savedTodayXP=load('todayXP_'+todayS,0);
  if(todayXP>savedTodayXP) save('todayXP_'+todayS,todayXP);
  const totalXP=savedXP+Math.max(0,todayXP-savedTodayXP);
  if(todayXP>savedTodayXP) save('totalXP',totalXP);

  const level=Math.floor(totalXP/100)+1;
  const xpInLevel=totalXP%100;
  const levelIcons=['⭐','🌟','💫','✨','🔥','💎','👑','🏆','🎖️','🚀'];

  const le=document.getElementById('cq-level'); if(le) le.textContent=level;
  const li=document.getElementById('cq-level-ico'); if(li) li.textContent=levelIcons[Math.min(level-1,levelIcons.length-1)];
  const xb=document.getElementById('cq-xp-bar'); if(xb) xb.style.width=xpInLevel+'%';
  const xt=document.getElementById('cq-xp-text'); if(xt) xt.textContent=xpInLevel+'/100 XP';
  const txp=document.getElementById('cq-total-xp'); if(txp) txp.textContent=totalXP;

  // ── BADGES ──
  const badges=[];
  if(routineDone===routineTotal&&routineTotal>0) badges.push({icon:'📋',name:'Rotina completa',color:'var(--green-lt)',border:'#96F2D7'});
  if(habitsDoneToday===habitsTotal&&habitsTotal>0) badges.push({icon:'🔥',name:'Todos hábitos',color:'var(--amber-lt)',border:'#FFE066'});
  if(waterDone>=8) badges.push({icon:'💧',name:'2L de água',color:'var(--blue-lt)',border:'var(--blue-md)'});
  if(timerMinToday>=60) badges.push({icon:'⏱',name:'1h+ foco',color:'var(--violet-lt)',border:'#C4B5FD'});
  if(timerMinToday>=120) badges.push({icon:'🧠',name:'2h+ foco',color:'var(--violet-lt)',border:'#C4B5FD'});
  if(tasksDoneToday>=5) badges.push({icon:'✅',name:'5+ tarefas',color:'var(--green-lt)',border:'#96F2D7'});
  if(weekGoalsDone===weekGoalsTotal&&weekGoalsTotal>0) badges.push({icon:'🎯',name:'Semana perfeita',color:'var(--amber-lt)',border:'#FFE066'});
  if(level>=5) badges.push({icon:'💎',name:'Nível 5+',color:'var(--blue-lt)',border:'var(--blue-md)'});
  if(level>=10) badges.push({icon:'👑',name:'Nível 10+',color:'var(--amber-lt)',border:'#FFE066'});

  const bg=document.getElementById('cq-badges');
  if(bg){
    if(!badges.length) bg.innerHTML='<div style="text-align:center;padding:16px;color:var(--ink4);font-size:11px;width:100%;">Complete atividades para desbloquear medalhas 🏅</div>';
    else bg.innerHTML=badges.map(b=>`<div style="display:flex;align-items:center;gap:7px;padding:8px 12px;background:${b.color};border:1px solid ${b.border};border-radius:8px;font-size:11px;font-weight:600;color:var(--ink2);"><span style="font-size:16px;">${b.icon}</span>${b.name}</div>`).join('');
  }
}

// ── COMMAND CENTER ──
function addInboxFromCC(){
  const inp=document.getElementById('cc-inbox-inp'); const v=inp.value.trim(); if(!v) return;
  inbox.unshift({id:Date.now(),text:v,ts:Date.now()});
  inp.value=''; saveInbox(); renderCommandCenter(); renderInbox();
}

function renderCommandCenter(){
  const todayS=new Date().toISOString().slice(0,10);
  const dayIdx=(()=>{const d=new Date().getDay();const m={0:5,1:0,2:1,3:2,4:3,5:4,6:5};return m[d]??0;})();
  const dayNames=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
  const todayName=dayNames[dayIdx];

  // Countdown to Europe
  const euroDate=new Date('2026-07-01');
  const daysToEuro=Math.max(0,Math.ceil((euroDate-new Date())/(1000*60*60*24)));
  const ccCount=document.getElementById('cc-countdown');
  if(ccCount) ccCount.textContent='✈️ '+daysToEuro+' dias pra Europa';
  const ccSub=document.getElementById('cc-sub');
  if(ccSub) ccSub.textContent=todayName+' · '+new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long'})+' · '+daysToEuro+' dias pra Europa';

  // Stats
  const dayData=ROUTINE_DAYS_DATA[dayIdx];
  const rTotal=dayData?dayData.blocks.length:0;
  const rDone=dayData?Object.keys(routineState).filter(k=>k.startsWith(dayIdx+'-')&&routineState[k]).length:0;
  const rPct=rTotal?Math.round(rDone/rTotal*100):0;
  const todayDT=dayTasks.filter(t=>t.day===todayName);
  const dtDone=todayDT.filter(t=>t.done).length;
  const hTotal=habits.length;
  const hDone=habits.filter(h=>habitState[h+'_'+todayS]).length;
  const todaySess=load('timerSessions_'+todayS,[]);
  const focusMin=Array.isArray(todaySess)?todaySess.reduce((a,m)=>a+m,0):0;

  const e1=document.getElementById('cc-routine-pct'); if(e1) e1.textContent=rPct+'%';
  const e2=document.getElementById('cc-daytasks'); if(e2) e2.textContent=dtDone+'/'+todayDT.length;
  const e3=document.getElementById('cc-habits'); if(e3) e3.textContent=hDone+'/'+hTotal;
  const e4=document.getElementById('cc-focus'); if(e4) e4.textContent=focusMin+'m';

  // Routine list
  const rl=document.getElementById('cc-routine-list'); if(rl){
    rl.innerHTML='';
    if(dayData) dayData.blocks.forEach((b,bi)=>{
      const done=routineState[dayIdx+'-'+bi];
      const el=document.createElement('div');
      el.style.cssText='display:flex;align-items:center;gap:8px;padding:5px 6px;border-radius:5px;cursor:pointer;transition:background 0.1s;'+(done?'opacity:0.4;':'');
      el.onmouseenter=()=>el.style.background='var(--surface)';
      el.onmouseleave=()=>el.style.background='';
      el.onclick=()=>{toggleRoutineBlock(dayIdx,bi);renderCommandCenter();};
      el.innerHTML=`<div style="width:14px;height:14px;border-radius:3px;border:1.5px solid ${done?'var(--green)':'var(--border2)'};background:${done?'var(--green)':'white'};display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:7px;color:white;font-weight:800;">${done?'✓':''}</div>
        <span style="font-size:10px;color:var(--ink4);font-weight:600;width:36px;flex-shrink:0;">${b.time}</span>
        <span style="font-size:11px;${done?'text-decoration:line-through;color:var(--ink4);':'color:var(--ink2);font-weight:500;'}">${b.title.replace(/<[^>]*>/g,'').substring(0,45)}</span>`;
      rl.appendChild(el);
    });
  }

  // Day tasks
  const dtl=document.getElementById('cc-daytask-list'); if(dtl){
    dtl.innerHTML='';
    const sorted=todayDT.sort((a,b)=>{
      const po={urgent:0,important:1,normal:2};
      if(a.done!==b.done) return a.done?1:-1;
      return (po[a.priority]||2)-(po[b.priority]||2);
    });
    if(!sorted.length) dtl.innerHTML='<div style="text-align:center;padding:10px;color:var(--ink4);font-size:11px;">Nenhuma tarefa pra '+todayName+' — <a href="#" onclick="event.preventDefault();openDayTaskModal()" style="color:var(--blue);">adicionar</a></div>';
    sorted.forEach(t=>{
      const el=document.createElement('div');
      el.style.cssText='display:flex;align-items:center;gap:8px;padding:5px 6px;border-radius:5px;cursor:pointer;border-left:2px solid '+(DT_PRIO_COLORS[t.priority]||'var(--ink3)')+';'+(t.done?'opacity:0.4;':'');
      el.onclick=()=>{toggleDayTask(t.id);renderCommandCenter();};
      el.innerHTML=`<div style="width:14px;height:14px;border-radius:3px;border:1.5px solid ${t.done?'var(--green)':'var(--border2)'};background:${t.done?'var(--green)':'white'};display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:7px;color:white;font-weight:800;">${t.done?'✓':''}</div>
        <span style="flex:1;font-size:11px;${t.done?'text-decoration:line-through;color:var(--ink4);':'color:var(--ink2);font-weight:500;'}">${t.title}</span>
        ${t.client?`<span style="font-size:9px;color:var(--ink4);">📎${t.client}</span>`:''}`;
      dtl.appendChild(el);
    });
  }

  // Inbox
  const il=document.getElementById('cc-inbox-list'); if(il){
    il.innerHTML='';
    const ict=document.getElementById('cc-inbox-ct'); if(ict) ict.textContent=inbox.length;
    if(!inbox.length) il.innerHTML='<div style="text-align:center;padding:8px;color:var(--ink4);font-size:10px;">Inbox vazio 🎯</div>';
    inbox.slice(0,8).forEach(item=>{
      const el=document.createElement('div');
      el.style.cssText='display:flex;align-items:center;gap:6px;padding:4px 6px;font-size:10px;border-bottom:1px solid var(--border);';
      el.innerHTML=`<span style="flex:1;color:var(--ink2);">${item.text}</span>
        <button onclick="event.stopPropagation();inboxToTask(${item.id});renderCommandCenter();" style="background:var(--blue-lt);border:1px solid var(--blue-md);color:var(--blue);border-radius:3px;padding:1px 5px;font-size:8px;font-weight:700;cursor:pointer;">→</button>
        <button onclick="event.stopPropagation();delInbox(${item.id});renderCommandCenter();" style="background:none;border:none;color:var(--ink4);cursor:pointer;font-size:9px;">✕</button>`;
      il.appendChild(el);
    });
  }

  // Week board mini
  const wb=document.getElementById('cc-week-board'); if(wb){
    wb.innerHTML='';
    dayNames.forEach((day,i)=>{
      const dTasks=dayTasks.filter(t=>t.day===day);
      const done=dTasks.filter(t=>t.done).length;
      const isToday=i===dayIdx;
      const col=document.createElement('div');
      col.innerHTML=`
        <div style="font-size:9px;font-weight:700;color:${isToday?'var(--blue)':'var(--ink4)'};text-align:center;margin-bottom:3px;">${day}</div>
        <div style="border-radius:6px;padding:4px;background:${isToday?'var(--blue-lt)':'var(--surface)'};border:${isToday?'1.5px solid var(--blue)':'1px solid var(--border)'};min-height:50px;">
          <div style="font-size:8px;color:var(--ink4);text-align:center;margin-bottom:2px;">${done}/${dTasks.length}</div>
          ${dTasks.slice(0,4).map(t=>`<div style="font-size:8px;padding:2px 3px;border-radius:3px;margin-bottom:1px;background:${t.done?'var(--green-lt)':'var(--white)'};color:${t.done?'var(--ink4)':'var(--ink2)'};border-left:2px solid ${DT_PRIO_COLORS[t.priority]||'var(--ink3)'};${t.done?'text-decoration:line-through;':''}overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${t.title.substring(0,12)}</div>`).join('')}
          ${dTasks.length>4?`<div style="font-size:7px;color:var(--ink4);text-align:center;">+${dTasks.length-4}</div>`:''}
        </div>`;
      wb.appendChild(col);
    });
  }

  // Habits today
  const hl=document.getElementById('cc-habits-list'); if(hl){
    hl.innerHTML='';
    habits.forEach(h=>{
      const key=h+'_'+todayS;
      const done=habitState[key];
      const el=document.createElement('div');
      el.style.cssText='display:flex;align-items:center;gap:8px;padding:4px 0;cursor:pointer;border-bottom:1px solid var(--border);';
      el.onclick=()=>{habitState[key]=!habitState[key];saveHabits();renderCommandCenter();renderHabits();updateStats();};
      el.innerHTML=`<div style="width:14px;height:14px;border-radius:3px;border:1.5px solid ${done?'var(--green)':'var(--border2)'};background:${done?'var(--green)':'white'};display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:7px;color:white;font-weight:800;">${done?'✓':''}</div>
        <span style="font-size:11px;${done?'text-decoration:line-through;color:var(--ink4);':'color:var(--ink2);'}">${h}</span>`;
      hl.appendChild(el);
    });
  }

  // Month goals (top 5 by lowest progress)
  const mg=document.getElementById('cc-month-goals'); if(mg){
    mg.innerHTML='';
    const sorted=[...monthGoals].sort((a,b)=>a.pct-b.pct).slice(0,5);
    sorted.forEach(g=>{
      const el=document.createElement('div');
      el.style.cssText='margin-bottom:8px;';
      el.innerHTML=`<div style="display:flex;justify-content:space-between;margin-bottom:2px;"><span style="font-size:11px;font-weight:600;color:var(--ink2);">${g.icon} ${g.name.substring(0,30)}</span><span style="font-size:10px;font-weight:800;color:${g.pct>=80?'var(--green)':g.pct>=50?'var(--amber)':'var(--red)'};">${g.pct}%</span></div>
        <div class="pb-wrap"><div class="pb ${g.pct>=80?'pb-green':g.pct>=50?'pb-amber':'pb-violet'}" style="width:${g.pct}%"></div></div>`;
      mg.appendChild(el);
    });
  }

  // Active Big Wins
  const bwl=document.getElementById('cc-bigwins'); if(bwl){
    bwl.innerHTML='';
    const active=bigWins.filter(w=>w.status==='planning'||w.status==='doing').slice(0,4);
    if(!active.length) bwl.innerHTML='<div style="text-align:center;padding:8px;color:var(--ink4);font-size:10px;">Nenhum win ativo</div>';
    active.forEach(w=>{
      const cat=BW_CATS[w.cat]||BW_CATS.pessoal;
      const sts=BW_STATUS[w.status]||BW_STATUS.planning;
      const stepsDone=w.steps?w.steps.filter(s=>s.done).length:0;
      const stepsTotal=w.steps?w.steps.length:0;
      const el=document.createElement('div');
      el.style.cssText='display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);cursor:pointer;';
      el.onclick=()=>goPage('bigwins',null);
      el.innerHTML=`<div style="width:24px;height:24px;border-radius:6px;background:${cat.bg};display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;">${cat.ico}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:11px;font-weight:600;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${w.title}</div>
          <div style="display:flex;gap:4px;align-items:center;"><span class="pill" style="background:${sts.bg};color:${sts.color};font-size:8px;padding:1px 5px;">${sts.l}</span>${stepsTotal?`<span style="font-size:9px;color:var(--ink4);">${stepsDone}/${stepsTotal}</span>`:''}</div>
        </div>`;
      bwl.appendChild(el);
    });
  }

  // CC Notes
  const ccn=document.getElementById('cc-notes');
  if(ccn&&!ccn._loaded){ ccn.value=load('cc_notes',''); ccn.onblur=function(){save('cc_notes',this.value);}; ccn._loaded=true; }
}

// ── RENDER ALL ──
function renderAll(){
  renderTasks();
  renderNotes();
  renderHabits();
  renderMeetings();
  renderDocs();
  renderWeekGoals();
  renderMonthGoals();
  renderDiet();
  renderWorkout();
  renderWater();
  buildRoutine();
  renderWeeklyReview();
  renderConquistas();
  renderBigWins();
  renderPlaylist();
  renderInbox();
  renderDayTasks();
  renderCommandCenter();
  loadCalEmbed();
  updateEngCountdown();
  updateStreak();
  // Restore nota do dia
  const nd=document.getElementById('nota-dia');
  if(nd){ nd.value=load('nota_dia',''); nd.onblur=function(){ save('nota_dia',this.value); }; }
  // Restore semana focus & review
  const sf=document.getElementById('semana-foco');
  if(sf){ sf.value=load('semana_foco',''); sf.onblur=function(){ save('semana_foco',this.value); }; }
  const sr=document.getElementById('semana-rev');
  if(sr){ sr.value=load('semana_rev',''); sr.onblur=function(){ save('semana_rev',this.value); }; }
}

// ── STREAK ──
function updateStreak(){
  let streak=0;
  const d=new Date();
  for(let i=0;i<365;i++){
    const ds=d.toISOString().slice(0,10);
    const dayDone=habits.some(h=>habitState[h+'_'+ds]);
    if(dayDone) streak++;
    else if(i>0) break;
    d.setDate(d.getDate()-1);
  }
  const el=document.getElementById('streak-n'); if(el) el.textContent=streak;
  const pill=document.getElementById('hab-streak-pill'); if(pill) pill.textContent='🔥 '+streak+' dias';
}

// ── WEEKLY REVIEW ──
function getWeekDates(){
  const now=new Date(); const di=now.getDay()===0?6:now.getDay()-1;
  const mon=new Date(now); mon.setDate(now.getDate()-di);
  const dates=[];
  for(let i=0;i<7;i++){ const d=new Date(mon); d.setDate(mon.getDate()+i); dates.push(d.toISOString().slice(0,10)); }
  return dates;
}

function renderWeeklyReview(){
  const weekDates=getWeekDates();
  const todayS=new Date().toISOString().slice(0,10);
  const dayNames=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];

  let totalBlocks=0, totalDayTasks=0, totalTimer=0, totalHabits=0;

  weekDates.forEach((date,i)=>{
    const dayData=ROUTINE_DAYS_DATA[i];
    if(dayData) totalBlocks+=Object.keys(routineState).filter(k=>k.startsWith(i+'-')&&routineState[k]).length;
    const ds=load('timerSessions_'+date,[]);
    if(Array.isArray(ds)) totalTimer+=ds.reduce((a,m)=>a+m,0);
    totalHabits+=habits.filter(h=>habitState[h+'_'+date]).length;
  });
  totalDayTasks=dayTasks.filter(t=>t.done).length;

  const eb=document.getElementById('ws-blocks'); if(eb) eb.textContent=totalBlocks;
  const et=document.getElementById('ws-tasks'); if(et) et.textContent=totalDayTasks;
  const eti=document.getElementById('ws-timer'); if(eti) eti.textContent=totalTimer+'m';
  const eh=document.getElementById('ws-habits'); if(eh) eh.textContent=totalHabits;

  // ── TASK BOARD PER DAY ──
  const board=document.getElementById('week-task-board'); if(board){
    board.innerHTML='';
    dayNames.forEach((day,i)=>{
      const dayIdx=i;
      const isToday=dayIdx===(()=>{const d=new Date().getDay();const m={0:5,1:0,2:1,3:2,4:3,5:4,6:5};return m[d]??0;})();
      const dTasks=dayTasks.filter(t=>t.day===day);
      const done=dTasks.filter(t=>t.done).length;
      const total=dTasks.length;
      const col=document.createElement('div');
      col.style.cssText='min-width:0;';
      col.innerHTML=`
        <div style="font-size:10px;font-weight:700;color:${isToday?'var(--blue)':'var(--ink4)'};margin-bottom:4px;text-align:center;">${day}</div>
        <div style="font-size:9px;color:var(--ink4);text-align:center;margin-bottom:6px;">${done}/${total}</div>
        <div style="display:flex;flex-direction:column;gap:3px;">
          ${dTasks.map(t=>`<div onclick="toggleDayTask(${t.id})" style="padding:5px 6px;border-radius:5px;font-size:9px;font-weight:600;cursor:pointer;border-left:2px solid ${DT_PRIO_COLORS[t.priority]};background:${t.done?'var(--green-lt)':'var(--surface)'};color:${t.done?'var(--ink4)':'var(--ink2)'};${t.done?'text-decoration:line-through;':''}line-height:1.3;">${t.title.substring(0,30)}${t.client?' <span style="font-size:8px;color:var(--ink4);">·'+t.client+'</span>':''}</div>`).join('')}
          ${!dTasks.length?'<div style="font-size:9px;color:var(--ink4);text-align:center;padding:8px 0;">—</div>':''}
        </div>
        <button onclick="dtDay='${day}';openDayTaskModal()" style="width:100%;margin-top:4px;padding:3px;border-radius:4px;border:1px dashed var(--border2);background:none;color:var(--ink4);font-size:9px;cursor:pointer;">+</button>`;
      board.appendChild(col);
    });
  }

  // ── PERFORMANCE GRID ──
  const grid=document.getElementById('week-grid'); if(grid){
    grid.innerHTML='';
    weekDates.forEach((date,i)=>{
      const isToday=date===todayS;
      const dayData=ROUTINE_DAYS_DATA[i];
      const routineDone=dayData?Object.keys(routineState).filter(k=>k.startsWith(i+'-')&&routineState[k]).length:0;
      const routineTotal=dayData?dayData.blocks.length:0;
      const dayTimer=load('timerSessions_'+date,[]);
      const timerMin=Array.isArray(dayTimer)?dayTimer.reduce((a,m)=>a+m,0):0;
      const dayHabits=habits.filter(h=>habitState[h+'_'+date]).length;
      const col=document.createElement('div');
      col.style.cssText='text-align:center;';
      col.innerHTML=`
        <div style="font-size:10px;font-weight:700;color:var(--ink4);margin-bottom:6px;">${dayNames[i]}</div>
        <div style="border-radius:10px;padding:10px 4px;background:${isToday?'var(--blue-lt)':'var(--surface)'};border:${isToday?'2px solid var(--blue)':'1px solid var(--border)'};min-height:70px;">
          <div style="font-size:10px;color:var(--ink3);margin-bottom:3px;">📋 <b style="color:var(--ink);">${routineDone}</b>/${routineTotal}</div>
          <div style="font-size:10px;color:var(--ink3);margin-bottom:3px;">⏱ <b style="color:var(--ink);">${timerMin}</b>m</div>
          <div style="font-size:10px;color:var(--ink3);">🔥 <b style="color:var(--ink);">${dayHabits}</b>/${habits.length}</div>
        </div>`;
      grid.appendChild(col);
    });
  }

  // ── HABIT FREQ ──
  const hfreq=document.getElementById('week-habit-freq'); if(hfreq){
    hfreq.innerHTML='';
    if(!habits.length){ hfreq.innerHTML='<div class="empty"><div class="empty-ico">🔥</div><div class="empty-txt">Nenhum hábito</div></div>'; return; }
    habits.forEach(h=>{
      const done=weekDates.filter(d=>habitState[h+'_'+d]).length;
      const pct=Math.round(done/7*100);
      const row=document.createElement('div');
      row.style.cssText='margin-bottom:8px;';
      row.innerHTML=`<div style="display:flex;justify-content:space-between;margin-bottom:2px;"><span style="font-size:11px;font-weight:600;color:var(--ink2);">${h}</span><span style="font-size:10px;font-weight:700;color:${done>=5?'var(--green)':'var(--ink4)'};">${done}/7</span></div><div class="pb-wrap"><div class="pb ${done>=5?'pb-green':'pb-blue'}" style="width:${pct}%"></div></div>`;
      hfreq.appendChild(row);
    });
  }
}

// ── INIT & EXPORTS ──

// Make functions available globally for inline onclick handlers
if (typeof window !== 'undefined') {
  (window as any).goPage = goPage;
  (window as any).addTask = addTask;
  (window as any).toggleTask = toggleTask;
  (window as any).delTask = delTask;
  (window as any).addHabit = addHabit;
  (window as any).setMood = setMood;
  (window as any).selDay = selDay;
  (window as any).toggleRoutineBlock = toggleRoutineBlock;
  (window as any).addRoutineBlock = addRoutineBlock;
  (window as any).delRoutineBlock = delRoutineBlock;
  (window as any).openMeetModal = openMeetModal;
  (window as any).saveMeeting = saveMeeting;
  (window as any).delMeeting = delMeeting;
  (window as any).openDocsModal = openDocsModal;
  (window as any).saveDoc = saveDoc;
  (window as any).delDoc = delDoc;
  (window as any).addNote = addNote;
  (window as any).editNoteModal = editNoteModal;
  (window as any).saveNoteFromModal = saveNoteFromModal;
  (window as any).delNote = delNote;
  (window as any).selectNoteTheme = selectNoteTheme;
  (window as any).setNotePriority = setNotePriority;
  (window as any).addInbox = addInbox;
  (window as any).inboxToTask = inboxToTask;
  (window as any).delInbox = delInbox;
  (window as any).openDayTaskModal = openDayTaskModal;
  (window as any).saveDayTask = saveDayTask;
  (window as any).toggleDayTask = toggleDayTask;
  (window as any).delDayTask = delDayTask;
  (window as any).addMeal = addMeal;
  (window as any).addMealItem = addMealItem;
  (window as any).delMealItem = delMealItem;
  (window as any).addWorkoutDay = addWorkoutDay;
  (window as any).addExercise = addExercise;
  (window as any).delExercise = delExercise;
  (window as any).toggleEx = toggleEx;
  (window as any).addWeekGoal = addWeekGoal;
  (window as any).addMonthGoal = addMonthGoal;
  (window as any).openGoalModal = openGoalModal;
  (window as any).closeGoalModal = closeGoalModal;
  (window as any).saveGoalForm = saveGoalForm;
  (window as any).duplicateGoal = duplicateGoal;
  (window as any).deleteGoal = deleteGoal;
  (window as any).setTimer = setTimer;
  (window as any).timerStart = timerStart;
  (window as any).timerPause = timerPause;
  (window as any).timerReset = timerReset;
  (window as any).openBigWinModal = openBigWinModal;
  (window as any).saveBigWin = saveBigWin;
  (window as any).delBigWin = delBigWin;
  (window as any).setBWStatus = setBWStatus;
  (window as any).toggleBWExpand = toggleBWExpand;
  (window as any).addBWStep = addBWStep;
  (window as any).delBWStep = delBWStep;
  (window as any).closeModal = closeModal;
  (window as any).updateClock = updateClock;
  (window as any).renderAll = renderAll;
  (window as any).setDTPrio = setDTPrio;
  (window as any).toggleBWStep = toggleBWStep;
  (window as any).toggleNotePin = toggleNotePin;
  (window as any).loadCalEmbed = loadCalEmbed;
  (window as any).saveCalId = saveCalId;
  (window as any).resetCalId = resetCalId;
  (window as any).toggleCalEmbed = toggleCalEmbed;
  (window as any).openPlaylistModal = openPlaylistModal;
  (window as any).savePlaylistItem = savePlaylistItem;
  (window as any).delPlaylistItem = delPlaylistItem;
  (window as any).playYT = playYT;
  (window as any).stopYT = stopYT;
  (window as any).setBWImpact = setBWImpact;
  (window as any).selectBlockBadge = selectBlockBadge;
  (window as any).saveBlockFromModal = saveBlockFromModal;
  (window as any).addRoutineBlockDay = addRoutineBlockDay;
}

// Main initialization function to be called from React
export function initializeRud() {
  if (typeof document !== 'undefined') {
    // Initialize clock update
    try {
      updateClock();
      setInterval(updateClock, 15000);
    } catch (error) {
      console.error('Error initializing clock:', error);
    }

    // Render all content
    try {
      renderAll();
    } catch (error) {
      console.error('Error rendering Rud:', error);
    }
  }
}
