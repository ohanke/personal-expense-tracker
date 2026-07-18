const js = require('@eslint/js');

module.exports = [
  {
    ignores: ['node_modules/', 'coverage/', 'dist/', '.next/'],
  },
  {
    files: ['src/**/*.js', '__tests__/**/*.js'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
      },
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['__tests__/**/*.js'],
    languageOptions: {
      globals: {
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
      },
    },
  },
];
