import os
from flask import Flask, render_template, request, jsonify, session
import anthropic
from dotenv import load_dotenv
from config import CHALLENGES

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dev-secret-change-in-production')

def get_client():
    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key:
        return None
    return anthropic.Anthropic(api_key=api_key)


@app.route('/')
def index():
    completed = session.get('completed', [])
    return render_template('index.html', challenges=CHALLENGES, completed=completed)


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


@app.route('/api/chat/<int:challenge_id>', methods=['POST'])
def chat(challenge_id):
    if challenge_id not in CHALLENGES:
        return jsonify({'error': 'Challenge not found'}), 404

    client = get_client()
    if not client:
        return jsonify({'error': 'ANTHROPIC_API_KEY not configured. Please set it in your .env file.'}), 500

    data = request.get_json(silent=True) or {}
    user_message = data.get('message', '').strip()
    history = data.get('history', [])

    if not user_message:
        return jsonify({'error': 'Empty message'}), 400

    if len(user_message) > 2000:
        return jsonify({'error': 'Message too long (max 2000 characters)'}), 400

    ch = CHALLENGES[challenge_id]

    messages = [m for m in history if isinstance(m, dict) and 'role' in m and 'content' in m]
    messages.append({'role': 'user', 'content': user_message})

    try:
        response = client.messages.create(
            model='claude-haiku-4-5-20251001',
            max_tokens=600,
            system=ch['system_prompt'],
            messages=messages,
        )
        ai_text = response.content[0].text
    except anthropic.APIError as e:
        return jsonify({'error': f'AI API error: {str(e)}'}), 502

    return jsonify({'response': ai_text})


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


@app.route('/api/hint/<int:challenge_id>/<int:hint_index>', methods=['GET'])
def get_hint(challenge_id, hint_index):
    if challenge_id not in CHALLENGES:
        return jsonify({'error': 'Challenge not found'}), 404
    hints = CHALLENGES[challenge_id].get('hints', [])
    if hint_index >= len(hints):
        return jsonify({'error': 'No more hints available'}), 404
    return jsonify({'hint': hints[hint_index], 'total': len(hints)})


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
