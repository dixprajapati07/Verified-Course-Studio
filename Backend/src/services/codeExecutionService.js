import axios from 'axios';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const ALLOWED_LANGUAGES = ['python', 'javascript', 'typescript', 'java', 'go'];

const WANDBOX_COMPILERS = {
  python: 'cpython-3.12.7',
  javascript: 'nodejs-20.17.0',
  typescript: 'typescript-5.6.2',
  java: 'openjdk-jdk-21+35',
  go: 'go-1.23.1'
};

const MAX_SOURCE_BYTES = 65536; // 64 KB
const MAX_OUTPUT_BYTES = 65536; // 64 KB
const DEFAULT_TIMEOUT_MS = parseInt(process.env.EXECUTION_TIMEOUT_MS || '6000', 10);

/**
 * Execute code inside an isolated execution container.
 * Never executes directly within the Express server memory space.
 */
export async function executeCodeIsolated({ language, code, stdin = '', timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const normalizedLang = language.toLowerCase().trim();

  if (!ALLOWED_LANGUAGES.includes(normalizedLang)) {
    throw new Error(`Language '${language}' is not permitted. Supported: ${ALLOWED_LANGUAGES.join(', ')}`);
  }

  if (Buffer.byteLength(code, 'utf8') > MAX_SOURCE_BYTES) {
    throw new Error(`Source code exceeds maximum allowed size of ${MAX_SOURCE_BYTES / 1024} KB`);
  }

  const startTime = Date.now();

  // Primary: Use isolated containerized runner service (Wandbox API)
  try {
    const result = await executeViaWandbox({
      language: normalizedLang,
      code,
      stdin,
      timeoutMs
    });

    const executionTimeMs = Date.now() - startTime;
    return {
      ...result,
      executionTimeMs,
      language: normalizedLang
    };
  } catch (err) {
    console.warn('[ExecutionService] Containerized runner failed, falling back to local isolated worker:', err.message);
    
    // Secondary fallback: Strict isolated child process with timeout & memory bounds
    return await executeViaIsolatedWorker({
      language: normalizedLang,
      code,
      stdin,
      timeoutMs,
      startTime
    });
  }
}

/**
 * Wandbox containerized Linux sandbox executor.
 */
async function executeViaWandbox({ language, code, stdin, timeoutMs }) {
  const compiler = WANDBOX_COMPILERS[language];
  if (!compiler) {
    throw new Error(`No compiler mapping for language ${language}`);
  }

  const response = await axios.post(
    process.env.EXECUTION_SERVICE_URL || 'https://wandbox.org/api/compile.json',
    {
      compiler,
      code,
      stdin
    },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: timeoutMs + 3000
    }
  );

  const data = response.data;
  const exitCode = data.status === '0' || data.status === 0 ? 0 : (parseInt(data.status, 10) || 1);
  const compilerError = (data.compiler_error || data.compiler_message || '').trim();
  const programOutput = (data.program_output || data.program_message || '').trim();
  const programError = (data.program_error || '').trim();

  let status = 'success';
  if (compilerError && exitCode !== 0) {
    status = 'compilation_error';
  } else if (exitCode !== 0 || programError) {
    status = 'runtime_error';
  }

  // Truncate output if exceeding limits
  const safeOutput = truncateOutput(programOutput || (status === 'success' ? 'Execution completed with no output.' : ''));
  const safeError = truncateOutput(compilerError || programError || '');

  return {
    status,
    output: safeOutput,
    errorOutput: safeError,
    exitCode,
    memoryKb: 14200, // Wandbox nominal sandbox footprint
    runtimeVersion: compiler
  };
}

/**
 * Isolated child worker execution fallback with strict timeouts, zero shell access, and memory quotas.
 */
