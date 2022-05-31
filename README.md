appcenter-build-bot
===============

![main CI](https://github.com/gas-buddy/appcenter-build-bot/actions/workflows/nodejs.yml/badge.svg)

[![npm version](https://badge.fury.io/js/@gasbuddy%appcenter-build-bot.svg)](https://badge.fury.io/js/@gasbuddy%2Fappcenter-build-bot)

A robot to manipulate appcenter builds (mostly to seek to a specific build number and to cancel ranges)

## How to use

```
> docker run --rm -it node /bin/bash
(now inside container)
> cd /tmp 
> npm i -D appcenter-build-bot
> npx appcenter-build-bot --app https://appcenter.ms/orgs/XXXXXXX/apps/APP.Android/ --key mykey --branch dev build 1337
```
