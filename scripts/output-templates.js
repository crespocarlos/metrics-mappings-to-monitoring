const { mkdir, writeFile } = require("fs/promises");
const path = require("path");

const { merge } = require("lodash");

const { getIndexTemplates, installIntegrationAssets } = require("../api");

const propertiesDir = path.join(__dirname, "../properties");

const mergeProperties = async (namespace) => {
  const indexTemplates = await getIndexTemplates(namespace);

  const mergedProperties = merge(
    ...indexTemplates.map(({ template }) => template.mappings.properties)
  );
  return mergedProperties;
};

const outputTemplates = async (packageName, mbName) => {
  const [packageProperties, [index_template]] = await Promise.all([
    mergeProperties(`metrics-${packageName}.*`),
    getIndexTemplates(`.monitoring-${mbName}-mb`),
  ]);

  const mbProperties = index_template.template.mappings.properties;
  await Promise.all([
    writeFile(
      path.join(propertiesDir, `${packageName}-package.json`),
      JSON.stringify(packageProperties, null, 2)
    ),
    writeFile(
      path.join(propertiesDir, `${packageName}-metricbeat.json`),
      JSON.stringify(mbProperties, null, 2)
    ),
  ]);
};

(async () => {
  await mkdir("./properties", { recursive: true });

  console.log("installing integration package assets");
  await Promise.all([
    installIntegrationAssets("elasticsearch", "0.3.0"),
    installIntegrationAssets("kibana", "1.0.4"),
    installIntegrationAssets("logstash", "1.1.0"),
  ]);
  console.log("assets installed");

  await Promise.all([
    outputTemplates("elasticsearch", "es"),
    outputTemplates("kibana", "kibana"),
    outputTemplates("logstash", "logstash"),
  ]);
  console.log("done");
})();
