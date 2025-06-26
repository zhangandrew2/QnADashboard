from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Enum, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
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

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)  # Plain text for now
    questions = relationship("Question", back_populates="user")
    replies = relationship("Reply", back_populates="user")

class Question(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True, index=True)
    message = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.now)
    status = Column(Enum(QuestionStatus), default=QuestionStatus.pending)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Can be null for guest users
    user = relationship("User", back_populates="questions")
    replies = relationship("Reply", back_populates="question", cascade="all, delete-orphan")

class Reply(Base):
    __tablename__ = "replies"
    id = Column(Integer, primary_key=True, index=True)
    message = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.now)
    question_id = Column(Integer, ForeignKey("questions.id"))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Can be null for guest users
    question = relationship("Question", back_populates="replies")
    user = relationship("User", back_populates="replies")

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
from typing import Optional, List

class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username_or_email: str
    password: str

class QuestionCreate(BaseModel):
    message: str

class ReplyCreate(BaseModel):
    message: str

class ReplyOut(BaseModel):
    id: int
    message: str
    timestamp: datetime
    user_id: Optional[int] = None
    class Config:
        orm_mode = True

class QuestionOut(BaseModel):
    id: int
    message: str
    timestamp: datetime
    status: QuestionStatus
    user_id: Optional[int] = None
    replies: List[ReplyOut] = []
    class Config:
        orm_mode = True

# Authentication endpoints
@app.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(
        (User.username == user.username) | (User.email == user.email)
    ).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already registered")
    
    # Create new user (plain text password for now)
    db_user = User(username=user.username, email=user.email, password=user.password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return {"message": "User registered successfully", "user_id": db_user.id}

@app.post("/login")
def login(user_creds: UserLogin, db: Session = Depends(get_db)):
    # Find user by username or email
    user = db.query(User).filter(
        (User.username == user_creds.username_or_email) | (User.email == user_creds.username_or_email)
    ).first()
    
    if not user or user.password != user_creds.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return {"message": "Login successful", "user_id": user.id, "username": user.username}

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
    print(f"Broadcasting new question: {question_dict}") 
    if ws_clients:
        await broadcast_question(question_dict)
    return question

# POST /questions/{id}/replies: Add a reply to a question
@app.post("/questions/{question_id}/replies", response_model=ReplyOut)
async def add_reply(question_id: int, reply: ReplyCreate, db: Session = Depends(get_db)):
    if not reply.message.strip():
        raise HTTPException(status_code=400, detail="Reply cannot be blank.")
    
    # Check if question exists
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found.")
    
    new_reply = Reply(message=reply.message.strip(), question_id=question_id)
    db.add(new_reply)
    db.commit()
    db.refresh(new_reply)
    
    # Refresh the question to get updated replies
    db.refresh(question)
    
    # Broadcast the updated question with replies
    from fastapi.encoders import jsonable_encoder
    question_dict = jsonable_encoder(question)
    question_dict['replies'] = [jsonable_encoder(r) for r in question.replies]
    print(f"Broadcasting updated question with reply: {question_dict}") 
    if ws_clients:
        await broadcast_question(question_dict)
    
    return new_reply

# PUT /questions/{id}/status: Update question status (logged in users only)
@app.put("/questions/{question_id}/status")
async def update_question_status(question_id: int, status: QuestionStatus, db: Session = Depends(get_db)):
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found.")
    question.status = status
    db.commit()
    db.refresh(question)
    # Broadcast the updated question
    from fastapi.encoders import jsonable_encoder
    question_dict = jsonable_encoder(question)
    question_dict['replies'] = [jsonable_encoder(r) for r in question.replies]
    print(f"Broadcasting updated question: {question_dict}") 
    if ws_clients:
        await broadcast_question(question_dict)
    return question

# Modified GET /questions: Fetch all questions with proper sorting and replies
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