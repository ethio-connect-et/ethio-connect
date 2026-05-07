import { resolveServiceTarget, teardownService } from '@ethio-connect/e2e-support';

module.exports = async function () {
  await teardownService({
    target: resolveServiceTarget({ defaultPort: 4002 }),
  });
};
