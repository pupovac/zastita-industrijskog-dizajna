import { AiConfig, DEFAULT_AI_MODEL, DEFAULT_MAX_CALLS_PER_PROJECT_PER_DAY } from './ai-config';

describe('AiConfig', () => {
  it('is not configured without ANTHROPIC_API_KEY and uses the defaults', () => {
    const config = new AiConfig({});
    expect(config.configured).toBe(false);
    expect(config.model).toBe(DEFAULT_AI_MODEL);
    expect(config.maxCallsPerProjectPerDay).toBe(DEFAULT_MAX_CALLS_PER_PROJECT_PER_DAY);
    expect(config.publicStatus().notConfiguredMessage).toBe('AI provera nije konfigurisana.');
  });

  it('reads the environment and never exposes the key', () => {
    const config = new AiConfig({ ANTHROPIC_API_KEY: ' sk-test ', ANTHROPIC_MODEL: 'claude-sonnet-5-5', AI_MAX_CALLS_PER_PROJECT_PER_DAY: '7' });
    expect(config.configured).toBe(true);
    expect(config.model).toBe('claude-sonnet-5-5');
    expect(config.maxCallsPerProjectPerDay).toBe(7);
    expect(JSON.stringify(config)).not.toContain('sk-test');
  });

  it('ignores an invalid daily limit', () => {
    expect(new AiConfig({ AI_MAX_CALLS_PER_PROJECT_PER_DAY: '-3' }).maxCallsPerProjectPerDay).toBe(DEFAULT_MAX_CALLS_PER_PROJECT_PER_DAY);
  });
});
