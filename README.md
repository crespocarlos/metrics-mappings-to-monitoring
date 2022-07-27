Helpers to work with metricbeat 8 standalone templates.
The scripts expect a running elasticsearch (:9200) and kibana (:5601). the kibana basepath can be changed in ./api.js to target your local instance

`npm run generate-templates`
Generates a template for each SM product and writes them to the ./templates directory.
This won't work with kibana 8.0 out of the box. 8.0 queries https://epr.elastic.co/search?package={package}&experimental=true&kibana.version=8.0.0
which seems broken ? To make this work either generate templates against `main` branch or update kibana to query https://epr-snapshot.elastic.co/search?package={package}&experimental=true

`npm run push-templates`
Creates the local templates in elasticsearch

`npm run delete-templates`
Deletes the templates and associated datastreams in elasticsearch

`npm run output-templates`
Note: works against an elastic-package stack

Outputs the elasticsearch, kibana and logstash mapping properties under the ./properties directory. It creates two files per product, one contains the metricbeat properties and the other the package properties built by merging the individual datastreams. Once the output is generated, run the following to get the diff:
`npx jsondiffpatch ./properties/{product}-metricbeat.json ./properties/{product}-package.json`
