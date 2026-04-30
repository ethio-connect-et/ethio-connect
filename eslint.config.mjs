import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: ['**/dist', '**/out-tsc', '**/lint-fixtures/**'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            {
              sourceTag: 'platform:e2e',
              onlyDependOnLibsWithTags: ['type:app', 'scope:shared'],
            },
            {
              sourceTag: 'platform:web',
              notDependOnLibsWithTags: ['platform:api'],
            },
            {
              sourceTag: 'domain:central-hub',
              onlyDependOnLibsWithTags: ['domain:central-hub', 'domain:shared'],
            },
            {
              sourceTag: 'domain:customer-portal',
              onlyDependOnLibsWithTags: [
                'domain:customer-portal',
                'domain:shared',
              ],
            },
            {
              sourceTag: 'domain:vendor-portal',
              onlyDependOnLibsWithTags: [
                'domain:vendor-portal',
                'domain:shared',
              ],
            },
            {
              sourceTag: 'scope:central-hub',
              onlyDependOnLibsWithTags: ['scope:central-hub', 'scope:shared'],
            },
            {
              sourceTag: 'scope:customer-portal',
              onlyDependOnLibsWithTags: [
                'scope:customer-portal',
                'scope:shared',
              ],
            },
            {
              sourceTag: 'scope:vendor-portal',
              onlyDependOnLibsWithTags: ['scope:vendor-portal', 'scope:shared'],
            },
            {
              sourceTag: 'type:dashboard',
              onlyDependOnLibsWithTags: [
                'type:feature',
                'type:ui',
                'type:util',
              ],
            },
            {
              sourceTag: 'type:api',
              onlyDependOnLibsWithTags: [
                'type:feature',
                'type:data-access',
                'type:util',
              ],
            },
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*'],
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    // Override or add rules here
    rules: {},
  },
];
