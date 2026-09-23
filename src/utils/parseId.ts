import { BadRequestError } from '../errors/HttpError';

export function parseId(raw: string | string[], entityName = 'resource'): number {
  // Если пришел массив — это невалидный id
  if (Array.isArray(raw)) {
    throw new BadRequestError(`Invalid ${entityName} id`);
  }

  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new BadRequestError(`Invalid ${entityName} id`);
  }
  return id;
}