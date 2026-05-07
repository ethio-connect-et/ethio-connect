import { applyAxiosFixture, resolveServiceTarget } from "@ethio-connect/e2e-support";

module.exports = async function () {
  applyAxiosFixture({
    target: resolveServiceTarget({ defaultPort: 4000 }),
  });
};
