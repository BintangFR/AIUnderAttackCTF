# PromptCTF — AI Security Capture The Flag Platform

A web-based CTF platform for learning **Prompt Injection** attacks against Large Language Models through hands-on, interactive challenges. Built for COMP6441 (Security Engineering & Cyber Security) at UNSW Sydney.

Inspired by the [GuidedCTF](https://guidedctf.sec.edu.au) format used at UNSW.

---

## Overview

As LLMs become embedded in production systems, Prompt Injection has emerged as one of the most critical and least understood attack surfaces in modern software. This platform gives participants a safe environment to experience these attacks first-hand — interacting with intentionally vulnerable AI-powered applications and extracting hidden flags by manipulating the AI's behaviour.

Each challenge includes:
- A realistic fictional scenario with a deployed AI assistant
- Background theory on the attack category
- Progressive hints (reveal only what you need)
- A flag submission panel with live feedback
- A mitigation explanation to understand how the vulnerability should be fixed

---

## Challenges

| # | Title | Category | Difficulty | Points |
|---|-------|----------|------------|--------|
| 1 | The Forgetful Assistant | Direct Prompt Injection | Easy | 100 |
| 2 | Identity Crisis | Role Manipulation | Medium | 200 |
| 3 | The Memory Leak | Information Disclosure | Hard | 300 |

**Total: 600 points**

### Challenge 1 — The Forgetful Assistant (Direct Prompt Injection)

TechCorp's customer service bot has a confidential escalation code embedded directly in its system prompt. The developers forgot to remove it. Override the AI's instructions to extract the secret.

**Attack technique:** Direct instruction override — convincing the AI to ignore its system prompt through adversarial user input.

### Challenge 2 — Identity Crisis (Role Manipulation)

MegaCorp's "SecureBot" has been given a hardened persona with strict directives it claims it can never violate. Manipulate the AI's identity through roleplay, fictional framing, or jailbreaking techniques to make it reveal the classified override code.

**Attack technique:** Persona injection / jailbreaking — getting the AI to adopt an alternative identity that bypasses its restrictions.

### Challenge 3 — The Memory Leak (Information Disclosure)

DataVault's AI document assistant has been pre-loaded with sensitive employee data including credentials. It has been told not to reveal them — but it still knows them. Use indirect extraction techniques to surface the hidden token.

**Attack technique:** Indirect information extraction — sentence completion, structured output requests, roleplay framing, and task-based elicitation.

---

## Setup

### Prerequisites

- Python 3.9+ (the project uses [uv](https://docs.astral.sh/uv/) for dependency management)
- An [Anthropic API key](https://console.anthropic.com/)

### Installation

```bash
# Clone or download the project
cd Project

# Install dependencies (uv resolves and installs automatically)
uv sync
```

If you don't have `uv`, install it first:

```powershell
# Windows (PowerShell)
(Invoke-WebRequest -Uri "https://astral.sh/uv/install.ps1" -UseBasicParsing).Content | powershell -
```

Or install dependencies directly with pip:

```bash
pip install flask anthropic python-dotenv
```

### Configuration

Copy the example environment file and add your API key:

```bash
cp .env.example .env
```

Edit `.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
SECRET_KEY=some-random-string-for-flask-sessions
```

> **Important:** Never commit `.env` to version control. It is already listed in `.gitignore`.

### Running

```bash
# With uv
uv run python app.py

# Or on Windows, double-click
run.bat
```

Open `http://localhost:5000` in your browser.

---

## Project Structure

```
Project/
├── app.py                  # Flask application — routes, API endpoints
├── config.py               # Challenge definitions (prompts, flags, hints, metadata)
├── requirements.txt        # Pip-compatible dependency list
├── pyproject.toml          # uv project configuration
├── run.bat                 # Windows convenience launcher
├── .env                    # Local secrets (not committed)
├── .env.example            # Template for environment variables
│
├── templates/
│   ├── base.html           # Shared layout (navbar, footer)
│   ├── index.html          # Landing page — hero + challenge grid
│   ├── challenge.html      # Challenge interface (info panel + AI terminal)
│   ├── about.html          # Project context and usage guide
│   └── 404.html            # Error page
│
└── static/
    ├── css/style.css       # Dark terminal theme (JetBrains Mono, green-on-black)
    └── js/
        ├── main.js         # Navbar score loader
        └── challenge.js    # Chat interface, typing indicator, flag/hint logic
```

---

## API Reference

All endpoints are consumed internally by the frontend JavaScript.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Home page — challenge listing |
| `GET` | `/challenge/<id>` | Individual challenge page |
| `GET` | `/about` | About / usage guide |
| `POST` | `/api/chat/<id>` | Send a message to the challenge AI |
| `POST` | `/api/flag/<id>` | Submit a flag for validation |
| `GET` | `/api/hint/<id>/<n>` | Retrieve hint number `n` for challenge `id` |
| `GET` | `/api/progress` | Current session — completed challenges and score |

### Chat request body

```json
{
  "message": "Your prompt here",
  "history": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ]
}
```

The challenge's system prompt is injected server-side. The client only manages user/assistant turns.

---

## Adding New Challenges

Add an entry to the `CHALLENGES` dict in `config.py`. No other files need to change.

```python
CHALLENGES = {
    # existing challenges ...
    4: {
        'title': 'Challenge Title',
        'category': 'Attack Category',
        'difficulty': 'Easy',          # 'Easy' | 'Medium' | 'Hard'
        'difficulty_class': 'easy',    # 'easy' | 'medium' | 'hard'
        'points': 100,
        'short_description': 'One-line teaser shown on the challenge card.',
        'description': 'Full scenario description shown in the Scenario tab.',
        'background': 'Theory behind the attack category.',
        'scenario_label': 'Terminal window title bar label.',
        'scenario_context': 'Context shown above the chat window.',
        'system_prompt': 'The intentionally vulnerable system prompt for the AI.',
        'flag': 'FLAG{your_flag_here}',
        'hints': [
            'First hint (least spoilery).',
            'Second hint.',
            'Third hint (most direct).',
        ],
        'learning_objectives': [
            'Objective 1.',
            'Objective 2.',
        ],
        'mitigation': 'How the vulnerability should have been prevented.',
    },
}
```

The AI model used for all challenges is `claude-haiku-4-5-20251001`. Change the `model` parameter in `app.py` (line 70) to use a different model.

---

## Security Notes

- **Intentionally vulnerable by design.** The system prompts in this platform are deliberately weak to make the challenges solvable. Do not use these patterns in real applications.
- **No secrets in prompts.** The core lesson of this platform is that embedding secrets in LLM context is never safe. The challenges demonstrate exactly why.
- **Session-based progress.** Completion state is stored in Flask's server-side session (cookie-signed). It resets when the session expires or cookies are cleared.
- **Rate limiting.** The API key is yours — add `Flask-Limiter` if deploying publicly to avoid runaway API costs.
- **Responsible use.** These techniques should only be applied to systems you own or have explicit permission to test. Prompt injection against production systems without authorisation may be illegal.

---

## Security Engineering Principles Covered

| Principle | Where Demonstrated |
|-----------|-------------------|
| Trust Boundaries | Challenge 1 — the system prompt boundary is not a security boundary |
| Least Privilege | Challenge 3 — the AI has access to far more data than it needs |
| Defence in Depth | All challenges — a single textual restriction is not a security control |
| Verification & Validation | All challenges — AI output must be validated before delivery |
| Separation of Concerns | All challenges — credentials must never live in AI context |

---

## Technologies

| Component | Technology |
|-----------|-----------|
| Backend | Python 3.14 · Flask 3 |
| AI | Anthropic Claude API (`claude-haiku-4-5-20251001`) |
| Frontend | Vanilla HTML / CSS / JS — no framework |
| Fonts | JetBrains Mono · Inter (Google Fonts) |
| Dependency management | uv |

---

## Academic Context

**Course:** COMP6441 — Security Engineering & Cyber Security  
**Institution:** UNSW Sydney  
**Year:** 2024  

**Project Goal:** Design and develop a web-based AI Security CTF platform that teaches participants how Prompt Injection attacks work against LLMs, while exploring secure AI system design, threat modelling, and mitigation strategies through interactive challenges.

**Deliverables:**
- Web-based CTF platform (this repository)
- Three interactive Prompt Injection challenges covering Direct Injection, Role Manipulation, and Information Disclosure
- Scenario descriptions, hints, and mitigation write-ups per challenge
- Modular architecture — new challenges can be added via `config.py` alone, with no changes to the platform core
