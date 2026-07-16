import sys
import os

# Add project root to path so app.py and config.py are importable from api/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app
