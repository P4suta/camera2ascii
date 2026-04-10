/** @type {import('@stryker-mutator/core').PartialStrykerOptions} */
export default {
  mutate: ["src/converter.ts", "src/renderer.ts", "src/dom.ts", "src/assert.ts"],
  testRunner: "command",
  commandRunner: {
    command: 'C:\\Users\\livec\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Oven-sh.Bun_Microsoft.Winget.Source_8wekyb3d8bbwe\\bun-windows-x64\\bun.exe test'
  },
  reporters: ["clear-text", "html"],
  htmlReporter: { baseDir: "reports/mutation" },
  timeoutMS: 30000,
  concurrency: 1,
};
