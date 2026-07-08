#!/usr/bin/env node

// Truecaller-API — CLI with dual auth paths
// MIT License

import yargs, { type Arguments } from "yargs";
import { hideBin } from "yargs/helpers";
import fs from "fs";
import chalk from "chalk";
import path from "path";
import inquirer from "inquirer";
import { parsePhoneNumber } from "awesome-phonenumber";
import os from "os";
import { login } from "./login.js";
import { verifyOtp } from "./verifyOtp.js";
import { search, bulkSearch } from "./search.js";
import colorizeJson from "json-colorizer";

const homePath = os.homedir();
const authDirPath = path.join(homePath, ".config", "truecaller-api");
const requestFilePath = path.join(authDirPath, "request.json");
const authKeyFilePath = path.join(authDirPath, "authkey.json");

interface VerifyOtpResponse {
  status?: number;
  suspended?: boolean;
  installationId?: string;
  message?: string;
}

function banner(): void {
  console.log(
    chalk.cyan.bold("\n📞 Truecaller-API CLI") +
      chalk.dim(" — Phone lookup via Truecaller\n"),
  );
}

function ensureAuthDir(): void {
  if (!fs.existsSync(authDirPath)) {
    fs.mkdirSync(authDirPath, { recursive: true });
  }
}

function isLoggedIn(): boolean {
  if (!fs.existsSync(authKeyFilePath)) return false;
  try {
    const auth = JSON.parse(fs.readFileSync(authKeyFilePath, "utf8"));
    return !!(auth.installationId && auth.phones?.[0]?.countryCode);
  } catch {
    return false;
  }
}

function getAuth(): { installationId: string; countryCode: string } | null {
  if (!fs.existsSync(authKeyFilePath)) return null;
  try {
    const auth = JSON.parse(fs.readFileSync(authKeyFilePath, "utf8"));
    return {
      installationId: auth.installationId,
      countryCode: auth.phones?.[0]?.countryCode || auth.countryCode || "DZ",
    };
  } catch {
    return null;
  }
}

