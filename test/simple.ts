import tap from 'tap';
import helloWorld from '../src';

tap.ok(helloWorld, 'Should export something');
tap.equal(typeof helloWorld, 'function', 'Should export a function.');
tap.doesNotThrow(() => helloWorld(''), 'Should not throw');
