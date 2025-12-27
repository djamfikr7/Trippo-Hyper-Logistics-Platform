import { createLogger as createSharedLogger } from '../../../shared/src/utils/logger';

export const logger = createSharedLogger('auth-service');

export function createLogger(name: string) {
    return createSharedLogger(name);
}
