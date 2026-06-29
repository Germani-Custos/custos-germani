import js from '@eslint/js';

const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
  console: 'readonly',
  FileReader: 'readonly',
  FormData: 'readonly',
  Blob: 'readonly',
  URL: 'readonly',
  Headers: 'readonly',
  Request: 'readonly',
  Response: 'readonly',
  fetch: 'readonly',
  localStorage: 'readonly',
  sessionStorage: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  XLSX: 'readonly',
  Chart: 'readonly',
  Swal: 'readonly',
  DOMPurify: 'readonly',
  marked: 'readonly',
  crypto: 'readonly',
  alert: 'readonly'
};

const nodeGlobals = {
  process: 'readonly',
  Buffer: 'readonly',
  URL: 'readonly',
  console: 'readonly',
  fetch: 'readonly',
  module: 'readonly',
  require: 'readonly'
};

const innerHtmlSelector = "AssignmentExpression[left.type='MemberExpression'][left.property.name='innerHTML'][right.type='TemplateLiteral'] TemplateLiteral[expressions.length>0]";

export default [
  { ignores: ['node_modules/**', 'dist/**', 'runtime-config.js'] },
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: browserGlobals
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-unreachable': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: innerHtmlSelector,
          message: 'Evite atribuir innerHTML diretamente; prefira APIs DOM seguras ou sanitização explícita documentada.'
        }
      ]
    }
  },
  {
    files: ['api/**/*.js', 'scripts/**/*.mjs', 'eslint.config.js', 'vitest.config.js'],
    languageOptions: { globals: nodeGlobals }
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: {
        ...nodeGlobals,
        ...browserGlobals,
        global: 'readonly'
      }
    }
  }
];
