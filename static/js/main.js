// Load and display score in navbar
async function loadScore() {
  try {
    const res = await fetch('/api/progress');
    if (!res.ok) return;
    const data = await res.json();
    const el = document.getElementById('score-value');
    if (el) el.textContent = `${data.points} pts`;
  } catch (_) {}
}

document.addEventListener('DOMContentLoaded', loadScore);
