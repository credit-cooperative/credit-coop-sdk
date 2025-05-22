import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execa } from "execa";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

describe("published tarball works in a fresh project", () => {
  it("installs & runs", async () => {
    /* 1. Build & pack the SDK */
    await execa("yarn", ["build"], { cwd: ROOT });
    const { stdout: tgzName } = await execa("npm", ["pack", "--silent"], {
      cwd: ROOT,
    });
    const tgzPath = join(ROOT, tgzName);

    /* 2. Create a temp consumer project */
    const tmp = mkdtempSync(join(tmpdir(), "sdk-smoke-"));
    writeFileSync(
      join(tmp, "package.json"),
      JSON.stringify(
        {
          name: "consumer",
          private: true,
          dependencies: {
            "@credit-cooperative/credit-coop-sdk": tgzPath,
          },
        },
        null,
        2,
      ),
    );

    /* 3. Install the sdk via tarball */
    await execa(
      "npm",
      [
        "install",
        "--silent",
        "--no-audit",
        "--no-fund",
        "--omit=dev",
        "--package-lock=false",
      ],
      { cwd: tmp },
    );

    /* 4. Run a one-liner that imports the SDK */
    const { stdout } = await execa(
      "node",
      [
        "-e",
        "const { SecuredLine } = require('@credit-cooperative/credit-coop-sdk'); console.log(typeof SecuredLine);",
      ],
      { cwd: tmp },
    );
    expect(stdout).toBe("function"); // class is exported
  }, 60_000); // one minute timeout
});
