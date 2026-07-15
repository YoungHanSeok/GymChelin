// 실행 위치에 맞는 환경 변수 파일을 먼저 불러온다.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnvFile } from 'node:process';

const apiEnvPath = join(__dirname, '..', '.env');

if (existsSync(apiEnvPath)) {
  loadEnvFile(apiEnvPath);
}
