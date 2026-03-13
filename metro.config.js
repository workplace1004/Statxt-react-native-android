const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Ensure resolution from project root so 'react' and other deps resolve from this node_modules
config.resolver.nodeModulesPaths = [path.resolve(__dirname, "node_modules")];

// Resolve math-intrinsics subpaths (e.g. math-intrinsics/abs) - Metro may not follow package "exports" for these
const projectRoot = __dirname;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith("math-intrinsics/")) {
    const subpath = moduleName.replace("math-intrinsics/", "");
    const resolved = path.resolve(projectRoot, "node_modules", "math-intrinsics", `${subpath}.js`);
    return context.resolveRequest(context, resolved, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
