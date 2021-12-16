const {mkdir, writeFile} = require('fs/promises');
const path = require('path');

const {merge, omit, pick} = require('lodash');

const {getIndexTemplates, installIntegrationAssets} = require('../api');

const metricbeatTemplate = require('../metricbeat-template.json');
const templatesDir = path.join(__dirname, '../templates');
const indexPattern = product => `.monitoring-${product}-8-*`;

const buildTemplate = async (namespace, product, overrides = {}) => {
    const { data: { index_templates } } = await getIndexTemplates(namespace);

    const mergedProperties = merge(
        ...index_templates.map(({ index_template }) => index_template.template.mappings.properties),
        overrides,
    );

    const indexTemplate = {
        index_patterns: [indexPattern(product)],
        template: {
            mappings: {
                properties: omit(mergedProperties, ['data_stream']),
            },
            settings: {
                'index.mapping.total_fields.limit': 2000, // this could be computed
            },
        },
        data_stream: {},
    };

    return indexTemplate;
};

/**
 * creates an index template for each SM supported product out of their respective integration package's assets.
 * each override is a missing definition that should should be ported to the integration packages
 */
(async () => {
    console.log('installing integration package assets');
    await Promise.all([
        installIntegrationAssets('elasticsearch', '0.2.0'),
        installIntegrationAssets('kibana', '1.0.2'),
        installIntegrationAssets('logstash', '1.0.2'),
    ]).then(() => console.log('assets installed'));

    const commonProperties = pick(
        metricbeatTemplate.mappings.properties,
        ['@timestamp', 'timestamp', 'host', 'metricset', 'service', 'event']
    );

    const beatsProperties = pick(
        metricbeatTemplate.mappings.properties,
        ['beat', 'beats_state', 'beats_stats']
    );

    const beatsTemplate = {
        index_patterns: [indexPattern('beats')],
        template: {
            mappings: {
                properties: merge({}, commonProperties, beatsProperties, {
                    // missing properties
                    elasticsearch: {
                        properties: {
                            cluster: {
                                properties: {
                                    id: {
                                        ignore_above: 1024,
                                        type: "keyword"
                                    }
                                }
                            }
                        }
                    },
                    cluster_uuid: {
                        type: 'alias',
                        path: 'elasticsearch.cluster.id',
                    },
                    beats_stats: {
                        properties: {
                            timestamp: {
                                type: 'alias',
                                path: '@timestamp',
                            },
                        },
                    },
                }),
            },
        },
        data_stream: {},
    }

    const templates = await Promise.all([
        beatsTemplate,

        buildTemplate('metrics-elasticsearch.*', 'es', {
            ...commonProperties,
            index_stats: metricbeatTemplate.mappings.properties.index_stats,
        }),

        buildTemplate('metrics-kibana.*', 'kibana', {
            ...commonProperties,
            cluster_uuid: {
                type: 'alias',
                path: 'elasticsearch.cluster.id',
            },
            kibana_stats: {
                properties: {
                    timestamp: {
                        type: 'alias',
                        path: '@timestamp',
                    },
                    kibana: {
                        properties: {
                            uuid: {
                                type: 'alias',
                                path: 'service.id',
                            },
                            status: {
                                type: 'alias',
                                path: 'kibana.stats.status',
                            },
                        },
                    },
                },
            },
        }),

        buildTemplate('metrics-logstash.*', 'logstash', {
            ...commonProperties,
            logstash: {
                properties: {
                    cluster: {
                        properties: {
                            id: {
                                type: 'keyword',
                                ignore_above: 1024,
                            },
                        },
                    },
                    node: {
                        properties: {
                            stats: {
                                properties: {
                                    pipelines: {
                                        properties: {
                                            id: {
                                                type: 'keyword',
                                                ignore_above: 1024,
                                            },
                                            hash: {
                                                type: 'keyword',
                                                ignore_above: 1024,
                                            },
                                            queue: {
                                                properties: {
                                                    type: {
                                                        type: 'keyword',
                                                        ignore_above: 1024,
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            logstash_stats: {
                properties: {
                    timestamp: {
                        type: 'alias',
                        path: '@timestamp',
                    },
                    pipelines: {
                        type: 'nested',
                    },
                },
            },
            cluster_uuid: {
                type: 'alias',
                path: 'logstash.cluster.id', // should this be elasticsearch.cluster.id ?
            },
        }),
    ]);

    await mkdir(templatesDir, {recursive: true});

    await Promise.all(
        templates.map(template => {
            const name = template.index_patterns[0].slice(1, -2);
            const filepath = path.join(templatesDir, name + '.json');

            return writeFile(filepath, JSON.stringify(template, null, 2));
        })
    ).then(() => console.log(`templates created at ${templatesDir}`));
})();

