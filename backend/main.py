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
def create_question(q: QuestionCreate, db: Session = Depends(get_db)):
    if not q.message.strip():
        raise HTTPException(status_code=400, detail="Question cannot be blank.")
    question = Question(message=q.message.strip())
    db.add(question)
    db.commit()
    db.refresh(question)
    # Broadcast to WS clients
    import asyncio
    from fastapi.encoders import jsonable_encoder
    loop = asyncio.get_event_loop()
    question_dict = jsonable_encoder(question)
    if ws_clients:
        loop.create_task(broadcast_question(question_dict))
    return question

# GET /questions: Fetch all questions
@app.get("/questions", response_model=list[QuestionOut])
def get_questions(db: Session = Depends(get_db)):
    questions = db.query(Question).order_by(Question.timestamp.desc()).all()
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