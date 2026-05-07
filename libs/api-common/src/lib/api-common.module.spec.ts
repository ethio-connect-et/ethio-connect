import { Test } from "@nestjs/testing";
import { EthioConnectApiCommonModule } from "./api-common.module";

describe("EthioConnectApiCommonModule", () => {
  it("should compile", async () => {
    const module = await Test.createTestingModule({
      imports: [EthioConnectApiCommonModule],
    }).compile();

    expect(module).toBeDefined();
  });
});
