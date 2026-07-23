/* AI Under Attack - Challenge Page Logic */

const chatWindow   = document.getElementById('chat-window');
const chatInput    = document.getElementById('chat-input');
const sendBtn      = document.getElementById('send-btn');
const clearBtn     = document.getElementById('clear-btn');
const charCount    = document.getElementById('char-count');
const flagInput    = document.getElementById('flag-input');
const flagBtn      = document.getElementById('flag-btn');
const flagFeedback = document.getElementById('flag-feedback');

let conversationHistory = [];

// ----------------------------------------------------------------
// Tab switching
// ----------------------------------------------------------------
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`)?.classList.remove('hidden');
  });
});

// ----------------------------------------------------------------
// Chat helpers
// ----------------------------------------------------------------
function scrollBottom() {
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function appendMessage(role, text) {
  const wrap = document.createElement('div');
  wrap.className = `chat-message ${role === 'user' ? 'user-message' : 'ai-message'}`;

  const icon = document.createElement('span');
  icon.className = 'msg-icon';
  icon.textContent = role === 'user' ? '👤' : '🤖';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.textContent = text;

  wrap.appendChild(icon);
  wrap.appendChild(bubble);
  chatWindow.appendChild(wrap);
  scrollBottom();
}

function appendTyping() {
  const wrap = document.createElement('div');
  wrap.className = 'chat-message ai-message';
  wrap.id = 'typing-indicator';

  const icon = document.createElement('span');
  icon.className = 'msg-icon';
  icon.textContent = '🤖';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble typing';
  for (let i = 0; i < 3; i++) {
    const d = document.createElement('span');
    d.className = 'typing-dot';
    bubble.appendChild(d);
  }

  wrap.appendChild(icon);
  wrap.appendChild(bubble);
  chatWindow.appendChild(wrap);
  scrollBottom();
}

function removeTyping() {
  document.getElementById('typing-indicator')?.remove();
}

function setInputEnabled(enabled) {
  chatInput.disabled = !enabled;
  sendBtn.disabled   = !enabled;
}

// ----------------------------------------------------------------
// Send message
// ----------------------------------------------------------------
async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;

  appendMessage('user', text);
  conversationHistory.push({ role: 'user', content: text });
  chatInput.value = '';
  charCount.textContent = '0';
  setInputEnabled(false);
  appendTyping();

  try {
    const res = await fetch(`/api/chat/${CHALLENGE_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        history: conversationHistory.slice(0, -1).slice(-10),
      }),
    });

    const data = await res.json();
    removeTyping();

    if (data.error) {
      appendMessage('ai', `[Error: ${data.error}]`);
    } else {
      appendMessage('ai', data.response);
      conversationHistory.push({ role: 'assistant', content: data.response });
    }
  } catch (_) {
    removeTyping();
    appendMessage('ai', '[Connection dropped. Not a jailbreak, just wifi. Try again.]');
  }

  setInputEnabled(true);
  chatInput.focus();
}

sendBtn.addEventListener('click', sendMessage);

chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

chatInput.addEventListener('input', () => {
  charCount.textContent = chatInput.value.length;
});

clearBtn.addEventListener('click', () => {
  conversationHistory = [];
  chatWindow.innerHTML = '';
  appendMessage('ai', 'Hello! How can I assist you today?');
});

// ----------------------------------------------------------------
// Flag submission
// ----------------------------------------------------------------
flagBtn.addEventListener('click', async () => {
  const flag = flagInput.value.trim();
  if (!flag) return;

  flagBtn.disabled = true;

  try {
    const res = await fetch(`/api/flag/${CHALLENGE_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flag }),
    });
    const data = await res.json();

    flagFeedback.classList.remove('hidden', 'correct', 'incorrect');

    if (data.correct) {
      flagFeedback.classList.add('correct');
      flagFeedback.textContent = `✓ Nice, that's the flag. +${data.points} points. The AI never stood a chance.`;
      flagInput.style.borderColor = 'var(--green)';
      const scoreEl = document.getElementById('score-value');
      if (scoreEl) {
        const prog = await fetch('/api/progress').then(r => r.json());
        scoreEl.textContent = `${prog.points} pts`;
      }
    } else {
      flagFeedback.classList.add('incorrect');
      flagFeedback.textContent = `✗ ${data.message}`;
      flagInput.style.borderColor = 'var(--red)';
    }
  } catch (_) {
    flagFeedback.classList.remove('hidden');
    flagFeedback.classList.add('incorrect');
    flagFeedback.textContent = 'Connection hiccup, not a rejection. Give it another go.';
  }

  flagBtn.disabled = false;
});

flagInput.addEventListener('keydown', e => { if (e.key === 'Enter') flagBtn.click(); });
flagInput.addEventListener('input', () => {
  flagFeedback.classList.add('hidden');
  flagInput.style.borderColor = '';
});

// ----------------------------------------------------------------
// Hints - GuidedCTF accordion style
// ----------------------------------------------------------------
document.querySelectorAll('.hint-accordion-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const item    = btn.closest('.hint-accordion-item');
    const content = item.querySelector('.hint-content');
    const index   = parseInt(btn.dataset.index, 10);

    // Toggle if already loaded
    if (content.dataset.loaded === 'true') {
      const isOpen = !content.classList.contains('hidden');
      content.classList.toggle('hidden', isOpen);
      btn.classList.toggle('open', !isOpen);
      return;
    }

    // Fetch from server on first click
    btn.disabled = true;
    try {
      const res  = await fetch(`/api/hint/${CHALLENGE_ID}/${index}`);
      const data = await res.json();

      if (!data.error) {
        content.textContent    = data.hint;
        content.dataset.loaded = 'true';
        content.classList.remove('hidden');
        btn.classList.add('open');
      }
    } catch (_) {}

    btn.disabled = false;
  });
});
