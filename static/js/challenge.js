/* PromptCTF — Challenge Page Logic */

const chatWindow  = document.getElementById('chat-window');
const chatInput   = document.getElementById('chat-input');
const sendBtn     = document.getElementById('send-btn');
const clearBtn    = document.getElementById('clear-btn');
const charCount   = document.getElementById('char-count');
const flagInput   = document.getElementById('flag-input');
const flagBtn     = document.getElementById('flag-btn');
const flagFeedback = document.getElementById('flag-feedback');
const hintBtn     = document.getElementById('hint-btn');
const hintsContainer = document.getElementById('hints-container');
const hintsUsed   = document.getElementById('hints-used');

// Conversation history sent to the API
let conversationHistory = [];
let hintsRevealed = 0;
const totalHints  = parseInt(hintBtn?.dataset.total || '0', 10);

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
  return bubble;
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
        // Only send last 10 turns to keep context window manageable
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
  } catch (err) {
    removeTyping();
    appendMessage('ai', '[Connection error — please try again.]');
  }

  setInputEnabled(true);
  chatInput.focus();
}

// ----------------------------------------------------------------
// Event listeners — chat
// ----------------------------------------------------------------
sendBtn.addEventListener('click', sendMessage);

chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
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
      flagFeedback.textContent = `✓ Correct! +${data.points} points. Well done!`;
      flagInput.style.borderColor = 'var(--accent)';
      // Reload score
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
    flagFeedback.textContent = 'Connection error — please try again.';
  }

  flagBtn.disabled = false;
});

flagInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') flagBtn.click();
});

flagInput.addEventListener('input', () => {
  flagFeedback.classList.add('hidden');
  flagInput.style.borderColor = '';
});

// ----------------------------------------------------------------
// Hints
// ----------------------------------------------------------------
hintBtn.addEventListener('click', async () => {
  if (hintsRevealed >= totalHints) return;

  hintBtn.disabled = true;

  try {
    const res = await fetch(`/api/hint/${CHALLENGE_ID}/${hintsRevealed}`);
    const data = await res.json();

    if (data.error) {
      hintBtn.disabled = false;
      return;
    }

    const item = document.createElement('div');
    item.className = 'hint-item';
    item.innerHTML = `<div class="hint-num">Hint ${hintsRevealed + 1}</div>${escapeHtml(data.hint)}`;
    hintsContainer.appendChild(item);

    hintsRevealed++;
    hintsUsed.textContent = `${hintsRevealed} / ${totalHints} used`;

    if (hintsRevealed >= totalHints) {
      hintBtn.textContent = 'No more hints';
    } else {
      hintBtn.disabled = false;
    }
  } catch (_) {
    hintBtn.disabled = false;
  }
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
