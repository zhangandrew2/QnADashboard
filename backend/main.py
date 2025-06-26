from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from datetime import datetime
import enum

# Database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./questions.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Enum for question status
class QuestionStatus(str, enum.Enum):
    pending = "Pending"
    escalated = "Escalated"
    answered = "Answered"

# Question model
class Question(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True, index=True)
    message = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    status = Column(Enum(QuestionStatus), default=QuestionStatus.pending)

# Create tables
Base.metadata.create_all(bind=engine)

# FastAPI app
app = FastAPI()

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic schemas
from pydantic import BaseModel
class QuestionCreate(BaseModel):
    message: str

class QuestionOut(BaseModel):
    id: int
    message: str
    timestamp: datetime
    status: QuestionStatus
    class Config:
        orm_mode = True

# POST /questions: Submit a question
@app.post("/questions", response_model=QuestionOut)
def create_question(q: QuestionCreate, db: Session = Depends(get_db)):
    if not q.message.strip():
        raise HTTPException(status_code=400, detail="Question cannot be blank.")
    question = Question(message=q.message.strip())
    db.add(question)
    db.commit()
    db.refresh(question)
    return question

# GET /questions: Fetch all questions
@app.get("/questions", response_model=list[QuestionOut])
def get_questions(db: Session = Depends(get_db)):
    questions = db.query(Question).order_by(Question.timestamp.desc()).all()
    return questions 