import nx from "@nx/eslint-plugin";

export default [
  ...nx.configs["flat/base"],
  ...nx.configs["flat/typescript"],
  ...nx.configs["flat/javascript"],
  {
    ignores: ["**/dist", "**/out-tsc", "**/lint-fixtures/**"],
  },
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    rules: {
      "@nx/enforce-module-boundaries": [
        "error",
        {
          enforceBuildableLibDependency: true,
          allow: ["^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$"],
          depConstraints: [
            {
              sourceTag: "platform:web",
              notDependOnLibsWithTags: ["platform:api"],
            },
            {
              sourceTag: "domain:central-hub",
              onlyDependOnLibsWithTags: ["domain:central-hub", "scope:shared"],
            },
            {
              sourceTag: "domain:customer-portal",
              onlyDependOnLibsWithTags: ["domain:customer-portal", "scope:shared"],
            },
            {
              sourceTag: "domain:vendor-portal",
              onlyDependOnLibsWithTags: ["domain:vendor-portal", "scope:shared"],
            },
            {
              sourceTag: "domain:shared",
              onlyDependOnLibsWithTags: ["domain:shared", "scope:shared"],
            },
            {
              sourceTag: "scope:central-hub",
              onlyDependOnLibsWithTags: ["scope:central-hub", "scope:shared"],
            },
            {
              sourceTag: "scope:customer-portal",
              onlyDependOnLibsWithTags: ["scope:customer-portal", "scope:shared"],
            },
            {
              sourceTag: "scope:vendor-portal",
              onlyDependOnLibsWithTags: ["scope:vendor-portal", "scope:shared"],
            },
            {
              sourceTag: "scope:shared",
              onlyDependOnLibsWithTags: ["scope:shared"],
            },
            {
              sourceTag: "platform:api",
              onlyDependOnLibsWithTags: ["platform:api", "platform:cross", "scope:shared"],
            },
            {
              sourceTag: "platform:web",
              onlyDependOnLibsWithTags: ["platform:web", "platform:cross", "scope:shared"],
            },
            {
              sourceTag: "platform:cross",
              onlyDependOnLibsWithTags: ["platform:cross", "scope:shared"],
            },
            {
              allSourceTags: ["platform:e2e", "scope:central-hub"],
              onlyDependOnLibsWithTags: ["scope:central-hub", "type:app", "type:api"],
            },
            {
              allSourceTags: ["platform:e2e", "scope:customer-portal"],
              onlyDependOnLibsWithTags: ["scope:customer-portal", "type:app", "type:api"],
            },
            {
              allSourceTags: ["platform:e2e", "scope:vendor-portal"],
              onlyDependOnLibsWithTags: ["scope:vendor-portal", "type:app", "type:api"],
            },
            {
              sourceTag: "type:app",
              onlyDependOnLibsWithTags: ["type:feature", "type:ui", "type:util", "type:data-access", "scope:shared"],
            },
            {
              sourceTag: "type:dashboard",
              onlyDependOnLibsWithTags: ["type:feature", "type:ui", "type:util", "scope:shared"],
            },
            {
              sourceTag: "type:feature",
              onlyDependOnLibsWithTags: ["type:feature", "type:ui", "type:util", "type:data-access", "scope:shared"],
            },
            {
              sourceTag: "type:api",
              onlyDependOnLibsWithTags: ["type:feature", "type:data-access", "type:util", "scope:shared"],
            },
            {
              sourceTag: "type:ui",
              onlyDependOnLibsWithTags: ["type:ui", "type:util", "scope:shared"],
            },
            {
              sourceTag: "type:util",
              onlyDependOnLibsWithTags: ["type:util", "scope:shared"],
            },
            {
              sourceTag: "*",
              onlyDependOnLibsWithTags: ["*"],
            },
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.cts", "**/*.mts", "**/*.js", "**/*.jsx", "**/*.cjs", "**/*.mjs"],
    // Override or add rules here
    rules: {},
  },
];
