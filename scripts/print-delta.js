const jsondiff = require("jsondiffpatch");
const { mkdir, writeFile, readFile } = require("fs/promises");
const path = require("path");

const { merge } = require("lodash");

const { getIndexTemplates, installIntegrationAssets } = require("../api");

const METRICBEAT_MAPPINGS_DIR = './metricbeat_mappings_cache';

const PACKAGES = [
  {
    name: "elasticsearch",
    metricbeatName: "es",
    version: "0.3.0",
  },
  {
    name: "kibana",
    metricbeatName: "kibana",
    version: "1.0.4",
  },
  {
    name: "logstash",
    metricbeatName: "logstash",
    version: "1.1.0",
  },
];

const mergeProperties = async (namespace) => {
  const indexTemplates = await getIndexTemplates(namespace);

  const mergedProperties = merge(
    ...indexTemplates.map(({ template }) => template.mappings.properties)
  );
  return mergedProperties;
};

const printDelta = async (packageName, metricbeatName, useLocal) => {
  const [packageProperties, metricbeatProperties] = await Promise.all([
    mergeProperties(`metrics-${packageName}.stack_monitoring.*`),
    useLocal
      ? readFile(`${METRICBEAT_MAPPINGS_DIR}/${packageName}-metricbeat.json`).then(JSON.parse)
      : getIndexTemplates(`.monitoring-${metricbeatName}-mb`).then(
          ([index_template]) => index_template.template.mappings.properties
        ),
  ]);

  const delta = jsondiff.diff(metricbeatProperties, packageProperties);
  jsondiff.console.log(delta);
};

(async () => {
  const opts = process.argv.slice(2);
  const installAssets = !opts.includes("--no-assets");
  const pkgName = opts[opts.findIndex((opt) => opt === "--package") + 1];
  const pkg = PACKAGES.find(({ name }) => name === pkgName);
  const useLocal = opts.includes("--use-local");
  if (!pkg) {
    console.error(`Invalid --package: '${pkg}'`);
    process.exit(1);
  }

  await mkdir(METRICBEAT_MAPPINGS_DIR, { recursive: true });

  if (installAssets) {
    console.log("installing integration package assets");
    await installIntegrationAssets(pkg.name, pkg.version);
    console.log("assets installed");
  }

  await printDelta(pkg.name, pkg.metricbeatName, useLocal);
})();
