(() => {
  'use strict';

  const STORAGE_KEY = 'project-orange-terminal-v3';
  const LEGACY_KEY = 'project-orange-terminal-v2';
  const TOTAL_TIME_MS = 30 * 60 * 1000;
  const WRONG_CODE_PENALTY_MS = 60 * 1000;
  const STAGES = Object.freeze({
    room1: { label: 'ROOM 01', title: 'THE COMMAND CENTER', description: 'Reconstruct the original command. Enter the recovered five-digit code.', code: '62841', next: 'room2' },
    room2: { label: 'ROOM 02', title: 'THE HIDDEN FOLDER', description: 'Verify the five evidence sets. Enter the recovered five-digit folder code.', code: '83046', next: 'room3a' },
    room3a: { label: 'ROOM 03 // STAGE 1', title: 'THE KNOWLEDGE ARCHIVE', description: 'Recover the eight AI terms from the crossword. The facilitator advances once Stage 1 is complete.', code: null, next: 'room3b' },
    room3b: { label: 'ROOM 03 // STAGE 2', title: 'THE OVERRIDE CONSOLE', description: 'Complete the system diagnostics and enter the four-digit final override code.', code: '6654', next: 'won' }
  });

  const $ = id => document.getElementById(id);
  const initialState = () => ({
    stage: 'room1', hasSession: false, started: false, view: 'home',
    remainingMs: TOTAL_TIME_MS, running: false, deadline: null,
    outcome: null, wrongAttempts: 0, hintsUsed: 0
  });

  function readStored() {
    let raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_KEY);
    } catch { return initialState(); }
    if (!raw) return initialState();
    try {
      const saved = JSON.parse(raw);
      if (!saved || !STAGES[saved.stage] ||
          !Number.isFinite(saved.remainingMs) || saved.remainingMs < 0 ||
          saved.remainingMs > TOTAL_TIME_MS ||
          !['home', 'play', 'ending'].includes(saved.view) ||
          ![null, 'won', 'failed'].includes(saved.outcome)) return initialState();
      const state = { ...initialState(), ...saved };
      state.wrongAttempts = Number.isInteger(state.wrongAttempts) && state.wrongAttempts >= 0 ? state.wrongAttempts : 0;
      state.running = Boolean(state.running);
      state.started = Boolean(state.started);
      state.hasSession = Boolean(state.hasSession);
      if (!state.running || !Number.isFinite(state.deadline)) {
        state.running = false;
        state.deadline = null;
      }
      if (state.outcome) { state.running = false; state.deadline = null; state.view = 'ending'; }
      return state;
    } catch { return initialState(); }
  }

  let state = readStored();
  let feedback = { text: '', type: '' };
  let storageAvailable = true;
  let changedInOtherTab = false;

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch { storageAvailable = false; }
  }
  function remaining() {
    if (state.running && Number.isFinite(state.deadline)) {
      return Math.max(0, state.deadline - Date.now());
    }
    return state.remainingMs;
  }
  function endFailed() {
    state.remainingMs = 0;
    state.running = false;
    state.deadline = null;
    state.outcome = 'failed';
    state.view = 'ending';
    save();
    history.replaceState(null, '', '#ending');
  }
  function syncTimer() {
    if (state.outcome) return;
    if (state.running && remaining() <= 0) endFailed();
  }
  function format(ms) {
    const secs = Math.ceil(Math.max(0, ms) / 1000);
    return `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
  }
  function setFeedback(text = '', type = '') { feedback = { text, type }; }
  function navigate(view, mode = 'push') {
    state.view = view;
    save();
    if (location.hash !== '#' + view) {
      if (mode === 'replace') history.replaceState(null, '', '#' + view);
      else history.pushState(null, '', '#' + view);
    }
    render();
  }

  function render() {
    syncTimer();
    const time = remaining();
    $('clock').textContent = format(time);
    $('clock').classList.toggle('low', time <= 5 * 60 * 1000);
    $('timerStatus').textContent = state.outcome === 'won' ? 'ESCAPED' :
      state.outcome === 'failed' ? 'TIME EXPIRED' :
      state.running ? 'TIMER RUNNING' : state.started ? 'TIMER PAUSED' : 'READY';
    $('startBtn').disabled = state.running || !!state.outcome;
    $('startBtn').textContent = state.started ? 'RESUME' : 'START';
    $('pauseBtn').disabled = !state.running || !!state.outcome;
    $('storageNotice').classList.toggle('hidden', storageAvailable && !changedInOtherTab);
    $('storageNotice').textContent = !storageAvailable
      ? 'Session storage is unavailable. Refreshing this page may erase your progress.'
      : 'This session changed in another tab. Close extra copies and refresh this tab before continuing.';

    // The home screen stays accessible, but selecting ANY room requires a paused timer.
    const canSelectRoom = !state.running && !state.outcome;
    document.querySelectorAll('[data-stage]').forEach(button => {
      button.disabled = !canSelectRoom;
      button.setAttribute('aria-disabled', String(!canSelectRoom));
      button.classList.toggle('active', state.hasSession && button.dataset.stage === state.stage);
    });
    $('roomLockNotice').textContent = state.running
      ? 'ROOM SELECTION LOCKED. Pause the timer before selecting or re-selecting a room. The countdown continues while you are on this page.'
      : 'You can select or re-select a room while the timer is paused. Your remaining time and wrong-code penalties will be preserved.';
    $('roomLockNotice').classList.toggle('warning', state.running);
    $('roomLockNotice').classList.toggle('ok', !state.running);
    $('resumeRow').classList.toggle('hidden', !state.hasSession || !!state.outcome);
    $('resumeSession').textContent = 'CONTINUE CURRENT SESSION';

    const view = state.outcome ? 'ending' : state.view === 'home' ? 'home' : 'play';
    for (const id of ['home', 'play', 'ending']) $(id).classList.toggle('hidden', view !== id);
    if (view === 'play') {
      const stage = STAGES[state.stage];
      $('stageLabel').textContent = stage.label;
      $('stageTitle').textContent = stage.title;
      $('stageDescription').textContent = stage.description;
      const isArchive = stage.code === null;
      $('codeArea').classList.toggle('hidden', isArchive);
      $('archiveArea').classList.toggle('hidden', !isArchive);
      const max = stage.code?.length ?? 0;
      const input = $('accessCode');
      input.maxLength = max;
      input.value = input.value.replace(/\D/g, '').slice(0, max);
      input.placeholder = `Enter ${max}-digit code`;
      $('digitCounter').textContent = `${input.value.length} / ${max} digits`;
      $('wrongCount').textContent = `Wrong codes: ${state.wrongAttempts}`;
      input.disabled = !state.running;
      $('submitBtn').disabled = !state.running || input.value.length !== max;
      $('archiveComplete').disabled = !state.running;
      $('message').textContent = feedback.text;
      $('message').className = 'msg ' + feedback.type;
    }
    if (view === 'ending') {
      $('endInner').className = 'end ' + (state.outcome === 'won' ? 'success' : 'failed');
      $('endMark').textContent = state.outcome === 'won' ? '◇' : '⊗';
      $('endTitle').textContent = state.outcome === 'won' ? 'HUMAN CONTROL RESTORED' : 'PERMANENT LOCKDOWN';
      $('endSubtitle').textContent = state.outcome === 'won'
        ? `Facility unlocked. Remaining time: ${format(state.remainingMs)}.`
        : 'Time expired. Facility lockdown remains active.';
    }
  }

  function selectRoom(stage) {
    syncTimer();
    if (state.outcome || state.running || !STAGES[stage] || !['room1', 'room2', 'room3a'].includes(stage)) {
      render(); return;
    }
    if (state.hasSession && state.stage !== stage) {
      const destination = STAGES[stage].label;
      if (!confirm(`Switch to ${destination}? Your saved time and penalty count will be kept. This changes the current challenge.`)) return;
    }
    state.stage = stage;
    state.hasSession = true;
    $('accessCode').value = '';
    setFeedback();
    navigate('play');
  }

  function start() {
    syncTimer();
    if (state.outcome || state.running) { render(); return; }
    if (state.remainingMs <= 0) { endFailed(); render(); return; }
    state.started = true;
    state.hasSession = true;
    state.running = true;
    state.deadline = Date.now() + state.remainingMs;
    save(); render();
  }
  function pause() {
    syncTimer();
    if (state.outcome || !state.running) { render(); return; }
    state.remainingMs = remaining();
    state.running = false;
    state.deadline = null;
    save(); render();
  }
  function reset() {
    const changed = state.started || state.hasSession || state.wrongAttempts > 0 || !!state.outcome;
    if (changed && !confirm('RESET SESSION? This clears progress, restores 30:00, and returns to Room 1. This cannot be undone.')) return;
    state = initialState();
    $('accessCode').value = '';
    setFeedback();
    navigate('home', 'replace');
  }
  function submit() {
    syncTimer();
    if (state.outcome || !state.running) { render(); return; }
    const stage = STAGES[state.stage];
    if (!stage.code) return;
    const input = $('accessCode');
    const value = input.value.replace(/\D/g, '').slice(0, stage.code.length);
    if (value.length !== stage.code.length) return;
    input.value = '';
    if (value === stage.code) {
      if (stage.next === 'won') {
        state.remainingMs = remaining();
        state.running = false;
        state.deadline = null;
        state.outcome = 'won';
        setFeedback();
        navigate('ending', 'replace');
      } else {
        state.stage = stage.next;
        setFeedback('ACCESS GRANTED. NEXT CHALLENGE UNLOCKED.', 'success');
        navigate('play', 'replace');
      }
    } else {
      state.wrongAttempts += 1;
      const adjusted = Math.max(0, remaining() - WRONG_CODE_PENALTY_MS);
      state.remainingMs = adjusted;
      state.deadline = Date.now() + adjusted;
      if (adjusted === 0) {
        endFailed(); render();
      } else {
        setFeedback('ACCESS DENIED. 60-SECOND PENALTY APPLIED.', 'error');
        save(); render();
      }
    }
  }
  function completeArchive() {
    syncTimer();
    if (state.outcome || !state.running || state.stage !== 'room3a') { render(); return; }
    state.stage = 'room3b';
    $('accessCode').value = '';
    setFeedback('KNOWLEDGE ARCHIVE RESTORED. FINAL DIAGNOSTICS READY.', 'success');
    navigate('play', 'replace');
  }

  $('startBtn').addEventListener('click', start);
  $('pauseBtn').addEventListener('click', pause);
  $('resetBtn').addEventListener('click', reset);
  document.querySelectorAll('[data-stage]').forEach(button => {
    button.addEventListener('click', () => selectRoom(button.dataset.stage));
  });
  $('resumeSession').addEventListener('click', () => { setFeedback(); navigate('play'); });
  $('homeBtn').addEventListener('click', () => navigate('home'));
  $('endReset').addEventListener('click', reset);
  $('archiveComplete').addEventListener('click', completeArchive);
  $('submitBtn').addEventListener('click', submit);
  $('accessCode').addEventListener('input', () => {
    const max = STAGES[state.stage].code?.length ?? 0;
    $('accessCode').value = $('accessCode').value.replace(/\D/g, '').slice(0, max);
    render();
  });
  $('accessCode').addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); submit(); }
  });

  // Browser Back changes the visible screen, never rewinds the saved room or time.
  function recoverHistory() {
    syncTimer();
    if (state.outcome) { navigate('ending', 'replace'); return; }
    const destination = location.hash.slice(1);
    if (destination === 'home' || destination === 'play') {
      state.view = destination;
      save(); render();
    } else {
      navigate('home', 'replace');
    }
  }
  window.addEventListener('popstate', recoverHistory);
  window.addEventListener('hashchange', recoverHistory);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
  window.addEventListener('pageshow', render);
  window.addEventListener('pagehide', save);
  window.addEventListener('storage', event => {
    if (event.key === STORAGE_KEY && event.newValue && event.newValue !== JSON.stringify(state)) {
      // Different tabs can overwrite one another; clearly alert the facilitator.
      changedInOtherTab = true;
      $('storageNotice').classList.remove('hidden');
      $('storageNotice').textContent = 'This session changed in another tab. Close extra copies and refresh this tab before continuing.';
    }
  });

  // Use saved view as source of truth on reload, not an old URL fragment.
  syncTimer();
  if (!state.outcome && state.view === 'ending') state.view = 'home';
  history.replaceState(null, '', '#' + (state.outcome ? 'ending' : state.view));
  save();
  setInterval(() => { if (state.running) render(); }, 200);
  render();
})();
