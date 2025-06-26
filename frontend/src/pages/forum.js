import { useEffect, useState, useRef } from 'react';

export default function Forum() {
  const [question, setQuestion] = useState('');
  const [error, setError] = useState('');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [replyText, setReplyText] = useState({});
  const wsRef = useRef(null);

  // Check if user is logged in on mount
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      setCurrentUser(JSON.parse(user));
      setIsLoggedIn(true);
    }
  }, []);

  // Sort questions: Escalated first, then Pending, then Answered, each sorted by timestamp
  const sortQuestions = (questionsList) => {
    const statusOrder = { "Escalated": 0, "Pending": 1, "Answered": 2 };
    return [...questionsList].sort((a, b) => {
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
  };

  // Fetch questions on mount
  useEffect(() => {
    fetch('http://localhost:8000/questions')
      .then(res => res.json())
      .then(data => {
        setQuestions(sortQuestions(data));
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load questions.');
        setLoading(false);
      });
  }, []);

  // Connect to WebSocket for real-time updates
  useEffect(() => {
    let ws = null;
    let retryCount = 0;
    const maxRetries = 3;

    const connectWebSocket = () => {
      try {
        ws = new window.WebSocket('ws://localhost:8000/ws/questions');
        wsRef.current = ws;
        
        ws.onopen = () => {
          console.log('WebSocket connected successfully');
          retryCount = 0; // Reset retry count on successful connection
        };

        ws.onmessage = (event) => {
          try {
            const updatedQuestion = JSON.parse(event.data);
            console.log('WebSocket received:', updatedQuestion);
            console.log('Replies in updated question:', updatedQuestion.replies);
            setQuestions(prev => {
              const existingIndex = prev.findIndex(q => q.id === updatedQuestion.id);
              if (existingIndex >= 0) {
                console.log('Updating existing question:', updatedQuestion.id);
                console.log('Previous replies:', prev[existingIndex].replies);
                console.log('New replies:', updatedQuestion.replies);
                const newQuestions = [...prev];
                newQuestions[existingIndex] = updatedQuestion;
                return sortQuestions(newQuestions);
              } else {
                console.log('Adding new question via WebSocket:', updatedQuestion.id);
                const alreadyExists = prev.some(q => q.id === updatedQuestion.id);
                if (!alreadyExists) {
                  return sortQuestions([updatedQuestion, ...prev]);
                }
                return prev;
              }
            });
          } catch (e) {
            console.error('WebSocket parse error:', e);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          // Don't show error to user immediately, try to reconnect
        };

        ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`Attempting to reconnect (${retryCount}/${maxRetries})...`);
            setTimeout(connectWebSocket, 1000 * retryCount); // Exponential backoff
          } else {
            console.log('Max retry attempts reached');
            setError('Real-time connection lost. Please refresh the page.');
          }
        };

      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(connectWebSocket, 1000 * retryCount);
        }
      }
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  // Submit a new question
  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!question.trim()) {
      setError('Question cannot be blank.');
      return;
    }
    
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'http://localhost:8000/questions');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function () {
      if (xhr.status === 200) {
        try {
          const newQuestion = JSON.parse(xhr.responseText);
          console.log('Question submitted successfully:', newQuestion);
          setQuestions(prev => sortQuestions([newQuestion, ...prev]));
          setQuestion('');
        } catch (e) {
          console.error('Error parsing response:', e);
          setError('Error processing response.');
        }
      } else {
        setError(xhr.responseText || 'Failed to submit question.');
      }
    };
    xhr.onerror = function () {
      setError('Network error.');
    };
    xhr.send(JSON.stringify({ message: question }));
  };

  // Add reply to a question
  const handleReply = (questionId) => {
    const replyMessage = replyText[questionId];
    if (!replyMessage || !replyMessage.trim()) {
      setError('Reply cannot be blank.');
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `http://localhost:8000/questions/${questionId}/replies`);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function () {
      if (xhr.status === 200) {
        setReplyText(prev => ({ ...prev, [questionId]: '' }));
        setError('');
      } else {
        setError(xhr.responseText || 'Failed to submit reply.');
      }
    };
    xhr.onerror = function () {
      setError('Network error.');
    };
    xhr.send(JSON.stringify({ message: replyMessage }));
  };

  // Update question status (logged in users only)
  const updateStatus = (questionId, newStatus) => {
    if (!isLoggedIn) return;
    
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', `http://localhost:8000/questions/${questionId}/status?status=${newStatus}`);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function () {
      if (xhr.status !== 200) {
        setError(xhr.responseText || 'Failed to update status.');
      }
    };
    xhr.onerror = function () {
      setError('Network error.');
    };
    xhr.send();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Escalated': return '#ff4444'; // Red
      case 'Pending': return '#ffaa00'; // Yellow
      case 'Answered': return '#44aa44'; // Green
      default: return '#666';
    }
  };

  const getStatusBackground = (status) => {
    switch (status) {
      case 'Escalated': return '#fff5f5';
      case 'Pending': return '#fffbf0';
      case 'Answered': return '#f0fff0';
      default: return '#fff';
    }
  };

  return (
    <div style={{ 
      maxWidth: 900, 
      margin: '0 auto', 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f8f9fa'
    }}>
      {/* Header with gradient background */}
      <div style={{
        background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
        borderRadius: '16px',
        padding: '30px',
        marginBottom: '30px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
        color: 'white'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{ 
              fontSize: '3rem', 
              fontWeight: '800', 
              margin: '0',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
              letterSpacing: '-1px'
            }}>
              Q&A Forum
            </h1>
            <p style={{
              fontSize: '1.1rem',
              margin: '8px 0 0 0',
              opacity: '0.9',
              fontWeight: '300'
            }}>
              Ask questions, get answers, stay connected
            </p>
          </div>
          
          <div style={{ textAlign: 'right' }}>
            {isLoggedIn ? (
              <div>
                <div style={{ 
                  fontSize: '1.2rem', 
                  fontWeight: '600',
                  marginBottom: '12px',
                  textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                }}>
                  Welcome, {currentUser?.username}! 👋
                </div>
                <button 
                  onClick={() => {
                    localStorage.removeItem('user');
                    setIsLoggedIn(false);
                    setCurrentUser(null);
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderRadius: '25px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = 'rgba(255,255,255,0.3)';
                    e.target.style.transform = 'translateY(-2px)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = 'rgba(255,255,255,0.2)';
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  Logout
                </button>
              </div>
            ) : (
              <div>
                <div style={{ 
                  fontSize: '1.2rem', 
                  fontWeight: '600',
                  marginBottom: '12px',
                  textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                }}>
                  Guest User
                </div>
                <div style={{
                  fontSize: '0.9rem',
                  opacity: '0.8',
                  fontStyle: 'italic'
                }}>
                  Sign in for admin features
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} style={{ 
        marginBottom: 30,
        background: 'white',
        padding: '25px',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        border: '1px solid #e9ecef'
      }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            placeholder="What's your question?"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            style={{ 
              flex: 1, 
              padding: '16px 20px', 
              fontSize: '16px',
              border: '2px solid #e9ecef',
              borderRadius: '10px',
              outline: 'none',
              color: '#fff',
              backgroundColor: '#495057',
              transition: 'all 0.3s ease',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#2c3e50';
              e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.1), 0 0 0 3px rgba(44, 62, 80, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e9ecef';
              e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.1)';
            }}
          />
          <button 
            type="submit"
            style={{
              padding: '16px 28px',
              background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(44, 62, 80, 0.3)'
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 20px rgba(44, 62, 80, 0.4)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 15px rgba(44, 62, 80, 0.3)';
            }}
          >
            Ask Question
          </button>
        </div>
      </form>
      
      {error && (
        <div style={{ 
          color: '#ff4444', 
          marginBottom: 20, 
          padding: '12px', 
          backgroundColor: '#fff5f5', 
          border: '1px solid #ff4444',
          borderRadius: '6px'
        }}>
          {error}
        </div>
      )}
      
      <div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#333', marginBottom: 20 }}>Questions</h2>
        {loading ? (
          <div style={{ fontSize: '1.2rem', color: '#666', textAlign: 'center', padding: '40px' }}>
            Loading questions...
          </div>
        ) : questions.length === 0 ? (
          <div style={{ fontSize: '1.2rem', color: '#888', textAlign: 'center', padding: '40px' }}>
            No questions yet. Be the first to ask!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {questions.map(q => (
              <div key={q.id} style={{ 
                border: '2px solid #eee', 
                borderRadius: '12px',
                backgroundColor: getStatusBackground(q.status),
                overflow: 'hidden'
              }}>
                <div style={{ padding: '20px' }}>
                  <div style={{ 
                    fontSize: '1.3rem', 
                    fontWeight: 'bold', 
                    marginBottom: '12px',
                    color: '#333',
                    lineHeight: '1.4'
                  }}>
                    {q.message}
                  </div>
                  <div style={{ 
                    fontSize: '14px', 
                    color: '#666', 
                    marginBottom: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>
                      {new Date(q.timestamp).toLocaleString()} &mdash; 
                      <span style={{ 
                        color: getStatusColor(q.status), 
                        fontWeight: 'bold',
                        marginLeft: '8px',
                        fontSize: '16px'
                      }}>
                        {q.status}
                      </span>
                    </span>
                    {isLoggedIn && q.status !== 'Answered' && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => updateStatus(q.id, 'Escalated')}
                          style={{ 
                            padding: '6px 12px', 
                            fontSize: '12px',
                            backgroundColor: '#ff4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          Escalate
                        </button>
                        <button 
                          onClick={() => updateStatus(q.id, 'Answered')}
                          style={{ 
                            padding: '6px 12px', 
                            fontSize: '12px',
                            backgroundColor: '#44aa44',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          Mark Answered
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Replies Section */}
                  {q.replies && q.replies.length > 0 && (
                    <div style={{ 
                      marginTop: '20px',
                      paddingTop: '16px',
                      borderTop: '1px solid #eee'
                    }}>
                      <h4 style={{ 
                        fontSize: '1rem', 
                        fontWeight: 'bold', 
                        color: '#666', 
                        marginBottom: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Replies ({q.replies.length})
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {q.replies.map(reply => (
                          <div key={reply.id} style={{
                            padding: '12px 16px',
                            backgroundColor: 'white',
                            border: '1px solid #e0e0e0',
                            borderRadius: '8px',
                            marginLeft: '20px',
                            position: 'relative'
                          }}>
                            <div style={{ 
                              fontSize: '0.95rem', 
                              color: '#333', 
                              marginBottom: '6px',
                              lineHeight: '1.4'
                            }}>
                              {reply.message}
                            </div>
                            <div style={{ 
                              fontSize: '11px', 
                              color: '#888',
                              fontStyle: 'italic'
                            }}>
                              {new Date(reply.timestamp).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Reply Form */}
                  <div style={{ 
                    marginTop: '16px',
                    paddingTop: '16px',
                    borderTop: '1px solid #eee'
                  }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        type="text"
                        placeholder="Add a reply to this question..."
                        value={replyText[q.id] || ''}
                        onChange={e => setReplyText(prev => ({ ...prev, [q.id]: e.target.value }))}
                        style={{ 
                          flex: 1, 
                          padding: '10px 12px', 
                          fontSize: '14px',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          outline: 'none',
                          backgroundColor: '#fafafa',
                          color: '#000'
                        }}
                      />
                      <button 
                        onClick={() => handleReply(q.id)}
                        style={{
                          padding: '10px 16px',
                          backgroundColor: '#44aa44',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 'bold'
                        }}
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}