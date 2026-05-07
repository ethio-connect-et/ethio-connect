import nx from "@nx/eslint-plugin";

export default [
  ...nx.configs["flat/base"],
  ...nx.configs["flat/typescript"],
  ...nx.configs["flat/javascript"],
  {
    ignores: ["**/dist", "**/out-tsc", "**/lint-fixtures/**", "**/.next/types/**/*.d.ts"],
  },
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    rules: {
      "@nx/enforce-module-boundaries": [
        "error",
        {
          enforceBuildableLibDependency: true,
          allow: [
            "^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$",
            // Shared contracts are intentionally consumed cross-domain for API compatibility.
            "^@ethio-connect-et/ethioconnect(/.*)?$",
            // Shared primitives/ui kit are vetted cross-domain presentation building blocks.
            "^@ethio-connect/ui-components(/.*)?$",
          ],
          depConstraints: [
            // scope:* constraints
            { sourceTag: "scope:central-hub", onlyDependOnLibsWithTags: ["scope:central-hub", "scope:shared"] },
            { sourceTag: "scope:customer-portal", onlyDependOnLibsWithTags: ["scope:customer-portal", "scope:shared"] },
            { sourceTag: "scope:vendor-portal", onlyDependOnLibsWithTags: ["scope:vendor-portal", "scope:shared"] },
            { sourceTag: "scope:shared", onlyDependOnLibsWithTags: ["scope:shared"] },

            // domain:* constraints
            { sourceTag: "domain:central-hub", onlyDependOnLibsWithTags: ["domain:central-hub", "domain:shared"] },
            { sourceTag: "domain:customer-portal", onlyDependOnLibsWithTags: ["domain:customer-portal", "domain:shared"] },
            { sourceTag: "domain:vendor-portal", onlyDependOnLibsWithTags: ["domain:vendor-portal", "domain:shared"] },
            { sourceTag: "domain:shared", onlyDependOnLibsWithTags: ["domain:shared"] },

            // platform:* constraints
            { sourceTag: "platform:web", onlyDependOnLibsWithTags: ["platform:web", "platform:cross"] },
            { sourceTag: "platform:web", notDependOnLibsWithTags: ["platform:api", "platform:e2e"] },
            { sourceTag: "platform:api", onlyDependOnLibsWithTags: ["platform:api", "platform:cross"] },
            { sourceTag: "platform:api", notDependOnLibsWithTags: ["platform:web", "platform:e2e"] },
            { sourceTag: "platform:cross", onlyDependOnLibsWithTags: ["platform:cross"] },
            { sourceTag: "platform:e2e", onlyDependOnLibsWithTags: ["platform:web", "platform:api", "platform:e2e", "platform:cross"] },

            // type:* directional architecture rules
            { sourceTag: "type:app", onlyDependOnLibsWithTags: ["type:feature", "type:data-access", "type:util", "type:ui", "type:contracts"] },
            { sourceTag: "type:dashboard", onlyDependOnLibsWithTags: ["type:feature", "type:data-access", "type:util", "type:ui", "type:contracts"] },
            { sourceTag: "type:feature", onlyDependOnLibsWithTags: ["type:data-access", "type:util", "type:ui", "type:contracts"] },
            { sourceTag: "type:data-access", onlyDependOnLibsWithTags: ["type:util", "type:contracts"] },
            { sourceTag: "type:ui", onlyDependOnLibsWithTags: ["type:util", "type:contracts", "type:ui"] },
            { sourceTag: "type:util", onlyDependOnLibsWithTags: ["type:util", "type:contracts"] },
            { sourceTag: "type:contracts", onlyDependOnLibsWithTags: ["type:contracts", "type:util"] },

            // Ensure e2e projects stay scoped to their own product slice.
            { allSourceTags: ["platform:e2e", "scope:central-hub"], onlyDependOnLibsWithTags: ["scope:central-hub", "scope:shared"] },
            { allSourceTags: ["platform:e2e", "scope:customer-portal"], onlyDependOnLibsWithTags: ["scope:customer-portal", "scope:shared"] },
            { allSourceTags: ["platform:e2e", "scope:vendor-portal"], onlyDependOnLibsWithTags: ["scope:vendor-portal", "scope:shared"] },
          ],
        },
      ],
    },
  },
];
