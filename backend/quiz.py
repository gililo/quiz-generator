from flask import Blueprint, request, jsonify, current_app
import os
import json
import base64
from database import get_db
from auth import token_required

# PyMuPDF to read and extract text from PDF files
import fitz

# Groq SDK client to call Groq LLMs
from groq import Groq


# Create a Blueprint for quiz endpoints
quiz_bp = Blueprint('quiz', __name__)

ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# I used claude.ai to help me to read pdf files
def extract_text_from_pdf(filepath):
    doc = fitz.open(filepath)
    text = ""

    for page in doc:              
        text += page.get_text()
    doc.close()

    return text.strip()

# I used claude.ai to help me to read image files
def extract_text_from_image(filepath):
    client = Groq(api_key=os.environ.get('GROQ_API_KEY'))

    # Read the image as bytes and convert to base64 so it can be sent inline as a data URL
    with open(filepath, 'rb') as f:
        image_data = base64.b64encode(f.read()).decode('utf-8')

        ext = filepath.rsplit('.', 1)[1].lower()
        media_type = f"image/{'jpeg' if ext in ['jpg', 'jpeg'] else ext}"

        # Call the model with an image + instruction to extract all text
        response = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": { "url": f"data: {media_type};base64,{image_data}" }
                    },
                    {
                        "type": "text",
                        "text": "Extract and transcribe all text from this image. Return only the raw text, nothing else."
                    }
                ]
            }],
            max_tokens=2000 # limit response size
        )

        # Return the extracted text from the first choice
        return response.choices[0].message.content
    

# Generate a quiz (as JSON) from the extracted study text using an LLM    
def generate_quiz_from_text(text, num_questions=10):
    client = Groq(api_key=os.environ.get('GROQ_API_KEY'))

    # Prompt instructs the model to output ONLY valid JSON with a fixed schema
    # text[:4000] limits the study material to avoid overloading the model
    prompt = f"""You are an expert quiz generator for high school students.
                Based on the study material below, generate exactly 
                {num_questions} questions. In the same language of the document.

                Include a mix of:
                - 70% multiple choice questions (4 options each, 1 correct)
                - 30% true/false questions

                The field type can be mcq for Multiple Choice Question or tf for True/False
                Return ONLY a valid JSON object with this exact structure, no preamble:
                {{
                "title": "Brief title describing the topic",
                "questions": [
                    {{
                    "id": 1,
                    "type": "mcq",
                    "question": "Question text?",
                    "options": ["A", "B", "C", "D"],
                    "correct_answer": "A",
                    "explanation": "Why this is correct"
                    }}
                ]
                }}

                Study Material:
                {text[:4000]}"""
    
    # Ask the model to generate quiz JSON
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=3000,
        temperature=0.7
    )

    raw = response.choices[0].message.content.strip()

    # Strip the JSON markdown code, if present
    if '```json' in raw:
        raw = raw.split('```json')[1].split('```')[0].strip()
    elif '```' in raw:
        raw = raw.split('```')[1].split('```')[0].strip()

    # Parse JSON into Python dict
    return json.loads(raw)

    
