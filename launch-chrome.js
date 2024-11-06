import { spawn } from 'child_process';
import path from 'path';

const CHROME_EXECUTABLE = '/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome'; // Update this path
const EXTENSION_PATH = path.resolve('./extension');
const USER_DATA_DIR = path.resolve('./.chrome-user-data'); // Separate user data dir for development
const REMOTE_DEBUGGING_PORT = 9222;

const chromeArgs = [
  `--load-extension=${EXTENSION_PATH}`,
  `--remote-debugging-port=${REMOTE_DEBUGGING_PORT}`,
  `--user-data-dir=${USER_DATA_DIR}`,
  '--disable-extensions-except',
  '--disable-component-extensions-with-background-pages',
];

const chromeProcess = spawn(CHROME_EXECUTABLE, chromeArgs, {
  detached: false,
  stdio: 'inherit',
});

chromeProcess.on('close', (code) => {
  console.log(`Chrome exited with code ${code}`);
});