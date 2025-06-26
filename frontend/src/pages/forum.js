import { useEffect, useState, useRef } from 'react';

export default function Forum() {
  const [question, setQuestion] = useState('');
  const [error, setError] = useState('');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const wsRef = useRef(null);

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
    const ws = new window.WebSocket('ws://localhost:8000/ws/questions');
    wsRef.current = ws;
    ws.onmessage = (event) => {
      try {
        const updatedQuestion = JSON.parse(event.data);
        console.log('WebSocket received:', updatedQuestion); // Debug log
        setQuestions(prev => {
          // Update existing question or add new one
          const existingIndex = prev.findIndex(q => q.id === updatedQuestion.id);
          if (existingIndex >= 0) {
            console.log('Updating existing question:', updatedQuestion.id); // Debug log
            const newQuestions = [...prev];
            newQuestions[existingIndex] = updatedQuestion;
            return sortQuestions(newQuestions);
          } else {
            console.log('Adding new question via WebSocket:', updatedQuestion.id); // Debug log
            // Only add if it doesn't already exist (to prevent duplicates)
            const alreadyExists = prev.some(q => q.id === updatedQuestion.id);
            if (!alreadyExists) {
              return sortQuestions([updatedQuestion, ...prev]);
            }
            return prev; // Don't add if it already exists
          }
        });
      } catch (e) {
        console.error('WebSocket parse error:', e); // Debug log
      }
    };
    ws.onerror = () => setError('WebSocket error.');
    return () => ws.close();
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
          // Add the new question to the list immediately
          setQuestions(prev => sortQuestions([newQuestion, ...prev]));
          setQuestion(''); // Clear the input
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

  // Update question status (admin only)
  const updateStatus = (questionId, newStatus) => {
    if (!isAdmin) return;
    
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', `http://localhost:8000/questions/${questionId}/status?status=${newStatus}&admin=true`);
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
      case 'Escalated': return '#ff6b6b';
      case 'Pending': return '#feca57';
      case 'Answered': return '#48dbfb';
      default: return '#666';
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>Q&A Forum</h2>
        <label>
          <input
            type="checkbox"
            checked={isAdmin}
            onChange={(e) => setIsAdmin(e.target.checked)}
          />
          Admin Mode
        </label>
      </div>
      
      <form onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
        <input
          type="text"
          placeholder="Type your question..."
          value={question}
          onChange={e => setQuestion(e.target.value)}
          style={{ width: '80%', padding: 8, marginRight: 8 }}
        />
        <button type="submit">Submit</button>
      </form>
      
      {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}
      
      <div>
        <h3>Questions</h3>
        {loading ? (
          <div>Loading...</div>
        ) : questions.length === 0 ? (
          <div style={{ color: '#888' }}>No questions yet.</div>
        ) : (
          <div>
            {questions.map(q => (
              <div key={q.id} style={{ 
                border: '1px solid #eee', 
                marginBottom: 12, 
                padding: 16, 
                borderRadius: 8,
                backgroundColor: q.status === 'Escalated' ? '#fff5f5' : 
                               q.status === 'Answered' ? '#f0f9ff' : '#fff'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: 8 }}>{q.message}</div>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
                  {new Date(q.timestamp).toLocaleString()} &mdash; 
                  <span style={{ 
                    color: getStatusColor(q.status), 
                    fontWeight: 'bold',
                    marginLeft: 4
                  }}>
                    {q.status}
                  </span>
                </div>
                {isAdmin && q.status !== 'Answered' && (
                  <div style={{ marginTop: 8 }}>
                    <button 
                      onClick={() => updateStatus(q.id, 'Escalated')}
                      style={{ 
                        marginRight: 8, 
                        padding: '4px 8px', 
                        fontSize: 12,
                        backgroundColor: '#ff6b6b',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer'
                      }}
                    >
                      Escalate
                    </button>
                    <button 
                      onClick={() => updateStatus(q.id, 'Answered')}
                      style={{ 
                        padding: '4px 8px', 
                        fontSize: 12,
                        backgroundColor: '#48dbfb',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer'
                      }}
                    >
                      Mark Answered
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}