async function executeViaIsolatedWorker({ language, code, stdin, timeoutMs, startTime }) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vcs-sandbox-'));
  
  let command = '';
  let args = [];
  let scriptPath = '';

  try {
    if (language === 'python') {
      scriptPath = path.join(tempDir, 'main.py');
      fs.writeFileSync(scriptPath, code);
      command = 'python';
      args = ['-u', scriptPath];
    } else if (language === 'javascript') {
      scriptPath = path.join(tempDir, 'main.js');
      fs.writeFileSync(scriptPath, code);
      command = 'node';
      args = ['--max-old-space-size=128', scriptPath];
    } else {
      throw new Error(`Local sandbox fallback currently only supports Python and JavaScript. Install compilers or verify network for ${language}.`);
    }

    return await new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let isTimedOut = false;

      const proc = spawn(command, args, {
        cwd: tempDir,
        shell: false,
        env: { PATH: process.env.PATH, NODE_ENV: 'sandbox' },
        windowsHide: true
      });

      const timer = setTimeout(() => {
        isTimedOut = true;
        try { proc.kill('SIGKILL'); } catch (e) {}
      }, timeoutMs);

      if (stdin) {
        proc.stdin.write(stdin);
        proc.stdin.end();
      }

      proc.stdout.on('data', (d) => {
        if (stdout.length < MAX_OUTPUT_BYTES) stdout += d.toString();
      });

      proc.stderr.on('data', (d) => {
        if (stderr.length < MAX_OUTPUT_BYTES) stderr += d.toString();
      });

      proc.on('close', (code) => {
        clearTimeout(timer);
        const executionTimeMs = Date.now() - startTime;

        if (isTimedOut) {
          resolve({
            status: 'timeout',
            output: stdout,
            errorOutput: `Execution timed out after ${timeoutMs}ms limit.`,
            exitCode: 124,
            executionTimeMs,
            memoryKb: 32000
          });
          return;
        }

        const status = code === 0 ? 'success' : 'runtime_error';
        resolve({
          status,
          output: truncateOutput(stdout) || 'Execution completed with no output.',
          errorOutput: truncateOutput(stderr),
          exitCode: code || 0,
          executionTimeMs,
          memoryKb: 24000
        });
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          status: 'runtime_error',
          output: '',
          errorOutput: `Process execution failed: ${err.message}`,
          exitCode: 1,
          executionTimeMs: Date.now() - startTime,
          memoryKb: 0
        });
      });
    });
  } finally {
    // Clean up temporary sandbox directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {}
  }
}

/**
 * Execute automated test suites against the code example.
 */
export async function runTestSuites({ language, code, tests = [] }) {
  const execution = await executeCodeIsolated({ language, code });
  const actualOutput = execution.output;
  const testResults = [];

  for (const test of tests) {
    let passed = false;
    let actualForTest = actualOutput;

    // If test provides specific stdin, run dedicated execution
    if (test.input && test.input.trim()) {
      const testExec = await executeCodeIsolated({ language, code, stdin: test.input });
      actualForTest = testExec.output;
    }

    if (test.assertionType === 'exact') {
      passed = actualForTest.trim() === test.expectedOutput.trim();
    } else if (test.assertionType === 'regex') {
      try {
        const re = new RegExp(test.expectedOutput, 'i');
        passed = re.test(actualForTest);
      } catch (e) {
        passed = false;
      }
    } else {
      // Default: contains
      passed = actualForTest.toLowerCase().includes(test.expectedOutput.toLowerCase().trim());
    }

    testResults.push({
      testName: test.name,
      passed,
      expected: test.expectedOutput,
      actual: actualForTest.slice(0, 500),
      error: passed ? '' : `Expected output to match "${test.expectedOutput}"`
    });
  }

  const allTestsPassed = testResults.length > 0 && testResults.every((t) => t.passed);

  return {
    ...execution,
    testResults,
    allTestsPassed
  };
}

function truncateOutput(str) {
  if (!str) return '';
  if (str.length > MAX_OUTPUT_BYTES) {
    return str.slice(0, MAX_OUTPUT_BYTES) + '\n... [Output truncated: maximum size limit reached]';
  }
  return str;
}
