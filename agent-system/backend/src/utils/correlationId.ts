import { nanoid } from 'nanoid';

export function generateCorrelationId(): string {
  return nanoid(21);
}
