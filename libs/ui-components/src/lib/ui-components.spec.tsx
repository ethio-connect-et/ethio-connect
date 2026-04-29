import { render } from '@testing-library/react';

import EthioConnectUiComponents from './ui-components';

describe('EthioConnectUiComponents', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<EthioConnectUiComponents />);
    expect(baseElement).toBeTruthy();
  });
});
