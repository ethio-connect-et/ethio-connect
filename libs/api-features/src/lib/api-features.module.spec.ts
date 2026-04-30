import { Test } from '@nestjs/testing';
import { EthioConnectApiFeaturesModule } from './api-features.module';

describe('EthioConnectApiFeaturesModule', () => {
  it('should compile', async () => {
    const module = await Test.createTestingModule({
      imports: [EthioConnectApiFeaturesModule],
    }).compile();

    expect(module).toBeDefined();
  });
});
