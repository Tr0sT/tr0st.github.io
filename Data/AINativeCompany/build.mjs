import { readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));
const sourceRoot = resolve(projectRoot, "src");
const entryFile = resolve(sourceRoot, "page.html");
const outputFile = resolve(projectRoot, "index.html");
const includePattern = /<!--\s*@include\s+"([^"]+)"\s*-->/g;
const args = new Set(process.argv.slice(2));
const supportedArgs = new Set(["--check"]);

for (const arg of args) {
  if (!supportedArgs.has(arg)) {
    throw new Error(`Unknown argument: ${arg}`);
  }
}

function assertInsideSource(file) {
  const pathFromSource = relative(sourceRoot, file);
  if (pathFromSource === "" || (!pathFromSource.startsWith(`..${sep}`) && !isAbsolute(pathFromSource))) {
    return;
  }

  throw new Error(`Include escapes src/: ${file}`);
}

async function render(file, stack = []) {
  const absoluteFile = resolve(file);
  assertInsideSource(absoluteFile);

  if (stack.includes(absoluteFile)) {
    const cycle = [...stack, absoluteFile]
      .map((item) => relative(sourceRoot, item))
      .join(" -> ");
    throw new Error(`Circular include: ${cycle}`);
  }

  let source = await readFile(absoluteFile, "utf8");
  const matches = [...source.matchAll(includePattern)];

  for (const match of matches.reverse()) {
    const includeFile = resolve(dirname(absoluteFile), match[1]);
    const fragment = await render(includeFile, [...stack, absoluteFile]);
    source =
      source.slice(0, match.index) +
      fragment +
      source.slice(match.index + match[0].length);
  }

  return source;
}

const output = await render(entryFile);

if (includePattern.test(output)) {
  throw new Error("The generated page still contains unresolved includes");
}

if (args.has("--check")) {
  const current = await readFile(outputFile, "utf8");
  if (current !== output) {
    console.error("index.html is stale. Run: node build.mjs");
    process.exitCode = 1;
  } else {
    console.log("index.html is up to date");
  }
} else {
  const temporaryFile = resolve(projectRoot, `.index.html.tmp-${process.pid}`);

  try {
    await writeFile(temporaryFile, output);
    await rename(temporaryFile, outputFile);
  } finally {
    await rm(temporaryFile, { force: true });
  }

  console.log(`Built ${relative(projectRoot, outputFile)} from ${relative(projectRoot, entryFile)}`);
}
