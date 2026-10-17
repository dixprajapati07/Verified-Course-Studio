import fs from "fs/promises";
import path from "path";
import os from "os";
import { spawn, execSync } from "child_process";

/**
 * Extracts class name from Java code.
 * Prefers "public class <Name>", otherwise first "class <Name>".
 */
export function extractClassName(code) {
  if (typeof code !== "string") return "Main";
  const publicClassMatch = code.match(/public\s+(?:final\s+)?class\s+([A-Za-z0-9_$]+)/);
  if (publicClassMatch) {
    return publicClassMatch[1];
  }
  const classMatch = code.match(/class\s+([A-Za-z0-9_$]+)/);
  if (classMatch) {
    return classMatch[1];
  }
  return "Main";
}

/**
 * Checks if code contains a main method.
 */
export function hasMainMethod(code) {
  return /public\s+static\s+void\s+main\s*\(\s*String\s*(\[\s*\]|\.\.\.)\s*\w+\s*\)/.test(code);
}

/**
 * Forcefully terminates a child process and its process tree.
 */
function killProcess(child) {
  if (!child || !child.pid) return;
  if (process.platform === "win32") {
    try {
      execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: "ignore" });
    } catch {
      try {
        child.kill("SIGKILL");
      } catch {
        // ignore
      }
    }
  } else {
    try {
      child.kill("SIGKILL");
    } catch {
      // ignore
    }
  }
}

/**
 * Executes a child process with a specified timeout, capturing stdout & stderr.
 */
function execProcess(cmd, args, options = {}) {
  const { cwd, timeout = 10000, input } = options;

  return new Promise((resolve) => {
    const startTime = Date.now();
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let timer = null;

    const child = spawn(cmd, args, {
      cwd,
      shell: false,
      windowsHide: true
    });

    if (input) {
      child.stdin.write(input);
      child.stdin.end();
    }

    child.stdout.on("data", (data) => {
      stdout += data.toString("utf-8");
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString("utf-8");
    });

    timer = setTimeout(() => {
      timedOut = true;
      killProcess(child);
    }, timeout);

    child.on("error", (err) => {
      clearTimeout(timer);
      const duration = Date.now() - startTime;
      resolve({
        exitCode: -1,
        stdout,
        stderr: stderr || err.message,
        duration,
        timedOut: false,
        spawnError: err
      });
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      const duration = Date.now() - startTime;
      resolve({
        exitCode: timedOut ? -1 : (code ?? 0),
        stdout,
        stderr: timedOut ? `Execution timed out after ${timeout}ms` : stderr,
        duration,
        timedOut
      });
    });
  });
}

/**
 * Normalizes files input into an array of { name: string, content: string }
 */
function normalizeFiles(files) {
  if (typeof files === "string") {
    const className = extractClassName(files);
    return [{ name: `${className}.java`, content: files, isMain: true }];
  }

  if (Array.isArray(files)) {
    return files.map((f, i) => {
      const name = f.name || `${extractClassName(f.content || "") || `File${i}`}.java`;
      return {
        name,
        content: f.content || "",
        isMain: f.isMain ?? hasMainMethod(f.content || "")
      };
    });
  }

  if (files && typeof files === "object") {
    return Object.entries(files).map(([name, content]) => ({
      name: name.endsWith(".java") ? name : `${name}.java`,
      content: typeof content === "string" ? content : String(content),
      isMain: hasMainMethod(String(content))
    }));
  }

  throw new Error("Invalid files parameter passed to runJava");
}

/**
 * Compiles and runs Java code pinned to Java 21 semantics.
 * 
 * @param {string | object | Array} files 
 * @param {object} options 
 * @returns {Promise<{
 *   compiled: boolean,
 *   timedOut: boolean,
 *   exitCode: number,
 *   stdout: string,
 *   stderr: string,
 *   executionDurationMs: number,
 *   command: string
 * }>}
 */
export async function runJava(files, options = {}) {
  const timeoutMs = options.timeoutMs || 10000;
  const mode = options.mode || process.env.VERIFY_MODE || "local";
  const dockerImage = options.dockerImage || process.env.VERIFY_DOCKER_IMAGE || "openjdk:21-slim";

  const fileList = normalizeFiles(files);
  if (fileList.length === 0) {
    return {
      compiled: false,
      timedOut: false,
      exitCode: 1,
      stdout: "",
      stderr: "No Java files provided",
      executionDurationMs: 0,
      command: "javac"
    };
  }

  // Determine main class
  let mainClass = options.mainClass;
  if (!mainClass) {
    const mainFile = fileList.find((f) => f.isMain) || fileList[0];
    mainClass = path.basename(mainFile.name, ".java");
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "vcs-java-"));

  try {
    // Write source files to tempDir
    for (const f of fileList) {
      const filePath = path.join(tempDir, f.name);
      await fs.writeFile(filePath, f.content, "utf-8");
    }

    if (mode === "docker") {
      // Execute in Docker container
      const dockerArgs = [
        "run",
        "--rm",
        "--network", "none",
        "-v", `${tempDir}:/app`,
        "-w", "/app",
        dockerImage,
        "sh", "-c",
        `javac --release 21 *.java && java ${mainClass}`
      ];

      const commandStr = `docker run --rm -v ... ${dockerImage} javac --release 21 *.java && java ${mainClass}`;
      const res = await execProcess("docker", dockerArgs, { timeout: timeoutMs });

      return {
        compiled: !res.stderr?.includes("error:") && res.exitCode === 0,
        timedOut: res.timedOut,
        exitCode: res.exitCode,
        stdout: res.stdout.trim(),
        stderr: res.stderr.trim(),
        executionDurationMs: res.duration,
        command: commandStr
      };
    }

    // Local mode: javac with --release 21
    const javaFileNames = fileList.map((f) => f.name);
    const compileArgs = ["--release", "21", "-encoding", "UTF-8", ...javaFileNames];
    const compileCommand = `javac --release 21 ${javaFileNames.join(" ")}`;

    const compileRes = await execProcess("javac", compileArgs, {
      cwd: tempDir,
      timeout: timeoutMs
    });

    if (compileRes.exitCode !== 0 || compileRes.timedOut) {
      return {
        compiled: false,
        timedOut: compileRes.timedOut,
        exitCode: compileRes.exitCode,
        stdout: compileRes.stdout.trim(),
        stderr: compileRes.stderr.trim() || (compileRes.timedOut ? "Compilation timed out" : "Compilation failed"),
        executionDurationMs: compileRes.duration,
        command: compileCommand
      };
    }

    // Compilation succeeded. Now run java
    const runArgs = ["-Dfile.encoding=UTF-8", mainClass];
    const fullCommand = `${compileCommand} && java ${mainClass}`;

    const remainingTimeout = Math.max(1000, timeoutMs - compileRes.duration);
    const runRes = await execProcess("java", runArgs, {
      cwd: tempDir,
      timeout: remainingTimeout,
      input: options.input
    });

    return {
      compiled: true,
      timedOut: runRes.timedOut,
      exitCode: runRes.exitCode,
      stdout: runRes.stdout.trim(),
      stderr: runRes.stderr.trim(),
      executionDurationMs: compileRes.duration + runRes.duration,
      command: fullCommand
    };
  } finally {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // temp cleanup ignore
    }
  }
}
