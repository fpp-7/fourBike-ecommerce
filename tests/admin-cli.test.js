import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAuth } from '../server/auth.mjs';

const script = fileURLToPath(new URL('../scripts/admin-user.mjs',import.meta.url));
test('account CLI creates a single hashed account, refuses accidental replacement and resets access',async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(),'fourbike-admin-cli-'));
  const oldPassword = 'Fixture-previous-password-2026!';
  const newPassword = 'Fixture-replacement-password-2026!';
  function run(password,extra = []) {
    return spawnSync(process.execPath,[script,'--username','fixture-admin','--password-stdin',...extra],{
      env:{...process.env,FOURBIKE_DATA_DIR:dataDir},input:password+'\n',encoding:'utf8',timeout:10000,windowsHide:true,
    });
  }
  try {
    const invalid = run('short');
    assert.equal(invalid.status,1);
    await assert.rejects(access(path.join(dataDir,'admin-user.json')));
    const first = run(oldPassword);
    assert.equal(first.status,0,first.stderr);
    const serialized = await readFile(path.join(dataDir,'admin-user.json'),'utf8');
    assert.ok(!serialized.includes(oldPassword));
    const credentials = JSON.parse(serialized);
    assert.equal(credentials.passwordHash.length,128);
    assert.equal(credentials.salt.length,64);
    assert.equal(run(newPassword).status,1);
    assert.equal(await readFile(path.join(dataDir,'admin-user.json'),'utf8'),serialized);
    const auth = await createAuth({dataDir});
    const session = await auth.login({username:'fixture-admin',password:oldPassword});
    assert.ok(auth.getSession(session.id));
    const reset = run(newPassword,['--reset']);
    assert.equal(reset.status,0,reset.stderr);
    assert.equal(auth.getSession(session.id),null);
    await assert.rejects(auth.login({username:'fixture-admin',password:oldPassword}));
    assert.ok((await auth.login({username:'fixture-admin',password:newPassword})).id);
  } finally {
    assert.equal(path.dirname(path.resolve(dataDir)),path.resolve(tmpdir()));
    assert.ok(path.basename(dataDir).startsWith('fourbike-admin-cli-'));
    await rm(dataDir,{recursive:true,force:true});
  }
});
