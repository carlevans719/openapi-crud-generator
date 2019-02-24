# openapi-crud-generator

Only supported flag currently is `--print-template` which will print the built-in template to the console and exit.

### files

- `cli.js` is the main CLI entrypoint
- `lib/makeCrud.js` is responsible for collecting data from the user
- `lib/buildTemplate.js` is responsible for augmenting the built-in template with data collected from the user
