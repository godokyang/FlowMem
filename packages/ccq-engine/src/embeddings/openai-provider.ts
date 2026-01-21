// OpenAI Embeddings Provider
export class OpenAIProvider {
  public readonly dim = 1536;
  private apiKey: string;
  private baseUrl: string;

  constructor(config: { apiKey: string; baseUrl?: string }) {
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || '';
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  }

  async embed(texts: string[]): Promise<number[][]> {
    const response = await fetch(\`\${this.baseUrl}/embeddings\`, {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${this.apiKey}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: texts,
        model: 'text-embedding-3-small'
      })
    });

    if (!response.ok) {
      throw new Error(\`OpenAI API error: \${response.statusText}\`);
    }

    const data = await response.json();
    return data.data.map((d: any) => d.embedding);
  }
}
