import { bootstrapService, resolveServiceTarget } from '@ethio-connect/e2e-support';

module.exports = async function () {
  await bootstrapService({
    target: resolveServiceTarget({ defaultPort: 4002 }),
    startupRetryAttempts: 3,
    startupRetryDelayMs: 300,
    seedStrategy: 'none',
  });
};
