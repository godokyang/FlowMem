export function codeTokenize(text: string): string[] {
  const tokens = new Set<string>();
  
  const rawTokens = text.split(/[^a-zA-Z0-9_]+/);
  
  for (const token of rawTokens) {
    if (!token || token.length < 2) continue;
    
    tokens.add(token.toLowerCase());
    
    if (token.includes('_')) {
      const parts = token.split('_');
      for (const part of parts) {
        if (part.length > 1) tokens.add(part.toLowerCase());
      }
    }
    
    const camelParts = token.replace(/([a-z])([A-Z])/g, '$1 $2')
                            .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
                            .split(' ');
    
    if (camelParts.length > 1) {
      for (const part of camelParts) {
        if (part.length > 1) tokens.add(part.toLowerCase());
      }
    }
  }
  
  return Array.from(tokens);
}
