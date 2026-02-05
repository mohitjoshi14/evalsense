#!/usr/bin/env node

/**
 * EvalSense CLI
 */

import { Command } from "commander";
import { discoverFromPath, filterFiles } from "./discovery.js";
import { executeEvalFiles, getExitCode } from "./executor.js";
import { ConsoleReporter } from "../report/console-reporter.js";
import { JsonReporter } from "../report/json-reporter.js";
import { ExitCodes } from "../core/types.js";

const program = new Command();

program
  .name("evalsense")
  .description("JS-native LLM evaluation framework with Jest-like API")
  .version("0.1.0");

program
  .command("run")
  .description("Run evaluation tests")
  .argument("[path]", "Path to eval file or directory", ".")
  .option("-f, --filter <pattern>", "Filter tests by name pattern")
  .option("-o, --output <file>", "Write JSON report to file")
  .option("-r, --reporter <type>", "Reporter type: console, json, both", "console")
  .option("-b, --bail", "Stop on first failure")
  .option("-t, --timeout <ms>", "Test timeout in milliseconds", "30000")
  .action(async (path: string, options: {
    filter?: string;
    output?: string;
    reporter: string;
    bail?: boolean;
    timeout: string;
  }) => {
    try {
      // Discover eval files
      const files = await discoverFromPath(path);
      const filtered = filterFiles(files, options.filter);

      if (filtered.length === 0) {
        console.error("No eval files found");
        process.exit(ExitCodes.CONFIGURATION_ERROR);
      }

      const consoleReporter = new ConsoleReporter();

      // Print header
      consoleReporter.printHeader(filtered.length);

      // Execute tests
      const report = await executeEvalFiles(filtered, {
        bail: options.bail,
        timeout: parseInt(options.timeout, 10),
        filter: options.filter,
      });

      // Output results
      const reporterType = options.reporter.toLowerCase();

      if (reporterType === "console" || reporterType === "both") {
        consoleReporter.printReport(report);
      }

      if (reporterType === "json" || reporterType === "both" || options.output) {
        const jsonReporter = new JsonReporter();
        const json = jsonReporter.format(report);

        if (options.output) {
          await jsonReporter.writeToFile(report, options.output);
          console.log(`\nReport written to: ${options.output}`);
        } else if (reporterType === "json") {
          console.log(json);
        }
      }

      // Exit with appropriate code
      const exitCode = getExitCode(report);
      process.exit(exitCode);
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : String(error));
      process.exit(ExitCodes.EXECUTION_ERROR);
    }
  });

program
  .command("list")
  .description("List discovered eval files")
  .argument("[path]", "Path to search", ".")
  .action(async (path: string) => {
    try {
      const files = await discoverFromPath(path);

      if (files.length === 0) {
        console.log("No eval files found");
        return;
      }

      console.log(`Found ${files.length} eval file(s):\n`);
      for (const file of files) {
        console.log(`  ${file}`);
      }
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : String(error));
      process.exit(ExitCodes.CONFIGURATION_ERROR);
    }
  });

program.parse();
