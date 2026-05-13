import { defineFunction } from '@aws-amplify/backend';

export const calculatorApi = defineFunction({
  name: 'calculator-api',
  entry: './handler.ts',
  runtime: 20,
  timeoutSeconds: 30,
  memoryMB: 256,
});
