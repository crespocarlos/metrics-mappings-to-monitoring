Helpers to work with metricbeat 8 standalone templates.
The scripts expect a running elasticsearch (:9200) and kibana (:5601). the kibana basepath can be changed in ./api.js to target your local instance

`npm run generate-templates`
Generates a template for each SM product and writes them to the ./templates directory.

`npm run push-templates`
Creates the local templates in elasticsearch

`npm run delete-templates`
Deletes the templates and associated datastreams in elasticsearch
