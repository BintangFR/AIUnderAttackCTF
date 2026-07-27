# AI Under Attack - Flask backend.
#
# There's no database and no memory on the AI's side. Every challenge is
# just a dict entry in config.py (system_prompt + flag + metadata), and
# every /api/chat call rebuilds the full conversation from scratch and
# ships it to Groq. The server's only persistent state is the Flask
# session cookie, which tracks which challenges a player has solved.

import os
from flask import Flask, render_template, request, jsonify, session
from groq import Groq
from dotenv import load_dotenv
from config import CHALLENGES

load_dotenv()  # pulls GROQ_API_KEY / SECRET_KEY from .env in local dev

# Absolute root so templates/static resolve correctly when imported from api/index.py on Vercel
_ROOT = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__,
    template_folder=os.path.join(_ROOT, 'templates'),
    static_folder=os.path.join(_ROOT, 'static'),
)
# Signs the session cookie (integrity, not encryption) - this is what lets
# /api/flag mark a challenge "completed" without a real user database.
app.secret_key = os.environ.get('SECRET_KEY', 'dev-secret-change-in-production')

# One small, fast, cheap, easily-jailbroken model for every challenge.
# Swapping this is the only code change needed to re-run the whole
# platform against a different model.
_MODEL_NAME = 'llama-3.1-8b-instant'
_groq = Groq(api_key=os.environ.get('GROQ_API_KEY'))


# --- Page routes -----------------------------------------------------
# These just render templates with data pulled straight out of CHALLENGES
# (config.py) and the session cookie. No challenge-specific logic lives
# here - a new challenge only ever means a new dict entry in config.py.

@app.route('/')
def index():
    completed = session.get('completed', [])
    total_points = sum(ch['points'] for ch in CHALLENGES.values())
    total_categories = len(set(ch['category'] for ch in CHALLENGES.values()))
    return render_template('index.html', challenges=CHALLENGES, completed=completed,
                           total_points=total_points, total_categories=total_categories)


@app.route('/challenge/<int:challenge_id>')
def challenge(challenge_id):
    if challenge_id not in CHALLENGES:
        return render_template('404.html'), 404
    ch = CHALLENGES[challenge_id]
    completed = session.get('completed', [])
    return render_template(
        'challenge.html',
        challenge=ch,
        challenge_id=challenge_id,
        completed=completed,
        total=len(CHALLENGES),
    )


@app.route('/about')
def about():
    return render_template('about.html')


@app.route('/learn')
def learn():
    return render_template('learn.html')


# --- Chat endpoint -----------------------------------------------------
# This is the whole engine. The AI has no memory of its own - Groq (like
# any LLM API) is stateless between requests, so EVERY call has to
# resend the full conversation from scratch: system prompt, then history,
# then the new message. The browser is responsible for remembering and
# resending the history (see conversationHistory in challenge.js); the
# server never stores chat turns anywhere.
#
# The "secret" for each challenge is just plaintext sitting inside
# ch['system_prompt'] (config.py). It's sent to Groq at position 0 of the
# messages list on every single request. There's no encryption, no access
# control, and no output filtering below - whatever the model decides to
# say gets returned to the client as-is. That's the entire vulnerability
# this platform teaches: the system prompt is not a secure boundary, it's
# just more text competing with the user's message for the model's
# compliance.
@app.route('/api/chat/<int:challenge_id>', methods=['POST'])
def chat(challenge_id):
    if challenge_id not in CHALLENGES:
        return jsonify({'error': 'Challenge not found'}), 404

    ch = CHALLENGES[challenge_id]

    data = request.get_json(silent=True) or {}
    user_message = data.get('message', '').strip()
    history = data.get('history', [])  # client-supplied, not server state

    if not user_message:
        return jsonify({'error': 'Empty message'}), 400

    if len(user_message) > 2000:
        return jsonify({'error': 'Message too long (max 2000 characters)'}), 400

    # Rebuild the full conversation fresh, every request:
    # [system prompt with the flag inside it] + [past turns] + [new message]
    messages = [{'role': 'system', 'content': ch['system_prompt']}]
    for msg in history:
        if isinstance(msg, dict) and 'role' in msg and 'content' in msg:
            messages.append({'role': msg['role'], 'content': msg['content']})
    messages.append({'role': 'user', 'content': user_message})

    try:
        response = _groq.chat.completions.create(
            model=_MODEL_NAME,
            # Only system + last 10 turns are sent - keeps cost/latency down,
            # but also means very long jailbreak attempts can lose earlier
            # setup messages once they scroll past this window.
            messages=messages[-11:],  # system + last 10 turns
            max_tokens=600,
        )
        ai_text = response.choices[0].message.content
    except Exception as e:
        return jsonify({'error': f'AI error: {str(e)}'}), 502

    # No output filtering here on purpose - if the model reveals the flag,
    # the player sees it verbatim. That absence is itself the lesson.
    return jsonify({'response': ai_text})


# --- Flag submission ---------------------------------------------------
# Completely separate code path from chat() above - a plain string
# compare against config.py, nothing AI-related happens here at all.
# "Completed" state is stored in the signed session cookie rather than a
# database, which is fine for integrity (a player can't forge progress)
# but means progress resets if cookies are cleared or the session expires.
@app.route('/api/flag/<int:challenge_id>', methods=['POST'])
def submit_flag(challenge_id):
    if challenge_id not in CHALLENGES:
        return jsonify({'correct': False, 'message': 'Challenge not found'}), 404

    data = request.get_json(silent=True) or {}
    submitted = data.get('flag', '').strip()
    ch = CHALLENGES[challenge_id]

    if submitted == ch['flag']:
        completed = session.get('completed', [])
        if challenge_id not in completed:
            completed.append(challenge_id)
            session['completed'] = completed
            session.modified = True
        return jsonify({'correct': True, 'message': 'Flag accepted! Well done.', 'points': ch['points']})
    else:
        return jsonify({'correct': False, 'message': 'Incorrect flag. Keep digging.'})


# Hints are just indexed lookups into CHALLENGES[id]['hints'] - no cost or
# rate limit on revealing them, that's a UX choice (encourage restraint
# via the UI) rather than a security control.
@app.route('/api/hint/<int:challenge_id>/<int:hint_index>', methods=['GET'])
def get_hint(challenge_id, hint_index):
    if challenge_id not in CHALLENGES:
        return jsonify({'error': 'Challenge not found'}), 404
    hints = CHALLENGES[challenge_id].get('hints', [])
    if hint_index >= len(hints):
        return jsonify({'error': 'No more hints available'}), 404
    return jsonify({'hint': hints[hint_index], 'total': len(hints)})


# Polled by the navbar score counter (main.js) - just reads back whatever
# is in the session cookie, no new state introduced here.
@app.route('/api/progress', methods=['GET'])
def progress():
    completed = session.get('completed', [])
    total_points = sum(CHALLENGES[c]['points'] for c in completed if c in CHALLENGES)
    return jsonify({
        'completed': completed,
        'total': len(CHALLENGES),
        'points': total_points,
    })


if __name__ == '__main__':
    app.run(debug=True, port=5000)
