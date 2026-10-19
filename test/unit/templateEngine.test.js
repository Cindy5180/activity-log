import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
    applyTemplate,
    extractEventData,
    getEventAction,
} from '../../src/utils/templateEngine.js';

const TEST_ENV = process.env.TEST_ENV || 'local';
console.log(`[unit] TEST_ENV=${TEST_ENV}`);

describe('applyTemplate', () => {
    test('replaces all placeholders', () => {
        const out = applyTemplate('{emoji} {verb} [{repo}]({repo_url})', {
            emoji: '🚀',
            verb: 'pushed',
            repo: 'a/b',
            repo_url: 'https://github.com/a/b',
        });
        assert.equal(out, '🚀 pushed [a/b](https://github.com/a/b)');
    });

    test('drops the markdown link when the URL is empty (private repo)', () => {
        const out = applyTemplate('{emoji} {verb} [{repo}]({repo_url})', {
            emoji: '🚀',
            verb: 'pushed',
            repo: 'a/b',
            repo_url: '',
        });
        assert.equal(out, '🚀 pushed a/b');
    });

    test('removes empty optional parentheses', () => {
        const out = applyTemplate('{emoji} {subject} ({ref})', {
            emoji: '🔧',
            subject: 'x',
            ref: '',
        });
        assert.equal(out, '🔧 x');
    });

    test('returns null for a missing or non-string template', () => {
        assert.equal(applyTemplate('', {}), null);
        assert.equal(applyTemplate(undefined, {}), null);
        assert.equal(applyTemplate(42, {}), null);
    });
});

describe('getEventAction', () => {
    test('uses the payload action for issue events', () => {
        assert.equal(getEventAction('IssuesEvent', { action: 'opened' }), 'opened');
    });

    test('maps WatchEvent "started" to "watched"', () => {
        assert.equal(getEventAction('WatchEvent', { action: 'started' }), 'watched');
    });
});

describe('extractEventData', () => {
    test('extracts a public PushEvent', () => {
        const event = {
            type: 'PushEvent',
            created_at: '2026-10-01T00:00:00Z',
            public: true,
            repo: { name: 'a/b' },
            payload: { ref: 'refs/heads/main', commits: [{}] },
        };
        const data = extractEventData(event, { PushEvent: '⬆️' });
        assert.equal(data.emoji, '⬆️');
        assert.equal(data.event_type, 'PushEvent');
        assert.equal(data.repo, 'a/b');
        assert.equal(data.repo_url, 'https://github.com/a/b');
        assert.equal(data.ref, 'main');
    });
});

// Lets the pipeline's failure path be demonstrated without editing code:
// run the workflow manually with "force_fail" ticked.
describe('pipeline failure switch', () => {
    test('FORCE_TEST_FAIL must not be enabled', () => {
        assert.notEqual(
            process.env.FORCE_TEST_FAIL,
            'true',
            'FORCE_TEST_FAIL=true: failing on purpose to demonstrate the test gate',
        );
    });
});
