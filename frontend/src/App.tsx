import { useEffect, useState } from 'react'
import { getMetrics, getTokenizers } from './api/api';

type MetricValues = Record<string, number>;

type MetricsResponse = {
  model_id: string;
  efficiency: Record<string, MetricValues>;
  linguistic: Record<string, MetricValues>;
};

function App() {
  const [tokenizers, setTokenizers] = useState<string[]>([]);
  const [selectedTokenizer, setSelectedTokenizer] = useState('');
  const [customTokenizer, setCustomTokenizer] = useState('');
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {

    async function loadTokenizers() {
      try {

        setLoading(true);

        const availableTokenizers = await getTokenizers() as string[];

        if (availableTokenizers?.length) {
          setTokenizers(availableTokenizers);
          setSelectedTokenizer(availableTokenizers[0]);
        } else {
          setError("Failed to resolve tokenizer data.");
        }
        
      } catch (error: any) {
          setError(error.message || "Failed to load tokenizer data.");
      } finally {
        setLoading(false);
      }
  
    }

        loadTokenizers();

  }, []);

  async function handleGetMetrics(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const modelId = selectedTokenizer === 'custom'
      ? customTokenizer.trim()
      : selectedTokenizer;

    if (!modelId) {
      setError('Enter a tokenizer name before requesting metrics.');
      return;
    }

    try {
      setError(null);
      setMetrics(null);
      setMetricsLoading(true);
      setMetrics(await getMetrics(modelId));
    } catch (error: any) {
      setError(error.message || 'Failed to load metrics.');
    } finally {
      setMetricsLoading(false);
    }
  }

  function renderMetricTable(title: string, values: Record<string, MetricValues>) {
    return (
      <section>
        <h2>{title}</h2>
        <table>
          <thead>
            <tr>
              <th>Language</th>
              {Object.keys(Object.values(values)[0] || {}).map((metric) => (
                <th key={metric}>{metric.replaceAll('_', ' ')}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(values).map(([language, languageMetrics]) => (
              <tr key={language}>
                <th scope="row">{language}</th>
                {Object.values(languageMetrics).map((value, index) => (
                  <td key={`${language}-${index}`}>{value}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    );
  }

  if (loading) return <div>Loading tokenizers...</div>;

  return (
    <main className="app-shell">
      <header>
        <p className="eyebrow">Tokenizer laboratory</p>
        <h1>Compare tokenizer metrics</h1>
        <p>Select a downloaded tokenizer or enter any model name available to the backend.</p>
      </header>

      <form className="tokenizer-form" onSubmit={handleGetMetrics}>
        <label htmlFor="tokenizer">Tokenizer</label>
        <select
          id="tokenizer"
          value={selectedTokenizer}
          onChange={(event) => setSelectedTokenizer(event.target.value)}
        >
          {tokenizers.map((tokenizer) => (
            <option value={tokenizer} key={tokenizer}>{tokenizer}</option>
          ))}
          <option value="custom">Enter a custom tokenizer...</option>
        </select>

        {selectedTokenizer === 'custom' && (
          <input
            type="text"
            value={customTokenizer}
            onChange={(event) => setCustomTokenizer(event.target.value)}
            placeholder="e.g. google-bert/bert-base-uncased"
            aria-label="Custom tokenizer name"
          />
        )}

        <button type="submit" disabled={metricsLoading}>
          {metricsLoading ? 'Loading metrics...' : 'Get metrics'}
        </button>
      </form>

      {error && <p className="error" role="alert">{error}</p>}

      {metrics && (
        <div className="metrics-results">
          <h2>Results for <code>{metrics.model_id}</code></h2>
          {renderMetricTable('Efficiency', metrics.efficiency)}
          {renderMetricTable('Linguistic quality', metrics.linguistic)}
        </div>
      )}

    </main>
  );
}

export default App
