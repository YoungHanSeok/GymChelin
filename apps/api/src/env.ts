import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnvFile } from 'node:process';

const apiEnvPath = join(__dirname, '..', '.env');

if (existsSync(apiEnvPath)) {
  loadEnvFile(apiEnvPath);
}