# Generate a quiz from uploaded files
@quiz_bp.route('/generate', methods=['POST'])
@token_required
def generate_quiz(current_user_id):
    files = request.files.getlist('files')
    num_questions = int(request.form.get('num_questions', 10))

    if not files or len(files) == 0:
        return jsonify({'error': 'No files uploaded'}), 400

    for file in files:
        if not allowed_file(file.filename):
            return jsonify({'error': f'Invalid file type: {file.filename}'}), 400

    saved_paths = []

    try:
        all_text = ""
        for file in files:

            # Prefix filename with user ID to reduce collisions
            filename = f"user_{current_user_id}_{file.filename}"
            filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
            
            # Save file to disk temporarily
            file.save(filepath)
            saved_paths.append(filepath)
            ext = filename.rsplit('.', 1)[1].lower()

            if ext == 'pdf':
                text = extract_text_from_pdf(filepath)
            else:
                text = extract_text_from_image(filepath)

            # Append extracted text with a simple page separator
            all_text += f"\n\n--- Page {len(saved_paths)} ---\n\n{text}"

        if not all_text or len(all_text.strip()) < 50:
            return jsonify({'error': 'Could not extract enough text'}), 400

        source_type = 'pdf' if files[0].filename.endswith('.pdf') else 'image'
        quiz_data = generate_quiz_from_text(all_text, num_questions)

        # Save quiz in database
        conn = get_db()

        cursor = conn.execute(
            '''INSERT INTO quizzes
               (user_id, title, source_type, source_filename, questions)
               VALUES (?, ?, ?, ?, ?)''',
            (current_user_id, quiz_data['title'], source_type,
             files[0].filename, json.dumps(quiz_data['questions']))
        )

        quiz_id = cursor.lastrowid
        conn.commit()
        conn.close()

        return jsonify({
            'quiz_id': quiz_id,
            'title': quiz_data['title'],
            'questions': quiz_data['questions'],
            'total_questions': len(quiz_data['questions'])
        })

    except json.JSONDecodeError:
        return jsonify({'error': 'AI returned invalid response. Try again.'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        # Always delete temporary uploaded files, even if an error occurs
        for path in saved_paths:
            if os.path.exists(path):
                os.remove(path)


# Submit answers for a quiz and compute score/results
@quiz_bp.route('/submit', methods=['POST'])
@token_required
def submit_quiz(current_user_id):
    data = request.get_json() or {}
    quiz_id = data.get('quiz_id')
    user_answers = data.get('answers', {}) or {}

    if not quiz_id:
        return jsonify({'error': 'quiz_id is required'}), 400

    conn = get_db()

    quiz = conn.execute(
        'SELECT * FROM quizzes WHERE id = ? AND user_id = ?',
        (quiz_id, current_user_id)
    ).fetchone()

    if not quiz:
        conn.close()
        return jsonify({'error': 'Quiz not found'}), 404

    # Load quiz questions from JSON stored in DB
    questions = json.loads(quiz['questions'] or '[]')
    score = 0
    results = []

    for q in questions:
        q_id = str(q.get('id', ''))
        raw_user = user_answers.get(q_id, "")
        raw_correct = q.get('correct_answer') or q.get('answer') or q.get('correct') or ""

        user_norm = str(raw_user).strip().lower()
        correct_norm = str(raw_correct).strip().lower()

        is_correct = (user_norm == correct_norm)
        if is_correct:
            score += 1

        # Add result for this question
        results.append({
            'question_id': q.get('id'),
            'question': q.get('question', ''),
            'user_answer': raw_user,
            'correct_answer': raw_correct,
            'is_correct': is_correct,
            'explanation': q.get('explanation', '')
        })

    # Store attempt and results in the database
    conn.execute(
        '''INSERT INTO quiz_results
           (quiz_id, user_id, answers, score, total)
           VALUES (?, ?, ?, ?, ?)''',
        (quiz_id, current_user_id, json.dumps(user_answers),
         score, len(questions))
    )
    conn.commit()
    conn.close()

    # Return score + detailed results
    return jsonify({
        'score': score,
        'total': len(questions),
        'percentage': round((score / len(questions)) * 100) if len(questions) else 0,
        'results': results
    })


# List quiz history for the current user, including attempts and best score
@quiz_bp.route('/history', methods=['GET'])
@token_required
def quiz_history(current_user_id):
    conn = get_db()

    quizzes = conn.execute('''
        SELECT q.id, q.title, q.source_type, q.created_at,
               COUNT(qr.id) as attempts,
               MAX(qr.score) as best_score,
               q.questions
        FROM quizzes q
        LEFT JOIN quiz_results qr ON q.id = qr.quiz_id
        WHERE q.user_id = ?
        GROUP BY q.id
        ORDER BY q.created_at DESC
    ''', (current_user_id,)).fetchall()
    conn.close()

    # Response list and compute total_questions for each quiz
    result = []
    for q in quizzes:
        q_dict = dict(q)
        questions = json.loads(q_dict['questions'])
        q_dict['total_questions'] = len(questions)
        del q_dict['questions']
        result.append(q_dict)

    return jsonify({'quizzes': result})


# Return overall stats for the current user
@quiz_bp.route('/stats', methods=['GET'])
@token_required
def get_stats(current_user_id):
    conn = get_db()

    results = conn.execute(
        'SELECT * FROM quiz_results WHERE user_id = ? ORDER BY completed_at DESC',
        (current_user_id,)
    ).fetchall()
    conn.close()

    # If user has no attempts yet
    if not results:
        return jsonify({'message': 'No quiz attempts yet', 'stats': {}})

    total_score = 0
    total_questions = 0

    for r in results:
        total_score += r['score']
        total_questions += r['total']

    return jsonify({
        'stats': {
            'total_quizzes_taken': len(results),
            'average_score': round((total_score / total_questions) * 100),
        }
    })


# Get a specific quiz by ID
@quiz_bp.route('/<int:quiz_id>', methods=['GET'])
@token_required
def get_quiz(current_user_id, quiz_id):
    conn = get_db()

    quiz = conn.execute(
        'SELECT * FROM quizzes WHERE id = ? AND user_id = ?',
        (quiz_id, current_user_id)
    ).fetchone()
    conn.close()

    if not quiz:
        return jsonify({'error': 'Quiz not found'}), 404

    quiz_dict = dict(quiz)
    quiz_dict['questions'] = json.loads(quiz_dict['questions'])
    return jsonify(quiz_dict)


# Delete a quiz and all of its results
@quiz_bp.route('/<int:quiz_id>', methods=['DELETE'])
@token_required
def delete_quiz(current_user_id, quiz_id):
    conn = get_db()

    quiz = conn.execute(
        'SELECT * FROM quizzes WHERE id = ? AND user_id = ?',
        (quiz_id, current_user_id)
    ).fetchone()

    if not quiz:
        conn.close()
        return jsonify({'error': 'Quiz not found'}), 404

    # Delete all results for the quiz first, then delete the quiz itself
    conn.execute('DELETE FROM quiz_results WHERE quiz_id = ?', (quiz_id,))
    conn.execute('DELETE FROM quizzes WHERE id = ?', (quiz_id,))
    conn.commit()
    conn.close()

    return jsonify({'message': 'Quiz deleted successfully'})