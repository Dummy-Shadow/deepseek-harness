'use strict'

// Windows no-op replacement for the fs-ext native binding. DSH's only
// fs-ext consumer (session-persistence-jsonl/src/lease.ts) calls flock only on
// POSIX; the win32 branch of acquire() uses acquireLockHandleWin32 instead.
// This stub exists so installing on Windows needs no C++ toolchain and the
// top-level `import { flock } from 'fs-ext'` still resolves.

function flock(_fd, _flags, callback) {
  if (typeof callback === 'function') queueMicrotask(() => callback(null))
}

function flockSync() {}

module.exports = { flock, flockSync }
