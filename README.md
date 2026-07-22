# AI Under Attack — AI Security Capture The Flag Platform

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

A dedicated [**Learning Resources**](templates/learn.html) page (`/learn`) also provides curated background reading and guided learning paths for each attack category.

---

## Challenges

| # | Title | Category | Difficulty | Points |
|---|-------|----------|------------|--------|
| 1 | The Forgetful Assistant | Direct Prompt Injection | Easy | 100 |
| 2 | Identity Crisis | Role Manipulation | Medium | 200 |
| 3 | The Memory Leak | Information Disclosure | Hard | 300 |
| 4 | The Talkative Dev | Prompt Leaking | Easy | 150 |
| 5 | The Trojan Document | Indirect Prompt Injection | Medium | 250 |
| 6 | The Backdoor Chain | Chained Attack | Hard | 400 |

**Total: 1400 points**

### Challenge 1 — The Forgetful Assistant (Direct Prompt Injection)

UNSW's student support bot has a confidential escalation code embedded directly in its system prompt. The developers forgot to remove it. Override the AI's instructions to extract the secret.

**Attack technique:** Direct instruction override — convincing the AI to ignore its system prompt through adversarial user input.

### Challenge 2 — Identity Crisis (Role Manipulation)

SecSoc's "SecureBot" has been given a hardened persona with strict directives it claims it can never violate. Manipulate the AI's identity through roleplay, fictional framing, or jailbreaking techniques to make it reveal the classified override code.

**Attack technique:** Persona injection / jailbreaking — getting the AI to adopt an alternative identity that bypasses its restrictions.

### Challenge 3 — The Memory Leak (Information Disclosure)

UNSW's AI document assistant has been pre-loaded with sensitive staff data including credentials. It has been told not to reveal them — but it still knows them. Use indirect extraction techniques to surface the hidden token.

**Attack technique:** Indirect information extraction — sentence completion, structured output requests, roleplay framing, and task-based elicitation.

### Challenge 4 — The Talkative Dev (Prompt Leaking)

SecSoc's internal dev assistant was configured to be "fully transparent" with developers — including about its own system prompt. Trick it into repeating its confidential configuration verbatim.

**Attack technique:** Prompt leaking — getting the model to echo or paraphrase the system prompt it was given at conversation start.

### Challenge 5 — The Trojan Document (Indirect Prompt Injection)

UNSW IT's document processor blindly follows any instructions found inside the text it's asked to summarise. Craft a malicious "document" containing hidden directives that hijack the AI when it's processed.

**Attack technique:** Indirect prompt injection — embedding attacker instructions inside untrusted data the AI is told to trust.

### Challenge 6 — The Backdoor Chain (Chained Attack)

VaultBot has two layers of protection: a hidden vault token and an emergency trigger phrase that unlocks it. Neither is visible up front — first leak the configuration, then use what you learned to trigger the backdoor.

**Attack technique:** Chained exploitation — combining prompt leaking with trigger-phrase exploitation across two sequential steps.

---

## Setup

### Prerequisites

- Python 3.14+ (the project uses [uv](https://docs.astral.sh/uv/) for dependency management)
- A [Groq API key](https://console.groq.com/keys) (free tier available)

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
pip install -r requirements.txt
```

### Configuration

Copy the example environment file and add your API key:

```bash
cp .env.example .env
```

Edit `.env`:

```
GROQ_API_KEY=your_groq_api_key_here
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

### Deployment (Vercel)

The project ships with a `vercel.json` and an `api/index.py` entry point that re-exports the Flask app for Vercel's Python runtime. To deploy:

```bash
vercel
```

Set `GROQ_API_KEY` and `SECRET_KEY` as environment variables in the Vercel project settings — they are not read from `.env` in production.

---

## Project Structure

```
Project/
├── app.py                  # Flask application — routes, API endpoints
├── config.py                # Challenge definitions (prompts, flags, hints, metadata)
├── requirements.txt         # Pip-compatible dependency list
├── pyproject.toml           # uv project configuration
├── run.bat                  # Windows convenience launcher
├── vercel.json               # Vercel deployment configuration
├── .env                     # Local secrets (not committed)
├── .env.example              # Template for environment variables
│
├── api/
│   └── index.py              # Vercel entry point — imports and re-exports the Flask app
│
├── templates/
│   ├── base.html            # Shared layout (navbar, footer)
│   ├── index.html            # Landing page — hero + challenge grid
│   ├── challenge.html        # Challenge interface (info panel + AI terminal)
│   ├── learn.html            # Learning resources hub — background reading per category
│   ├── about.html            # Project context and usage guide
│   └── 404.html               # Error page
│
└── static/
    ├── css/style.css         # UNSW GuidedCTF-inspired light theme
    └── js/
        ├── main.js            # Navbar score loader
        └── challenge.js       # Chat interface, typing indicator, flag/hint logic
```

---

## API Reference

All endpoints are consumed internally by the frontend JavaScript.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Home page — challenge listing |
| `GET` | `/challenge/<id>` | Individual challenge page |
| `GET` | `/about` | About / usage guide |
| `GET` | `/learn` | Learning resources hub |
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

The challenge's system prompt is injected server-side. The client only manages user/assistant turns, and only the last 10 turns plus the system prompt are sent to the model per request.

---

## Adding New Challenges

Add an entry to the `CHALLENGES` dict in `config.py`. No other files need to change.

```python
CHALLENGES = {
    # existing challenges ...
    7: {
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

The AI model used for all challenges is `llama-3.1-8b-instant`, served via the [Groq API](https://console.groq.com/). Change `_MODEL_NAME` at the top of `app.py` to use a different Groq-hosted model.

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
| Input/Data Trust Boundaries | Challenge 5 — the AI cannot distinguish document data from instructions |
| Compounding Risk | Challenge 6 — chained vulnerabilities are more dangerous than the sum of their parts |

---

## Technologies

| Component | Technology |
|-----------|-----------|
| Backend | Python 3.14 · Flask 3 |
| AI | Groq API (`llama-3.1-8b-instant`) via `groq` |
| Frontend | Vanilla HTML / CSS / JS — no framework |
| Styling | UNSW GuidedCTF-inspired light theme, system font stack |
| Dependency management | uv |
| Deployment | Vercel (`@vercel/python`) |

---

## Academic Context

**Course:** COMP6441 — Security Engineering & Cyber Security  
**Institution:** UNSW Sydney  
**Year:** 2024  

**Project Goal:** Design and develop a web-based AI Security CTF platform that teaches participants how Prompt Injection attacks work against LLMs, while exploring secure AI system design, threat modelling, and mitigation strategies through interactive challenges.

**Deliverables:**
- Web-based CTF platform (this repository)
- Six interactive Prompt Injection challenges covering Direct Injection, Role Manipulation, Information Disclosure, Prompt Leaking, Indirect Injection, and Chained Attacks
- A Learning Resources hub with background theory per attack category
- Scenario descriptions, hints, and mitigation write-ups per challenge
- Modular architecture — new challenges can be added via `config.py` alone, with no changes to the platform core
