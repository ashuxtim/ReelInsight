@echo off
echo 🔧 Setting up Environment...
cd backend
call venv\Scripts\activate

:: Add the 'backend' folder to Python Path so it can find 'src'
set PYTHONPATH=%CD%

echo 🚀 Starting Backend on http://127.0.0.1:8000...
start uvicorn app.main:app --reload

echo 🎨 Starting UI on http://localhost:8501...
:: We use 'python -m streamlit' to ensure it uses the venv's streamlit
start python -m streamlit run app/ui.py

pause