import { render } from "@testing-library/react";

import EthioConnectFrontendFeatures from "./frontend-features";

describe("EthioConnectFrontendFeatures", () => {
  it("should render successfully", () => {
    const { baseElement } = render(<EthioConnectFrontendFeatures />);
    expect(baseElement).toBeTruthy();
  });
});
