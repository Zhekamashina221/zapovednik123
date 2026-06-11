/**
 * Проверяет, что better-sqlite3 собран под текущую Node.
 * При несовпадении ABI запускает npm rebuild better-sqlite3.
 */
const path = require('path')
const { execSync } = require('child_process')

const backendRoot = path.join(__dirname, '..')

function tryLoad() {
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const Database = require('better-sqlite3')
  const db = new Database(':memory:')
  db.close()
}

function rebuild() {
  console.log(`[ensure-sqlite-native] Пересборка better-sqlite3 для Node ${process.version}...`)
  execSync('npm rebuild better-sqlite3', {
    cwd: backendRoot,
    stdio: 'inherit',
    env: process.env,
  })
}

function main() {
  try {
    tryLoad()
    return
  } catch (err) {
    const msg = String(err?.message || err)
    const mismatch =
      err?.code === 'ERR_DLOPEN_FAILED' || msg.includes('NODE_MODULE_VERSION')
    if (!mismatch) {
      console.error('[ensure-sqlite-native] Неожиданная ошибка:', err)
      process.exit(1)
    }
  }

  try {
    rebuild()
    tryLoad()
    console.log('[ensure-sqlite-native] OK')
  } catch (err) {
    console.error('\n[ensure-sqlite-native] Не удалось загрузить better-sqlite3 после rebuild.')
    console.error('Node:', process.version)
    console.error('\nПопробуйте вручную:')
    console.error('  cd backend')
    console.error('  Remove-Item -Recurse -Force node_modules\\better-sqlite3')
    console.error('  npm install')
    console.error('\nИли используйте Node 22 LTS (файл .nvmrc): nvm use 22')
    console.error(err?.message || err)
    process.exit(1)
  }
}

main()