const runCLI = async () => {
  const args: Arguments = yargs(hideBin(process.argv))
    .usage(
      "\n  truecaller-api login              Login with OTP (needs clientSecret)" +
      "\n  truecaller-api setup              Quick setup with existing installationId" +
      "\n  truecaller-api -s [number]        Search a phone number" +
      "\n  truecaller-api --bs num1,num2     Bulk search\n",
    )
    .option("search", { alias: "s", description: "Search a phone number" })
    .option("raw", { alias: "r", description: "Raw output", type: "boolean" })
    .option("bulksearch", { alias: "bs", description: "Bulk search — comma-separated numbers" })
    .option("name", { alias: "n", description: "Print caller name only", type: "boolean" })
    .option("email", { alias: "e", description: "Print email only", type: "boolean" })
    .option("json", { description: "JSON output", type: "boolean" })
    .option("xml", { description: "XML output", type: "boolean" })
    .option("yaml", { description: "YAML output", type: "boolean" })
    .option("text", { description: "Plain text output", type: "boolean" })
    .option("nc", { alias: "no_color", description: "No color output", type: "boolean" })
    .option("installationid", { alias: "i", description: "Show installationId", type: "boolean" })
    .option("verbose", { alias: "v", description: "Verbose output", type: "count" })
    .help()
    .alias("help", "h")
    .parseSync();

  // ── SETUP (bypass — direct installationId) ──
  if (args._.includes("setup") && !args.s && !args.bs) {
    banner();
    ensureAuthDir();

    console.log(
      chalk.green.bold("⚡ Quick Setup — provide your existing installationId\n"),
    );
    console.log(
      chalk.dim(
        "   This bypasses the OTP login flow entirely.\n" +
        "   If you have a Truecaller account and can extract your installationId,\n" +
        "   you can start searching immediately without needing a clientSecret.\n",
      ),
    );

    const { installationId } = await inquirer.prompt({
      type: "input",
      name: "installationId",
      message: "Paste your installationId:",
      validate: (input: string) => {
        if (input.trim().length < 10) return "InstallationId looks too short.";
        return true;
      },
    });

    const { countryCode } = await inquirer.prompt({
      type: "input",
      name: "countryCode",
      message: "Enter your country code (2-letter ISO, e.g., DZ, IN, US):",
      default: "DZ",
      validate: (input: string) => {
        if (input.length !== 2) return "Must be a 2-letter ISO country code.";
        return true;
      },
    });

    const phoneDisplay = await inquirer.prompt({
      type: "input",
      name: "phone",
      message: "Your phone number (international, for display only):",
      default: "+213792431470",
    });

    const authData = {
      status: 2,
      message: "Verified",
      installationId: installationId.trim(),
      ttl: 259200,
      suspended: false,
      phones: [
        {
          phoneNumber: phoneDisplay.phone.replace("+", ""),
          countryCode: countryCode.toUpperCase(),
          priority: 1,
        },
      ],
      countryCode: countryCode.toUpperCase(),
    };

    fs.writeFileSync(authKeyFilePath, JSON.stringify(authData, null, 2));
    console.log(
      chalk.green.bold("\n✅ Setup complete!") +
        chalk.dim("\n   You can now search numbers: ") +
        chalk.green("truecaller-api -s +213792431470\n"),
    );
    return;
  }

  // ── LOGIN (OTP — needs clientSecret) ──
  if (args._.includes("login") && !args.s && !args.bs && !args.i) {
    banner();
    ensureAuthDir();

    if (!process.env.TRUECALLER_CLIENT_SECRET) {
      console.log(
        chalk.yellow.bold("⚠️  No TRUECALLER_CLIENT_SECRET set."),
      );
      console.log(
        chalk.dim("   The default clientSecret is likely blacklisted.\n"),
      );
      console.log(
        chalk.green.bold("💡 Quick alternative: ") +
          chalk.dim("use ") +
          chalk.green("truecaller-api setup") +
          chalk.dim(" with an existing installationId!\n"),
      );
    }

    console.log(
      chalk.yellow("Enter your mobile number in International Format") +
        chalk.dim("\n   Example: ") +
        chalk.magenta("+213792431470") +
        "\n",
    );

    const inputNumber = await inquirer.prompt({
      type: "input",
      name: "phonenumber",
      message: "Enter your phone number:",
      validate: async (input: string) => {
        const check = parsePhoneNumber(input);
        if (input !== (check?.number?.e164 ?? "")) return "Use international format (e.g., +213...)";
        if (!check?.valid) return "Invalid phone number";
        return true;
      },
    });

    const pn = parsePhoneNumber(inputNumber.phonenumber);
    let response: Record<string, unknown> = {};
    let newReq = true;

    if (fs.existsSync(requestFilePath)) {
      const fileData = JSON.parse(fs.readFileSync(requestFilePath, "utf8"));
      if ("parsedPhoneNumber" in fileData && `+${fileData.parsedPhoneNumber}` === pn?.number?.e164) {
        console.log(chalk.magenta("\nPrevious OTP request found. Reusing...\n"));
        const reuse = await inquirer.prompt({
          type: "confirm",
          name: "status",
          message: "Use existing OTP request?",
        });
        if (reuse.status) {
          newReq = false;
          response = fileData;
        }
      }
    }

    if (newReq) {
      try {
        response = (await login(String(pn?.number?.e164))) as unknown as Record<string, unknown>;
        console.log(chalk.yellow(`📨 Sending OTP to ${chalk.green(pn?.number?.e164 ?? "")}...`));
      } catch (err) {
        const error = err as Error & { response?: { data: { message: string } } };
        console.log(chalk.red(`\n❌ Login failed: ${error.message}`));
        console.log(
          chalk.green.bold("\n💡 Try the quick setup instead: ") +
            chalk.dim("truecaller-api setup\n"),
        );
        process.exit(1);
      }
    }

    if (response?.status === 1 || response?.status === 9 || response?.message === "Sent") {
      fs.writeFileSync(requestFilePath, JSON.stringify(response, null, 2));
      if (newReq) console.log(chalk.green("✅ OTP sent successfully!\n"));

      const token = await inquirer.prompt({
        type: "input",
        name: "otp",
        message: "Enter the 6-digit OTP:",
        validate: (input: string) => /^\d{6}$/.test(input) ? true : "Must be 6 digits.",
      });

      const result = (await verifyOtp(String(pn?.number?.e164), response, token.otp)) as VerifyOtpResponse;

      if (result.status === 2 && !result.suspended) {
        console.log(
          chalk.green.bold("\n✅ Logged in!") +
            "\n" + chalk.blue.bold("   Installation ID: ") +
            chalk.green(result.installationId),
        );
        fs.writeFileSync(authKeyFilePath, JSON.stringify(result, null, 2));
        fs.unlinkSync(requestFilePath);
      } else if (result.status === 11) {
        console.log(chalk.red("\n❌ Invalid OTP."));
      } else if (result.status === 7) {
        console.log(chalk.red("\n❌ OTP retry limit exceeded."));
      } else if (result.suspended) {
        console.log(chalk.red("\n❌ Account suspended."));
      } else {
        console.log(chalk.red(`\n❌ ${result.message || "Unknown error"}`));
      }
    } else if (response?.status === 6 || response?.status === 5) {
      if (fs.existsSync(requestFilePath)) fs.unlinkSync(requestFilePath);
      console.log(chalk.red("\n❌ Verification limit exceeded. Try again later."));
    } else {
      console.log(chalk.red(`\n❌ ${response?.message || "Unknown response"}`));
    }
    return;
  }

  // ── SEARCH ──
  if (args.s && !args.bs && !args._.includes("login") && !args.i) {
    if (!isLoggedIn()) {
      console.error(
        chalk.red.bold("❌ Not authenticated. Run ") +
          chalk.green("truecaller-api setup") +
          chalk.red.bold(" first."),
      );
      process.exit(1);
    }

    const auth = getAuth()!;
    try {
      const result = await search({
        number: String(args.s),
        countryCode: auth.countryCode,
        installationId: auth.installationId,
      });

      if (args.json) {
        console.log(args.nc ? JSON.stringify(result.json(), null, 2) : colorizeJson(JSON.stringify(result.json()), {
          pretty: true,
          colors: { STRING_KEY: "blue", STRING_LITERAL: "green", NUMBER_LITERAL: "magenta" },
        }));
      } else if (args.xml) {
        console.log(result.xml());
      } else if (args.yaml) {
        console.log(result.yaml(!args.nc));
      } else if (args.n) {
        console.log(args.r ? result.getName() : chalk.blue("Name") + " : " + chalk.green(result.getName()));
      } else if (args.e) {
        console.log(args.r ? result.getEmailId() : chalk.blue("Email") + " : " + chalk.green(result.getEmailId()));
      } else {
        console.log(result.text(!args.nc, true));
      }
    } catch (err) {
      console.error(chalk.red((err as Error).message));
      process.exit(1);
    }
    return;
  }

  // ── BULK SEARCH ──
  if (args.bs && !args._.includes("login") && !args.i) {
    if (!isLoggedIn()) {
      console.error(chalk.red.bold("❌ Not authenticated. Run truecaller-api setup first."));
      process.exit(1);
    }

    const auth = getAuth()!;
    try {
      const result = await bulkSearch(String(args.bs), auth.countryCode, auth.installationId);
      console.log(args.nc ? JSON.stringify(result, null, 2) : colorizeJson(JSON.stringify(result), {
        pretty: true,
        colors: { STRING_KEY: "blue", STRING_LITERAL: "green", NUMBER_LITERAL: "magenta" },
      }));
    } catch (err) {
      console.error(chalk.red((err as Error).message));
      process.exit(1);
    }
    return;
  }

  // ── SHOW INSTALLATION ID ──
  if (args.i && !args.s) {
    if (!isLoggedIn()) {
      console.error(chalk.red.bold("❌ Not authenticated. Run truecaller-api setup first."));
      process.exit(1);
    }
    const auth = getAuth()!;
    console.log(args.r ? auth.installationId : chalk.blue.bold("Installation ID") + " : " + chalk.green(auth.installationId));
    return;
  }

  // ── HELP ──
  banner();
  console.log(`Usage:
  ${chalk.green("truecaller-api setup")}                    ⚡ Quick setup with existing installationId
  ${chalk.green("truecaller-api login")}                    Login via OTP (needs TRUECALLER_CLIENT_SECRET)
  ${chalk.green("truecaller-api -s [number]")}              Search a phone number
  ${chalk.green("truecaller-api --bs num1,num2")}           Bulk search
  ${chalk.green("truecaller-api -i")}                       Show your installationId

Search options:
  -s, --search         Phone number to search
  --bs, --bulksearch   Comma-separated numbers for bulk search
  -n, --name           Print caller name only
  -e, --email          Print email only
  --json               Output as formatted JSON
  --xml                Output as XML
  --yaml               Output as YAML
  --text               Output as plain text
  -r, --raw            Raw output (no formatting/colors)
  --nc, --no_color     Disable colored output
  -i, --installationid Show your installationId

Repository: ${chalk.cyan("https://github.com/marwangpt237/Truecaller-api")}
`);
};

runCLI();
