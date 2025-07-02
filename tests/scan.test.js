beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

jest.mock('../lib/utils', () => {
  const actualUtils = jest.requireActual('../lib/utils');
  return {
    ...actualUtils,
    detectWorkspaces: jest.fn(),
    readPackageJson: jest.fn(),
    scanNodeModules: jest.fn(),
    resolveVersionRange: jest.fn(),
  };
});

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  access: jest.fn(),
  mkdir: jest.fn(),
  constants: { W_OK: 2 },
}));

const path = require('path');
const fs = require('fs/promises');
const { constants } = require('fs');

const {
  readPackageJson,
  scanNodeModules,
  resolveVersionRange,
  detectWorkspaces
} = require('../lib/utils');

const { detectPeerDependencyIssues } = require('../lib/scan');

const CACHE_FILE_PATH = path.join('test', 'project', '.peer-dep-helper-cache.json');
const CWD = 'test/project';

beforeEach(() => {
  jest.clearAllMocks();

  fs.readFile.mockResolvedValue(JSON.stringify([{ name: 'react', version: '17.0.0' }]));
  fs.writeFile.mockResolvedValue(undefined);
  fs.access.mockResolvedValue(undefined);
  fs.mkdir.mockResolvedValue(undefined);

  detectWorkspaces.mockResolvedValue([]);
});

