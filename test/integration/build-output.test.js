import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { applyTemplate, extractEventData } from '../../src/utils/templateEngine.js';

const root = resolve(import.meta.dirname, '../..');
const TEST_ENV = process.env.TEST_ENV || 'local';
const ALLOWED_ENVS = ['local', 'dev', 'staging', 'prod', 'production'];

console.log(`[integration] TEST_ENV=${TEST_ENV}`);

describe('environment parameterization', () => {
    test('TEST_ENV is a known environment', () => {
        assert.ok(
            ALLOWED_ENVS.includes(TEST_ENV),
            `Unexpected TEST_ENV "${TEST_ENV}", expected one of ${ALLOWED_ENVS.join(', ')}`,
        );
    });
});

describe('build output', () => {
    const actionYml = readFileSync(resolve(root, 'action.yml'), 'utf8');
    const mainEntry = actionYml.match(/main:\s*['"]?([^\s'"]+)/)?.[1];

    test('action.yml declares an entrypoint', () => {
        assert.ok(mainEntry, 'action.yml has no runs.main entry');
    });

    test('the entrypoint exists after the build and is not empty', () => {
        const file = resolve(root, mainEntry);
        assert.ok(existsSync(file), `${mainEntry} is missing (did the build artifact download?)`);
        assert.ok(statSync(file).size > 1000, `${mainEntry} looks empty`);
    });
});

describe('source modules work together', () => {
    test('event extraction feeds the template renderer', () => {
        const event = {
            type: 'IssuesEvent',
            created_at: '2026-10-01T00:00:00Z',
            public: true,
            repo: { name: 'a/b' },
            payload: {
                action: 'opened',
                issue: { number: 7, html_url: 'https://github.com/a/b/issues/7', title: 'Bug' },
            },
        };
        const data = extractEventData(event, { IssuesEvent: '🐛' });
        const line = applyTemplate('{emoji} {action} #{number} in {repo}', data);
        assert.match(line, /^🐛 /);
        assert.match(line, /a\/b$/);
    });
});
