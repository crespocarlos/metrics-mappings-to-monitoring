const axios = require('axios');

const kibanaBasepath = '/pat';
const auth = {username: 'elastic', password: 'changeme'};

module.exports.installIntegrationAssets = (name, version) =>
    axios.post(
        `http://localhost:5602${kibanaBasepath}/api/fleet/epm/packages/${name}/${version}`,
        {force: true},
        {auth, headers: {'kbn-xsrf': '1'}},
    );

module.exports.getIndexTemplates = (namespace) => 
    axios.get(`http://localhost:9200/_index_template/${namespace}`, {auth});

module.exports.createIndexTemplate = (name, payload) =>
    axios.put(`http://localhost:9200/_index_template/${name}`, payload, {auth});

module.exports.deleteDS = (pattern) =>
    axios.delete(`http://localhost:9200/_data_stream/${pattern}`, {auth});

module.exports.deleteTemplate = (name) =>
    axios.delete(`http://localhost:9200/_index_template/${name}`, {auth});
