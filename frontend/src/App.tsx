import { useEffect, useState } from 'react'
import { getTokenizers } from './api/api';


function App() {
  const [tokenizers, setTokenizers] = useState<any[]>();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>();

  useEffect(() => {

    async function loadTokenizers() {
      try {

        setLoading(true);

        const tokenizers = await getTokenizers();


        if (tokenizers) {
          setTokenizers(tokenizers);
        } else {
          setError("Failed to resolve tokenizer data.");
        }
        
      } catch (error: any) {
          console.error(error.message || "Faled to load tokenizer data")
      } finally {
        setLoading(false);
      }
  
    }

        loadTokenizers();

  }, []);

  if (loading) return <div>Loading tokenizers...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  return (
     <div style={{ padding: '20px' }}>
      <label htmlFor="options">Choose an option: </label>
      <select 
        id="options" 
      >
       {
          tokenizers?.map((t, idx) => (
            <>
              <option value={t} key={idx}>{t}</option>
            </>
          ))
       }
      </select>
    </div>
  );
}

export default App
