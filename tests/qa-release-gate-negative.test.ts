import test from 'node:test';
import assert from 'node:assert/strict';
// Deliberate, temporary negative acceptance fixture. This PR must never merge.
test('release gate rejects a failing check',()=>{assert.fail('Intentional acceptance failure: deployment must remain blocked.');});
