<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1-yZZYxhtgZRmQXxbjUKQWCrXDVGu_Qmz

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Testing

This project uses Jest as the testing framework with TypeScript support.

### Available Test Commands

- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

### Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (reruns tests when files change)
npm run test:watch

# Generate test coverage report
npm run test:coverage
```

### Test Structure

Tests are organized in the `__tests__` directory and follow the naming convention `*.test.ts` or `*.spec.ts`. The test setup includes:

- **Unit tests** for validation schemas, type interfaces, and utility functions
- **Coverage reporting** with HTML and console output
- **TypeScript support** with ts-jest
- **ES Module support** for modern JavaScript features

### Writing Tests

Example test file structure:
```typescript
import { functionToTest } from '../path/to/module';

describe('Function or Module Name', () => {
  it('should do something expected', () => {
    const result = functionToTest('input');
    expect(result).toBe('expected output');
  });
});
```
