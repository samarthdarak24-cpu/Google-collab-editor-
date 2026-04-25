/**
 * Integration Tests for Backend API and Services
 */

const DocumentEngine = require('../services/DocumentEngine');

// Skip API tests for now - focus on service layer
describe.skip('Authentication API', () => {});

describe.skip('Document API', () => {});

describe('DocumentEngine Service', () => {
  let engine;

  beforeEach(() => {
    engine = new DocumentEngine('test-doc', 'Hello world');
  });

  test('applyEdit - insert operation', () => {
    const result = engine.applyEdit({
      userId: 'user1',
      type: 'insert',
      start: 6,
      text: 'beautiful ',
      timestamp: Date.now()
    });
    
    expect(result.success).toBe(true);
    expect(engine.content).toContain('beautiful');
  });

  test('applyEdit - delete operation', () => {
    const result = engine.applyEdit({
      userId: 'user1',
      type: 'delete',
      start: 0,
      end: 6,
      timestamp: Date.now()
    });
    
    expect(result.success).toBe(true);
    expect(engine.content).toBe('world');
  });

  test('autocomplete - returns suggestions', () => {
    engine.content = 'hello help helicopter';
    engine._indexContent(engine.content);
    const results = engine.autocomplete('hel');
    expect(results.length).toBeGreaterThan(0);
  });

  test('searchText - finds pattern', () => {
    const results = engine.searchText('world');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].position).toBeGreaterThanOrEqual(0);
  });

  test('compress and decompress - roundtrip', () => {
    const compressed = engine.compress();
    expect(compressed).not.toBeNull();
    const decompressed = engine.decompress(compressed.bytes, compressed.bitLength);
    expect(decompressed).toBe(engine.content);
  });

  test('getStats - returns engine statistics', () => {
    const stats = engine.getStats();
    expect(stats).toHaveProperty('docId', 'test-doc');
    expect(stats).toHaveProperty('contentLength');
    expect(stats).toHaveProperty('currentVersion');
  });
});

describe.skip('Health Check', () => {});
