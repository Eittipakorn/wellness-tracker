import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { App } from './app';

describe('App', () => {
  it('should instantiate app component', () => {
    const app = new App();
    expect(app).toBeDefined();
  });

  it('should have title signal', () => {
    const app = new App() as any;
    expect(app.title()).toBe('wellness-tracker');
  });
});
