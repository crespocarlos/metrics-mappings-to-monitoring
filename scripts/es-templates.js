const assert = require('assert');
const {readdir, readFile} = require('fs/promises');
const path = require('path');

const {createIndexTemplate, deleteDS, deleteTemplate} = require('../api');

const templatesPath = path.join(__dirname, '../templates');

const getLocalTemplates = async () => {
    const filenames = await readdir(templatesPath);
    assert(filenames.length, 'no templates found');
    return Promise.all(
        filenames.map(async filename => {
            return {
                name: path.basename(filename, '.json'),
                template: await readFile(path.join(templatesPath, filename)).then(JSON.parse),
            };
        })
    );
};

module.exports.pushTemplates = async () => {
    const templates = await getLocalTemplates();
    await Promise.all(
        templates.map(async ({name, template}) => {
            await createIndexTemplate(name, template)
            console.log(`created template ${name}`);
        })
    );
};

module.exports.deleteTemplates = async () => {
    const templates = await getLocalTemplates();
    await Promise.all(
        templates.map(async ({name, template}) => {
            await deleteDS(template.index_patterns[0]);
            console.log(`deleted ${template.index_patterns[0]} data streams`);
            await deleteTemplate(name)
                .then(() => console.log(`deleted ${name} template`))
                .catch(err => {
                    if (err.response.status === 404) return;
                    console.error(`error deleting template ${name}: ${err}`, err);
                });
        })
    );
};
