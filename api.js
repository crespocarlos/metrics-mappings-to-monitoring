process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

const axios = require("axios");
const { merge } = require("lodash");

const kibanaBasepath = "";
const auth = { username: "elastic", password: "changeme" };

module.exports.installIntegrationAssets = (name, version) =>
  axios.post(
    `https://localhost:5601${kibanaBasepath}/api/fleet/epm/packages/${name}/${version}`,
    { force: true },
    { auth, headers: { "kbn-xsrf": "1" } }
  );

module.exports.createIndexTemplate = (name, payload) =>
  axios.put(`https://localhost:9200/_index_template/${name}`, payload, { auth });

module.exports.deleteDS = (pattern) =>
  axios.delete(`https://localhost:9200/_data_stream/${pattern}`, { auth });

module.exports.deleteTemplate = (name) =>
  axios.delete(`https://localhost:9200/_index_template/${name}`, { auth });

const getComponentTemplate = (name) =>
  axios.get(`https://localhost:9200/_component_template/${name}`, { auth });

module.exports.getIndexTemplates = async (templateName) => {
  const { data } = await axios.get(
    `https://localhost:9200/_index_template/${templateName}`,
    { auth }
  );
  const { index_templates: indexTemplates } = data;

  const results = [];
  for (let i = 0; i < indexTemplates.length; i++) {
    const {
      index_template: {
        template,
        composed_of: composedOf = [],
        ...indexTemplate
      },
    } = indexTemplates[i];

    const components = await Promise.all(
      composedOf.map(async (component) => {
        const { data } = await getComponentTemplate(component);
        const { component_templates: componentTemplates } = data;
        return componentTemplates[0].component_template.template;
      })
    );

    results.push({
      ...indexTemplate,
      name: templateName,
      template: merge(template, ...components),
    });
  }

  return results;
};
