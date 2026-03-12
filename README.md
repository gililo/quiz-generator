# Quiz Generator

**CS50 Final Project**  
**Author:** Gislaine Denigres  
**GitHub:** gililo  
**edX:** GislaineLilo  
**Location:** São Paulo, Brazil  
**Date:** 03/11/2026  

#### Video:  [Demo](https://www.youtube.com/watch?v=Hhw4kzhx4SQ)


## 📖 Description

Quiz Generator is a web application that helps students study more effectively using AI. The idea came from a real problem: as the mother of a high school student, I needed a way to quiz my son before his tests, especially on complex topics where I don't always know the right questions to ask.

With this app, students can take a photo of their handwritten study notes or a pdf file, upload it, and receive an AI-generated quiz based on the content of those notes. After completing the quiz, they can see their score and track their study history over time.


## 🚀 How It Works

1. **Upload** — The student uploads a photo of their study notes or a PDF file
2. **AI Processing** — The image or extracted PDF content is sent to the LLAMA via API, which reads it and generates quiz questions
3. **Quiz** — The student answers the questions directly in the browser
4. **Results** — The app shows the score and saves the session to the SQLite database
5. **History** — The student can revisit past quizzes and track their progress over time


## 🛠️ Technologies Used

| Layer | Technology |
|-------|-----------|
| Language | Python |
| Backend Framework | Flask |
| Frontend | React |
| AI Model | LLAMA (via API) |
| Database | SQLite |

## 📁 Project Structure

```
quiz-generator/
│
├── backend/                        # Python / Flask API
│   ├── uploads/
│   ├── .env
│   ├── .gitignore
│   ├── app.py                     
│   ├── auth.py                    
│   ├── database.py                
│   ├── quiz.py                    
│   ├── quiz_app.db                
│   └── requirements.txt           
│
└── frontend/                       # React application
    ├── public/
    ├── src/
    │   ├── context/
    │   ├── pages/                  # App pages (Home, Quiz, History, etc.)
    │   ├── styles/                 # CSS / styling files
    │   ├── App.js                  
    │   └── index.js                # React entry point
    ├── .gitignore
    ├── package.json
    └── package-lock.json
```
