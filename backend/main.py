from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from datetime import datetime
import enum
import json

# Database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./questions.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class QuestionStatus(str, enum.Enum):
    pending = "Pending"
    escalated = "Escalated"
    answered = "Answered"

class Question(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True, index=True)
    message = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.now)
    status = Column(Enum(QuestionStatus), default=QuestionStatus.pending)

Base.metadata.create_all(bind=engine)

app = FastAPI()

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# connected WebSocket clients
ws_clients = []

# broadcast to all clients
async def broadcast_question(question_dict):
    data = json.dumps(question_dict, default=str)
    for ws in ws_clients[:]:
        try:
            await ws.send_text(data)
        except Exception:
            ws_clients.remove(ws)

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
async def create_question(q: QuestionCreate, db: Session = Depends(get_db)):
    if not q.message.strip():
        raise HTTPException(status_code=400, detail="Question cannot be blank.")
    question = Question(message=q.message.strip())
    db.add(question)
    db.commit()
    db.refresh(question)
    # Broadcast to WS clients
    from fastapi.encoders import jsonable_encoder
    question_dict = jsonable_encoder(question)
    print(f"Broadcasting new question: {question_dict}")  # Debug print
    if ws_clients:
        await broadcast_question(question_dict)
    return question

# PUT /questions/{id}/status: Update question status (admins only)
@app.put("/questions/{question_id}/status")
async def update_question_status(question_id: int, status: QuestionStatus, admin: bool = False, db: Session = Depends(get_db)):
    if not admin:
        raise HTTPException(status_code=403, detail="Admin access required.")
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found.")
    question.status = status
    db.commit()
    db.refresh(question)
    # Broadcast the updated question
    from fastapi.encoders import jsonable_encoder
    question_dict = jsonable_encoder(question)
    print(f"Broadcasting updated question: {question_dict}")  # Debug print
    if ws_clients:
        await broadcast_question(question_dict)
    return question

# Modified GET /questions: Fetch all questions with proper sorting
@app.get("/questions", response_model=list[QuestionOut])
def get_questions(db: Session = Depends(get_db)):
    # Get all questions and sort them
    questions = db.query(Question).all()
    
    # Sort: Escalated first, then Pending, then Answered, each sorted by timestamp (newest first)
    def sort_key(q):
        status_order = {"Escalated": 0, "Pending": 1, "Answered": 2}
        return (status_order[q.status], -q.timestamp.timestamp())
    
    questions.sort(key=sort_key)
    return questions

# WebSocket endpoint
@app.websocket("/ws/questions")
async def websocket_questions(websocket: WebSocket):
    await websocket.accept()
    ws_clients.append(websocket)
    try:
        while True:
            await websocket.receive_text()  # Keep connection alive, ignore input
    except WebSocketDisconnect:
        ws_clients.remove(websocket) 