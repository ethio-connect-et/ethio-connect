import axios, { type AxiosRequestConfig } from 'axios';
import { killPort, waitForPortOpen } from '@nx/node/utils';

export type SeedStrategy = 'none' | 'required' | 'optional';

export interface ServiceTarget {
  host: string;
  port: number;
  baseUrl: string;
}

export interface ResolveTargetOptions {
  defaultPort: number;
  hostEnvVar?: string;
  portEnvVar?: string;
  protocol?: 'http' | 'https';
}

export interface BootstrapOptions {
  target: ServiceTarget;
  startupRetryAttempts?: number;
  startupRetryDelayMs?: number;
  seedStrategy?: SeedStrategy;
  seed?: (ctx: { target: ServiceTarget }) => Promise<void>;
}

export interface TeardownOptions {
  target: ServiceTarget;
  skipKillPort?: boolean;
}

export interface AuthFixture {
  apply: (config: AxiosRequestConfig) => AxiosRequestConfig;
}

export interface AxiosFixtureOptions {
  target: ServiceTarget;
  auth?: AuthFixture;
  validateStatus?: AxiosRequestConfig['validateStatus'];
}

const DEFAULT_TEARDOWN_MESSAGE = '\nTearing down...\n';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function resolveServiceTarget(options: ResolveTargetOptions): ServiceTarget {
  const host = process.env[options.hostEnvVar ?? 'HOST'] ?? 'localhost';
  const portValue = process.env[options.portEnvVar ?? 'PORT'];
  const port = portValue ? Number(portValue) : options.defaultPort;
  const protocol = options.protocol ?? 'http';

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid port: ${portValue}`);
  }

  return { host, port, baseUrl: `${protocol}://${host}:${port}` };
}

export async function bootstrapService(options: BootstrapOptions): Promise<void> {
  const {
    target,
    startupRetryAttempts = 2,
    startupRetryDelayMs = 250,
    seedStrategy = 'none',
    seed,
  } = options;

  console.log('\nSetting up...\n');

  let startupError: unknown;
  for (let attempt = 1; attempt <= startupRetryAttempts; attempt += 1) {
    try {
      await waitForPortOpen(target.port, { host: target.host });
      startupError = undefined;
      break;
    } catch (error) {
      startupError = error;
      if (attempt < startupRetryAttempts) {
        await sleep(startupRetryDelayMs * attempt);
      }
    }
  }

  if (startupError) {
    throw startupError;
  }

  if (seedStrategy === 'required' && !seed) {
    throw new Error('seedStrategy is required but no seed function was provided.');
  }

  if (seed && seedStrategy !== 'none') {
    await seed({ target });
  }

  globalThis.__TEARDOWN_MESSAGE__ = DEFAULT_TEARDOWN_MESSAGE;
}

export function applyAxiosFixture(options: AxiosFixtureOptions): void {
  const { target, auth, validateStatus } = options;
  axios.defaults.baseURL = target.baseUrl;

  if (auth) {
    axios.interceptors.request.use((config) => auth.apply(config));
  }

  if (validateStatus) {
    axios.defaults.validateStatus = validateStatus;
  }
}

export function bearerAuth(token: string): AuthFixture {
  return {
    apply(config) {
      const headers = config.headers ?? {};
      return {
        ...config,
        headers: {
          ...headers,
          Authorization: `Bearer ${token}`,
        },
      };
    },
  };
}

export async function teardownService(options: TeardownOptions): Promise<void> {
  if (!options.skipKillPort) {
    await killPort(options.target.port);
  }

  console.log(globalThis.__TEARDOWN_MESSAGE__ ?? DEFAULT_TEARDOWN_MESSAGE);
}
