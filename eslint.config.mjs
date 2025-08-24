import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import nextPlugin from '@next/eslint-plugin-next';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import globals from 'globals';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Define ignore patterns that match your .eslintignore
const IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/.next/**',
  '**/build/**',
  '**/dist/**',
  '**/cdk.out/**',
  '**/*.d.ts',
  '**/jest.config.js',
  '**/*.config.js',
  '**/.eslintrc.js',
  '**/__bak__*/**',
  '**/__bak__*',
  '**/frontend/out/**',

];

const SHARED_RULES = {
  'eol-last': ['error', 'always'],
  'no-console': ['warn', { allow: ['error', 'warn', 'dir', 'time', 'timeEnd'] }],
  'no-unused-vars': 'off',
};

export default [
  // Global ignores - MUST come first
  {
    ignores: IGNORE_PATTERNS
  },

  // Base JavaScript config
  {
    files: ['**/*.js'],
    ignores: IGNORE_PATTERNS,
    ...js.configs.recommended,
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser
      }
    },
    rules: {
      ...SHARED_RULES
    }
  },

  // Infrastructure JavaScript config (for test files)
  {
    files: ['infrastructure/**/*.js'],
    ignores: IGNORE_PATTERNS,
    ...js.configs.recommended,
    languageOptions: {
      globals: {
        ...globals.node,
        jest: true // Add Jest globals
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    },
    plugins: {
      '@typescript-eslint': typescriptEslint
    },
    rules: {
      ...SHARED_RULES,
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'warn'
    }
  },

  // Frontend TypeScript config
  {
    files: ['frontend/**/*.{ts,tsx}'],
    ignores: IGNORE_PATTERNS,
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: path.join(__dirname, 'frontend/tsconfig.json'),
        ecmaVersion: 'latest',
        tsconfigRootDir: path.join(__dirname, 'frontend'),
        sourceType: 'module'
      }
    },
    plugins: {
      '@next/next': nextPlugin,
      '@typescript-eslint': typescriptEslint,
      import: importPlugin
    },
    settings: {
      next: {
        rootDir: path.join(__dirname, 'frontend')
      },
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: path.join(__dirname, 'frontend/tsconfig.json')
        }
      },
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx']
      }
    },
    rules: {
      ...SHARED_RULES,
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      'import/no-unresolved': 'error'
    }
  },

  // Admin server config
  {
    files: ['infrastructure/admin/server.js', 'infrastructure/admin/lib/**/*.js'],
    ignores: IGNORE_PATTERNS,
    ...js.configs.recommended,
    languageOptions: {
      globals: {
        ...globals.node
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    },
    rules: {
      ...SHARED_RULES,
      'no-console': 'off', // Allow console in admin interface
      'no-unused-vars': 'warn'
    }
  },

  // Admin frontend config (browser JavaScript)
  {
    files: ['infrastructure/admin/public/**/*.js'],
    ignores: IGNORE_PATTERNS,
    ...js.configs.recommended,
    languageOptions: {
      globals: {
        ...globals.browser,
        fetch: true
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'script' // Frontend uses script, not module
      }
    },
    rules: {
      'eol-last': ['error', 'always'],
      'no-console': 'off', // Allow console in admin interface
      'no-unused-vars': 'off' // Frontend functions may be called from HTML
    }
  },

  // Infrastructure TypeScript config
  {
    files: ['infrastructure/**/*.ts'],
    ignores: IGNORE_PATTERNS,
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: path.join(__dirname, 'infrastructure/tsconfig.json'),
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    },
    plugins: {
      '@typescript-eslint': typescriptEslint
    },
    rules: {
      ...SHARED_RULES,
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn'
    }
  }
];
