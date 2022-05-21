#!/usr/bin/env node
/* eslint-disable no-console, no-await-in-loop */
import minimist from 'minimist';
import fetch from 'isomorphic-fetch';

const argv = minimist(process.argv.slice(2), {
  stopEarly: true,
  string: ['app', 'key', 'branch'],
});

function cleanUrl(u: string) {
  const match = u.match(/^https:\/\/appcenter.ms\/orgs\/(.*)/);
  if (!match) {
    throw new Error('Invalid URL');
  }
  const [org, , app] = match[1].split('/');
  return `https://appcenter.ms/api/v0.1/apps/${org}/${app}`;
}

const apiKey = argv.key || process.env.APPCENTER_API_KEY;
const appUrl = cleanUrl(argv.app || process.env.APPCENTER_APP_URL);
const branch = argv.branch || 'develop';

const [command] = argv._;

const headers = {
  'X-API-Token': apiKey,
  'Content-Type': 'application/json',
};

async function cancel(buildNumber: number) {
  await fetch(`${appUrl}/builds/${buildNumber}`, {
    headers,
    body: JSON.stringify({ status: 'cancelling' }),
    method: 'PATCH',
  }).catch((error) => console.error('Cancel failed', error));
}

async function latestBuild() {
  const data = await fetch(`${appUrl}/branches/${branch}/builds`, {
    headers,
    method: 'GET',
  }).then((response) => response.json());
  if (!Array.isArray(data)) {
    throw new Error(`Unable to get latest build: \n${JSON.stringify(data, null, 2)}`);
  }
  return data[0];
}

async function build(sourceVersion: string): Promise<number | undefined> {
  const data = await fetch(`${appUrl}/branches/${branch}/builds`, {
    headers,
    body: JSON.stringify({ sourceVersion }),
    method: 'POST',
  })
    .then((response) => {
      if (response.status === 401) {
        throw new Error('Auth header has expired. Get new ones');
      }
      return response.json();
    })
    .catch((error) => {
      console.error('Build failed', error);
      return {};
    });
  return data.buildNumber;
}

async function delay(ms: number) {
  return new Promise((accept) => { setTimeout(accept, ms); });
}

async function cancelBuilds(min: number, max: number) {
  let current = min;
  const startBuild = current;
  const start = Date.now();

  while (current < max) {
    await cancel(current);
    current += 1;
    const elapsed = Date.now() - start;
    const total = ((Number(max) - startBuild) * elapsed) / (current - startBuild);
    console.log(`Build ${current}/${max} consumed. Expected completion ${new Date(start + total)}`);
  }
}

async function seekToBuild(target: number) {
  const latest = await latestBuild();
  const startBuild = Number(latest.buildNumber);
  let current = startBuild;
  const { sourceVersion } = latest;

  const start = Date.now();
  while (current < target) {
    const next = await build(sourceVersion);
    if (next) {
      // Don't wait on the cancel, keep on going.
      delay(1000).then(() => cancel(next)).catch((error) => console.error('Cancel failed', error));

      current = next;

      const elapsed = Date.now() - start;
      const total = ((target - startBuild) * elapsed) / (current - startBuild);
      console.log(
        `Build ${next}/${target} consumed. Expected completion ${new Date(
          start + total,
        )}`,
      );
    } else {
      console.log('Build API call failed');
      await delay(1000);
    }
  }
}

async function run() {
  if (command === 'cancel') {
    const [, min, max] = argv._;
    await cancelBuilds(Number(min), Number(max));
  } else if (command === 'build') {
    const [, target] = argv._;
    await seekToBuild(Number(target));
  }
}

run().then(() => process.exit(0)).catch((error) => {
  console.error(error);
  process.exit(1);
});
