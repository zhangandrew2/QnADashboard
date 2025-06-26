import { useState } from 'react';

export default function Forum() {
  const [question, setQuestion] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!question.trim()) {
      setError('Question cannot be blank.');
      return;
    }
    setError('');
    // TODO: Submit question to backend
    setQuestion('');
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <h2>Q&A Forum</h2>
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
        <div style={{ color: '#888' }}>[Questions will appear here]</div>
      </div>
    </div>
  );
}
