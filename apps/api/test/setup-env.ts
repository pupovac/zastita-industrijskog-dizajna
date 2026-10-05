import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Tests always run against a dedicated SQLite file and a throwaway upload directory.
process.env.DATABASE_URL = 'file:./test.db';
process.env.UPLOAD_DIR = join(tmpdir(), `zid-test-uploads-${process.pid}`);