describe('detectPeerDependencyIssues - Caching', () => {
  test('should read from cache if cache is valid and not in fix mode', async () => {
    jest.resetModules();
    process.env.NODE_ENV = 'production';
    delete process.env.PEER_DEP_HELPER_TEST;
    delete process.env.PEER_DEP_HELPER_TEST_MOCK_LATEST;

    const crypto = require('crypto');
    const pkgContent = '{"name":"test","version":"1.0.0"}';
    const hash = crypto.createHash('md5').update(pkgContent).digest('hex');
    const fileHashes = {
      'package.json': hash,
      'package-lock.json': hash,
      'yarn.lock': hash,
      'pnpm-lock.yaml': hash,
    };

    const fsPromises = require('fs/promises');
    fsPromises.readFile = jest.fn((filePath, encoding) => {
      if (filePath && filePath.includes('.peer-dep-helper-cache.json')) {
        return Promise.resolve(JSON.stringify({
          issues: [{ package: 'react', requiredBy: 'some-lib', requiredVersion: '^17.0.0', installedVersion: null, status: 'missing' }],
          timestamp: Date.now(),
          fileHashes,
        }));
      }
      return Promise.resolve(pkgContent);
    });
    const utils = require('../lib/utils');
    utils.readPackageJson = jest.fn().mockResolvedValue({ name: 'test', version: '1.0.0' });
    utils.detectWorkspaces = jest.fn().mockResolvedValue([]);

    const { detectPeerDependencyIssues } = require('../lib/scan');

    const config = { cwd: CWD, fix: false };
    const issues = await detectPeerDependencyIssues(CWD, config);
    expect(issues).toEqual([
      { package: 'react', requiredBy: 'some-lib', requiredVersion: '^17.0.0', installedVersion: null, status: 'missing' }
    ]);
  });

  test('should not read from cache if cache is expired', async () => {
    jest.resetModules();
    const oldEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    // Set up mocks after resetModules
    const fsPromises = require('fs/promises');
    fsPromises.readFile = jest.fn((filePath, encoding) => {
      if (filePath && filePath.includes('.peer-dep-helper-cache.json')) {
        return Promise.resolve(JSON.stringify({
          issues: [{ package: 'react', requiredBy: 'some-lib', requiredVersion: '^17.0.0', installedVersion: null, status: 'missing' }],
          timestamp: Date.now(),
          fileHashes: {},
        }));
      }
      return Promise.resolve('{"name":"test","version":"1.0.0"}');
    });
    const utils = require('../lib/utils');
    utils.readPackageJson = jest.fn()
      .mockResolvedValueOnce({ name: 'root-pkg', version: '1.0.0' })
      .mockResolvedValueOnce({ name: 'some-lib', version: '1.0.0', peerDependencies: { react: '^17.0.0' } });
    utils.detectWorkspaces = jest.fn().mockResolvedValue([]);
    const { detectPeerDependencyIssues } = require('../lib/scan');

    try {
      const config = { cwd: CWD, fix: false };
      const issues = await detectPeerDependencyIssues(CWD, config);
      expect(utils.readPackageJson).toHaveBeenCalledTimes(2);
      expect(issues).not.toEqual([
        { package: 'react', requiredBy: 'some-lib', requiredVersion: '^17.0.0', installedVersion: null, status: 'missing' }
      ]);
    } finally {
      process.env.NODE_ENV = oldEnv;
    }
  });

  test('should write to cache after successful scan', async () => {
    fs.readFile.mockResolvedValueOnce('{}');
    readPackageJson
      .mockResolvedValueOnce({ name: 'root-pkg', version: '1.0.0' })
      .mockResolvedValueOnce({ name: 'some-lib', version: '1.0.0', peerDependencies: { react: '^17.0.0' } });
    scanNodeModules.mockResolvedValueOnce({ 'some-lib': '1.0.0' });
    resolveVersionRange.mockReturnValueOnce('^17.0.0');
    fs.access.mockResolvedValueOnce();
    fs.writeFile.mockResolvedValueOnce();

    const config = { cwd: CWD, fix: false };
    await detectPeerDependencyIssues(CWD, config);

    expect(fs.writeFile.mock.calls.some(call => call[0] === CACHE_FILE_PATH && call[2] === 'utf-8')).toBe(true);
  });

  test('should not write to cache if write fails', async () => {
    fs.readFile.mockResolvedValueOnce('{}');
    readPackageJson
      .mockResolvedValueOnce({ name: 'root-pkg', version: '1.0.0' })
      .mockResolvedValueOnce({ name: 'some-lib', version: '1.0.0', peerDependencies: { react: '^17.0.0' } });
    scanNodeModules.mockResolvedValueOnce({ 'some-lib': '1.0.0' });
    resolveVersionRange.mockReturnValueOnce('^17.0.0');
    fs.access.mockResolvedValueOnce();
    fs.writeFile.mockRejectedValue(new Error('Write error'));

    const config = { cwd: CWD, fix: false };
    await expect(detectPeerDependencyIssues(CWD, config)).rejects.toThrow('Write error');
    expect(fs.writeFile).toHaveBeenCalled();
  });

  test('should handle directory existence and permission checks', async () => {
    readPackageJson
      .mockResolvedValueOnce({ name: 'root-pkg', version: '1.0.0' })
      .mockResolvedValueOnce({ name: 'some-lib', version: '1.0.0', peerDependencies: { react: '^17.0.0' } });
    scanNodeModules.mockResolvedValueOnce({ 'some-lib': '1.0.0' });
    resolveVersionRange.mockReturnValueOnce('^17.0.0');
    fs.access.mockResolvedValueOnce();
    fs.writeFile.mockResolvedValueOnce();

    const config = { cwd: CWD, fix: false };
    await detectPeerDependencyIssues(CWD, config);

    expect(fs.access).toHaveBeenCalledWith(path.dirname(CACHE_FILE_PATH), require('fs').constants.W_OK);
    expect(fs.writeFile).toHaveBeenCalled();
  });

  test('should proceed without cache if cache file path is invalid (ENOENT)', async () => {
    fs.readFile.mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    readPackageJson.mockResolvedValueOnce({ name: 'test', version: '1.0.0' });

    const config = { cwd: CWD, fix: false };
    await expect(detectPeerDependencyIssues(CWD, config)).resolves.toBeDefined();
  });

  test('should throw if permission is denied (EACCES)', async () => {
    jest.resetModules();
    const oldEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    require('fs/promises').readFile = jest.fn((filePath) => {
      if (filePath && filePath.includes('.peer-dep-helper-cache.json')) {
        const err = new Error('EACCES');
        err.code = 'EACCES';
        return Promise.reject(err);
      }
      return Promise.resolve('{"name":"test","version":"1.0.0"}');
    });
    try {
      const { detectPeerDependencyIssues } = require('../lib/scan');
      readPackageJson.mockResolvedValueOnce({ name: 'test', version: '1.0.0' });
      const config = { cwd: CWD, fix: false };
      await expect(detectPeerDependencyIssues(CWD, config)).rejects.toThrow('EACCES');
    } finally {
      process.env.NODE_ENV = oldEnv;
    }
  });

  test('should handle invalid JSON in cache', async () => {
    jest.resetModules();
    const oldEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    require('fs/promises').readFile = jest.fn((filePath) => {
      if (filePath && filePath.includes('.peer-dep-helper-cache.json')) {
        return Promise.resolve('{ not json');
      }
      return Promise.resolve('{"name":"test","version":"1.0.0"}');
    });
    try {
      const { detectPeerDependencyIssues } = require('../lib/scan');
      readPackageJson.mockResolvedValueOnce({ name: 'test', version: '1.0.0' });
      const config = { cwd: CWD, fix: false };
      await expect(detectPeerDependencyIssues(CWD, config)).rejects.toThrow();
    } finally {
      process.env.NODE_ENV = oldEnv;
    }
  });
});