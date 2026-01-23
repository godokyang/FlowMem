import { FileInterceptor } from '../../src/interceptor/file-interceptor';
import { WriteRequest, ProtectedFileConfig } from '../../src/interceptor/types';

describe('FileInterceptor', () => {
  let interceptor: FileInterceptor;
  const mockConfig: ProtectedFileConfig = {
    paths: ['package.json', 'tsconfig.json'],
    patterns: ['src/core/**/*.ts'],
    highRiskPaths: ['.env']
  };

  beforeEach(() => {
    interceptor = new FileInterceptor(mockConfig);
  });

  it('should block protected files', async () => {
    const request: WriteRequest = {
      filePath: 'package.json',
      content: '{}',
      operation: 'modify',
      source: { type: 'agent', timestamp: new Date() }
    };

    const result = await interceptor.checkWrite(request);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('受保护列表中');
  });

  it('should allow unprotected files', async () => {
    const request: WriteRequest = {
      filePath: 'src/components/Button.tsx',
      content: '',
      operation: 'create',
      source: { type: 'agent', timestamp: new Date() }
    };

    const result = await interceptor.checkWrite(request);
    expect(result.allowed).toBe(true);
  });

  it('should require confirmation for high risk files', async () => {
    const request: WriteRequest = {
      filePath: '.env',
      content: '',
      operation: 'modify',
      source: { type: 'agent', timestamp: new Date() }
    };

    const result = await interceptor.checkWrite(request);
    expect(result.requiresConfirmation).toBe(true);
  });
});
