import { ZodError } from 'zod';
import { ApiError } from '../utils/helpers.js';

/**
 * Validation middleware factory
 * @param {object} schema - Zod schema to validate against
 * @param {string} source - Where to get data from ('body', 'query', 'params')
 */
export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const data = req[source];
      const validated = schema.parse(data);
      req[source] = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.errors.map((e) => {
          const path = e.path.join('.');
          return path ? `${path}: ${e.message}` : e.message;
        });
        return next(new ApiError(messages.join('. '), 400));
      }
      next(error);
    }
  };
};

export default validate;
